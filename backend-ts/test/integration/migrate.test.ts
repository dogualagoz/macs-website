import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
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
test.each(["0", "off", "false", "OFF", "FALSE"])("CLI RUN_MIGRATIONS=%s skips without a reachable DB", (flag) => {
  const result = spawnSync("bun", ["src/db/migrate.ts"], { env: { ...process.env, DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:1/macs_test", RUN_MIGRATIONS: flag }, encoding: "utf8" });
  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe("skipped");
});

test.each(["1", "on", "true", "unset"] as const)("CLI RUN_MIGRATIONS=%s runs migrations when enabled or unset", (flag) => {
  const env = { ...process.env, DATABASE_URL: url, ...(flag === "unset" ? {} : { RUN_MIGRATIONS: flag }) };
  if (flag === "unset") delete env.RUN_MIGRATIONS;
  const result = spawnSync("bun", ["src/db/migrate.ts"], { env, encoding: "utf8" });
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual({ applied: ["0000_baseline.sql", "0001_perf_indexes.sql"], skipped: [] });
});

test("CLI rejects invalid RUN_MIGRATIONS flag", () => {
  const result = spawnSync("bun", ["src/db/migrate.ts"], { env: { ...process.env, DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:1/macs_test", RUN_MIGRATIONS: "invalid" }, encoding: "utf8" });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("RUN_MIGRATIONS");
});

test("no-transaction splits semicolons followed by spaces, tabs and CRLF", async () => {
  await runMigrations(sql, dir);
  await writeFile(join(dir, "0001_whitespace.sql"), "-- no-transaction\r\nCREATE INDEX CONCURRENTLY ix_space ON events (title);  \t\r\nCREATE INDEX CONCURRENTLY ix_tab ON events (location);\t\n");
  expect((await runMigrations(sql, dir)).applied).toEqual(["0001_whitespace.sql"]);
  expect([...(await sql`SELECT c.relname, i.indisvalid FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid WHERE c.relname IN ('ix_space', 'ix_tab') ORDER BY c.relname`)]).toEqual([{ relname: "ix_space", indisvalid: true }, { relname: "ix_tab", indisvalid: true }]);
});

test("0001 creates the five expected valid indexes, matches schema and is idempotent", async () => {
  await runMigrations(sql, dir);
  await copyFile(resolve("drizzle/0001_perf_indexes.sql"), join(dir, "0001_perf_indexes.sql"));
  const names = ["ix_events_active_start", "ix_events_created_at", "ix_projects_live_created", "ix_projects_deleted_featured", "ix_sponsors_active_category"].sort();
  const before = await sql<{ indexname: string }[]>`SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname`;
  expect((await runMigrations(sql, dir)).applied).toEqual(["0001_perf_indexes.sql"]);
  const after = await sql<{ indexname: string; indexdef: string }[]>`SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname`;
  expect(after.filter(row => !before.some(old => old.indexname === row.indexname)).map(row => row.indexname)).toEqual(names);
  const expectedDefinitions = [
    "CREATE INDEX ix_events_active_start ON public.events USING btree (is_active, start_time) WHERE (is_deleted = false)",
    "CREATE INDEX ix_events_created_at ON public.events USING btree (created_at)",
    "CREATE INDEX ix_projects_deleted_featured ON public.projects USING btree (is_deleted, is_featured)",
    "CREATE INDEX ix_projects_live_created ON public.projects USING btree (created_at DESC) WHERE ((is_deleted = false) AND (is_active = true))",
    "CREATE INDEX ix_sponsors_active_category ON public.sponsors USING btree (is_active, category)",
  ];
  expect(after.filter(row => names.includes(row.indexname)).map(row => row.indexdef)).toEqual(expectedDefinitions);
  expect(await runMigrations(sql, dir)).toEqual({ applied: [], skipped: ["0000_baseline.sql", "0001_perf_indexes.sql"] });
  // Exercise IF NOT EXISTS as well as the normal ledger skip path.
  await sql`DELETE FROM __bun_migrations WHERE name = '0001_perf_indexes.sql'`;
  expect((await runMigrations(sql, dir)).applied).toEqual(["0001_perf_indexes.sql"]);
  expect([...(await sql`SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname`)]).toEqual([...after]);
  expect((await sql`SELECT count(*)::int AS invalid FROM pg_index WHERE NOT indisvalid`)[0]?.invalid).toBe(0);
  const { getTableConfig } = await import("drizzle-orm/pg-core");
  const { events, projects, sponsors } = await import("../../src/db/schema");
  const declared = [events, projects, sponsors].flatMap(table => getTableConfig(table).indexes.map(index => index.config.name));
  for (const name of names) expect(declared).toContain(name);
});


test("concurrent migration rebuilds its invalid index and preserves unrelated invalid indexes", async () => {
  await runMigrations(sql, dir);
  await copyFile(resolve("drizzle/0001_perf_indexes.sql"), join(dir, "0001_perf_indexes.sql"));
  await sql`CREATE INDEX ix_events_active_start ON events (is_active, start_time) WHERE is_deleted = false`;
  await sql`CREATE INDEX ix_unrelated_invalid ON events (title)`;
  await sql`UPDATE pg_index SET indisvalid = false WHERE indexrelid IN ('public.ix_events_active_start'::regclass, 'public.ix_unrelated_invalid'::regclass)`;
  const [before] = await sql`SELECT 'public.ix_events_active_start'::regclass::oid AS oid`;
  const warn = spyOn(console, "warn").mockImplementation(() => undefined);
  try {
    expect((await runMigrations(sql, dir)).applied).toEqual(["0001_perf_indexes.sql"]);
    expect((await sql`SELECT indisvalid FROM pg_index WHERE indexrelid = 'public.ix_events_active_start'::regclass`)[0]?.indisvalid).toBe(true);
    expect((await sql`SELECT 'public.ix_events_active_start'::regclass::oid AS oid`)[0]?.oid).not.toBe(before?.oid);
    expect((await sql`SELECT indisvalid FROM pg_index WHERE indexrelid = 'public.ix_unrelated_invalid'::regclass`)[0]?.indisvalid).toBe(false);
    expect(await sql`SELECT 1 FROM __bun_migrations WHERE name = '0001_perf_indexes.sql'`).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith("Rebuilding INVALID index public.ix_events_active_start for 0001_perf_indexes.sql");
  } finally { warn.mockRestore(); }
});

test.each(["invalid", "missing"])("concurrent migration refuses to record an index that remains %s", async (state) => {
  await runMigrations(sql, dir);
  const source = await readFile(resolve("drizzle/0001_perf_indexes.sql"), "utf8");
  const sabotage = state === "invalid" ? "UPDATE pg_index SET indisvalid = false WHERE indexrelid = 'public.ix_events_active_start'::regclass;" : "DROP INDEX public.ix_events_active_start;";
  await writeFile(join(dir, "0001_perf_indexes.sql"), `${source}${sabotage}\n`);
  await expectMigrationFailure("public.ix_events_active_start is missing or INVALID");
  expect(await sql`SELECT 1 FROM __bun_migrations WHERE name = '0001_perf_indexes.sql'`).toHaveLength(0);
});

test("failed concurrent build leaves no applied ledger row", async () => {
  await runMigrations(sql, dir);
  await sql`CREATE TABLE failing_build (n integer)`;
  await sql`INSERT INTO failing_build VALUES (0)`;
  await writeFile(join(dir, "0001_failing.sql"), "-- no-transaction\nCREATE INDEX CONCURRENTLY IF NOT EXISTS ix_failing_build ON failing_build ((10 / n));\n");
  await expectMigrationFailure("division by zero");
  expect((await sql`SELECT indisvalid FROM pg_index WHERE indexrelid = 'public.ix_failing_build'::regclass`)[0]?.indisvalid).toBe(false);
  expect(await sql`SELECT 1 FROM __bun_migrations WHERE name = '0001_failing.sql'`).toHaveLength(0);
});

test.each([false, true])("no-transaction disables timeout and restores settings after failure=%s", async (fails) => {
  await runMigrations(sql, dir);
  const single = createDb(url, { max: 1 }).sql;
  try {
    await single`SET statement_timeout TO '50ms'`;
    await single`SET client_min_messages TO error`;
    await writeFile(join(dir, "0001_timeout.sql"), `-- no-transaction\nCREATE TABLE timeout_evidence (value text);\nINSERT INTO timeout_evidence SELECT current_setting('statement_timeout');\nSELECT pg_sleep(0.1);\n${fails ? "SELECT missing_timeout_function();\n" : ""}`);
    const result = await runMigrations(single, dir).catch((error: unknown) => error);
    if (fails) {
      expect(result).toBeInstanceOf(Error);
      if (!(result instanceof Error)) throw new Error("Expected migration to reject");
      expect(result.message).toContain("missing_timeout_function");
      expect(await single`SELECT 1 FROM __bun_migrations WHERE name = '0001_timeout.sql'`).toHaveLength(0);
    } else expect(result).toEqual({ applied: ["0001_timeout.sql"], skipped: ["0000_baseline.sql"] });
    expect([...(await single`SELECT value FROM timeout_evidence`)]).toEqual([{ value: "0" }]);
    expect((await single`SHOW statement_timeout`)[0]?.statement_timeout).toBe("50ms");
    expect((await single`SHOW client_min_messages`)[0]?.client_min_messages).toBe("error");
    expect(await single`SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND objid = 727274 AND database = (SELECT oid FROM pg_database WHERE datname = current_database())`).toHaveLength(0);
  } finally { await single.end({ timeout: 1 }); }
});
