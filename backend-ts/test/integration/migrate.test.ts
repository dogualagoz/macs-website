import { afterEach, beforeEach, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import postgres from "postgres";
import { createDb } from "../../src/db/client";
import type { Sql } from "../../src/db/client";
import { ALEMBIC_HEAD, runMigrations } from "../../src/db/migrate";

const databaseUrl = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5436/macs_test";
const snapshot = await readFile(resolve("contract/schema.sql"), "utf8");
let admin: Sql;
let sql: Sql;
let url: string;
let name: string;
let dir: string;
const executableSnapshot = snapshot.replace(/^\\.*$/gm, "");
const canonical = (dump: string) => dump.split("\n").filter((line) => line.trim() && !line.startsWith("--") && !line.startsWith("\\")).join("\n");
function dump(): string {
  return canonical(execFileSync("pg_dump", ["--dbname", url, "--schema-only", "--no-owner", "--no-privileges", "--exclude-table=public.__bun_migrations"], { encoding: "utf8" }));
}
async function expectMigrationFailure(message: string): Promise<void> {
  const error: unknown = await runMigrations(sql, dir).then(() => null, (cause: unknown) => cause);
  expect(error).toBeInstanceOf(Error);
  if (!(error instanceof Error)) throw new Error("Expected migration to reject");
  expect(error.message).toContain(message);
}

async function initSnapshot(head?: string): Promise<void> {
  await sql.unsafe(`${executableSnapshot}\nSET search_path TO public;`);
  if (head !== undefined) await sql`INSERT INTO alembic_version VALUES (${head})`;
}
beforeEach(async () => {
  admin = postgres(databaseUrl, { max: 1, onnotice: () => undefined });
  name = `mig_${crypto.randomUUID().replaceAll("-", "")}`;
  await admin.unsafe(`CREATE DATABASE "${name}"`);
  const target = new URL(databaseUrl);
  target.pathname = `/${name}`;
  url = target.toString();
  sql = createDb(url).sql;
  dir = await mkdtemp(join(tmpdir(), "macs-migration-"));
  await copyFile(resolve("drizzle/0000_baseline.sql"), join(dir, "0000_baseline.sql"));
});
afterEach(async () => {
  await sql.end({ timeout: 1 });
  if (name) await admin.unsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
  await admin.end({ timeout: 1 });
  if (dir) await rm(dir, { recursive: true, force: true });
});

test("baseline on empty DB reproduces contract/schema.sql", async () => {
  expect(await runMigrations(sql, dir)).toEqual({ applied: ["0000_baseline.sql"], skipped: [] });
  expect(dump()).toBe(canonical(snapshot));
  expect(await sql`SELECT * FROM alembic_version`).toHaveLength(0);
});
test("second run applies nothing", async () => {
  await runMigrations(sql, dir);
  expect(await runMigrations(sql, dir)).toEqual({ applied: [], skipped: ["0000_baseline.sql"] });
});
test("on alembic-managed DB at head: baseline is a no-op", async () => {
  await initSnapshot(ALEMBIC_HEAD);
  await sql`INSERT INTO users (email, full_name, hashed_password) VALUES ('baseline@example.test', 'Baseline', 'synthetic')`;
  const before = dump();
  const rows = await sql`SELECT * FROM users`;
  const sequences = await sql`SELECT * FROM users_id_seq`;
  await runMigrations(sql, dir);
  expect(dump()).toBe(before);
  expect([...(await sql`SELECT * FROM users`)]).toEqual([...rows]);
  expect([...(await sql`SELECT * FROM users_id_seq`)]).toEqual([...sequences]);
  expect([...(await sql`SELECT * FROM alembic_version`)]).toEqual([{ version_num: ALEMBIC_HEAD }]);
  expect((await runMigrations(sql, dir)).applied).toEqual([]);
});
test("refuses when alembic_version is not head", async () => {
  await initSnapshot("d1a2b3c4d5e6");
  await expectMigrationFailure("alembic_version d1a2b3c4d5e6 != e2b8c1f7a934");
  expect((await sql`SELECT to_regclass('public.__bun_migrations') AS ledger`)[0]?.ledger).toBeNull();
});
test("refuses snapshot with empty alembic_version and no completed baseline", async () => {
  await initSnapshot();
  await expectMigrationFailure("alembic_version");
  expect((await sql`SELECT to_regclass('public.__bun_migrations') AS ledger`)[0]?.ledger).toBeNull();
});
test("refuses unknown state: users table exists, no alembic_version, no __bun_migrations", async () => {
  await sql`CREATE TABLE users (id integer)`;
  await expectMigrationFailure("unknown schema state");
});
test("an empty ledger does not authorize an empty alembic_version", async () => {
  await initSnapshot();
  await sql`CREATE TABLE __bun_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
  await expectMigrationFailure("alembic_version");
});
test('file starting with "-- no-transaction" runs outside a transaction', async () => {
  await runMigrations(sql, dir);
  await writeFile(join(dir, "0001_x.sql"), "-- no-transaction\nCREATE INDEX CONCURRENTLY IF NOT EXISTS ix_t ON events (title);\nCREATE INDEX CONCURRENTLY IF NOT EXISTS ix_t2 ON events (location);\n");
  expect((await runMigrations(sql, dir)).applied).toEqual(["0001_x.sql"]);
  expect([...(await sql`SELECT c.relname, i.indisvalid FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid WHERE c.relname IN ('ix_t', 'ix_t2') ORDER BY c.relname`)]).toEqual([{ relname: "ix_t", indisvalid: true }, { relname: "ix_t2", indisvalid: true }]);
  expect((await runMigrations(sql, dir)).applied).toEqual([]);
});
test("failed transactional baseline rolls back DDL and ledger insert, releases lock", async () => {
  await writeFile(join(dir, "0000_baseline.sql"), `${await readFile(join(dir, "0000_baseline.sql"), "utf8")}\nSELECT missing_baseline_function();`);
  await expectMigrationFailure("missing_baseline_function");
  expect((await sql`SELECT to_regclass('public.users') AS users`)[0]?.users).toBeNull();
  expect(await sql`SELECT * FROM __bun_migrations`).toHaveLength(0);
  expect(await sql`SELECT * FROM pg_locks WHERE locktype = 'advisory' AND objid = 727274 AND database = (SELECT oid FROM pg_database WHERE datname = current_database())`).toHaveLength(0);
});
test("ledger insert failure rolls back the complete baseline", async () => {
  await sql`CREATE TABLE public.__bun_migrations (name text PRIMARY KEY CHECK (name <> '0000_baseline.sql'), applied_at timestamptz NOT NULL DEFAULT now())`;
  await expectMigrationFailure("check constraint");
  expect((await sql`SELECT to_regclass('public.users') AS users`)[0]?.users).toBeNull();
  expect(await sql`SELECT * FROM public.__bun_migrations`).toHaveLength(0);
});
test("concurrent pools serialize migrations and release the session lock", async () => {
  await writeFile(join(dir, "0001_slow.sql"), "SELECT pg_sleep(0.1);\nCREATE TABLE migration_once (id integer);");
  const other = createDb(url).sql;
  try {
    const results = await Promise.all([runMigrations(sql, dir), runMigrations(other, dir)]);
    expect(results.map((r) => r.applied.length).sort()).toEqual([0, 2]);
    expect([...(await sql`SELECT name FROM __bun_migrations ORDER BY name`)]).toEqual([{ name: "0000_baseline.sql" }, { name: "0001_slow.sql" }]);
    expect(await sql`SELECT * FROM pg_locks WHERE locktype = 'advisory' AND objid = 727274 AND database = (SELECT oid FROM pg_database WHERE datname = current_database())`).toHaveLength(0);
  } finally { await other.end({ timeout: 1 }); }
});
test("migration restores the reserved session message setting", async () => {
  const single = createDb(url, { max: 1 }).sql;
  try {
    await single`SET client_min_messages TO error`;
    await runMigrations(single, dir);
    expect((await single`SHOW client_min_messages`)[0]?.client_min_messages).toBe("error");
  } finally { await single.end({ timeout: 1 }); }
});
test("CLI RUN_MIGRATIONS=false skips without a reachable DB", () => {
  const result = spawnSync("bun", ["src/db/migrate.ts"], { env: { ...process.env, DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:1/macs_test", RUN_MIGRATIONS: "false" }, encoding: "utf8" });
  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe("skipped");
});
