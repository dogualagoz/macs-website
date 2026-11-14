import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import type postgres from "postgres";
import { createDb } from "./client";
import type { Sql } from "./client";

export const ALEMBIC_HEAD = "e2b8c1f7a934";
const BASELINE = "0000_baseline.sql";

async function checkSchema(connection: postgres.ReservedSql): Promise<void> {
  const [tables] = await connection<{ users: string | null; alembic: string | null; ledger: string | null }[]>`
    SELECT to_regclass('public.users') AS users, to_regclass('public.alembic_version') AS alembic,
           to_regclass('public.__bun_migrations') AS ledger`;
  if (!tables) throw new Error("Cannot inspect schema state");
  const completed = tables.ledger !== null && (await connection`SELECT 1 FROM public.__bun_migrations WHERE name = ${BASELINE}`).length === 1;
  if (tables.alembic !== null) {
    const versions = await connection<{ version_num: string }[]>`SELECT version_num FROM public.alembic_version ORDER BY version_num`;
    if (versions.length === 0 && completed) return;
    if (versions.length !== 1 || versions[0]?.version_num !== ALEMBIC_HEAD) {
      throw new Error(`alembic_version ${versions.map((row) => row.version_num).join(",") || "empty"} != ${ALEMBIC_HEAD}`);
    }
  } else if (tables.users !== null && !completed) {
    throw new Error("unknown schema state: users exists without Alembic HEAD or a completed baseline");
  }
}

export async function runMigrations(sql: Sql, dir: string): Promise<{ applied: string[]; skipped: string[] }> {
  const connection = await sql.reserve();
  let locked = false;
  let previousMessages: string | undefined;
  try {
    await connection`SELECT pg_advisory_lock(727274)`;
    locked = true;
    const [settings] = await connection<{ client_min_messages: string }[]>`SHOW client_min_messages`;
    previousMessages = settings?.client_min_messages;
    // Idempotent DDL emits expected notices; keep migration CLI output actionable.
    await connection`SET client_min_messages TO warning`;
    await checkSchema(connection);
    await connection`CREATE TABLE IF NOT EXISTS public.__bun_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
    const recorded = await connection<{ name: string }[]>`SELECT name FROM public.__bun_migrations`;
    const existing = new Set(recorded.map((row) => row.name));
    const applied: string[] = [];
    const skipped: string[] = [];
    const files = (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort();
    for (const name of files) {
      if (existing.has(name)) { skipped.push(name); continue; }
      const source = await readFile(resolve(dir, name), "utf8");
      const outsideTransaction = source.split(/\r?\n/, 1)[0] === "-- no-transaction";
      if (outsideTransaction) {
        for (const statement of source.split(/;\r?\n/).filter((part) => part.trim())) await connection.unsafe(statement);
        await connection`INSERT INTO public.__bun_migrations (name) VALUES (${name})`;
      } else {
        // ReservedSql does not expose begin(); explicit transaction commands keep
        // both the DDL and its ledger insert on the session holding the lock.
        await connection`BEGIN`;
        try {
          await connection.unsafe(source);
          await connection`INSERT INTO public.__bun_migrations (name) VALUES (${name})`;
          await connection`COMMIT`;
        } catch (error) {
          await connection`ROLLBACK`;
          throw error;
        }
      }
      applied.push(name);
    }
    return { applied, skipped };
  } finally {
    try {
      if (locked) {
        try {
          if (previousMessages !== undefined) await connection`SELECT set_config('client_min_messages', ${previousMessages}, false)`;
        }
        finally { await connection`SELECT pg_advisory_unlock(727274)`; }
      }
    } finally { connection.release(); }
  }
}

if (import.meta.main) {
  let sql: Sql | undefined;
  try {
    if (process.env.RUN_MIGRATIONS?.toLowerCase() === "false") {
      console.log("skipped");
    } else {
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error("DATABASE_URL is required");
      sql = createDb(url).sql;
      for (let attempt = 0; attempt < 60; attempt++) {
        try { await sql`SELECT 1`; break; }
        catch (error) { if (attempt === 59) throw error; await delay(2000); }
      }
      console.log(JSON.stringify(await runMigrations(sql, resolve(import.meta.dirname, "../../drizzle"))));
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally { await sql?.end({ timeout: 5 }); }
}
