import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import { createApp } from "../src/app";
import { parseEnv } from "../src/config/env";
import { createDb } from "../src/db/client";
import type { Sql } from "../src/db/client";
import { createResponseCache } from "../src/lib/cache";
import { createLogger } from "../src/lib/logger";
import { localDiskStorage } from "../src/lib/storage";
import { findUserByEmail } from "../src/modules/users/repo";
import { serializeUser } from "../src/modules/users/serializer";

const bindings = z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]));
interface CapturedQuery { text: string; params: z.infer<typeof bindings> }
// Opt-in, in-memory, benchmark-only interception; never installs a production log sink.
export async function captureQueries(sql: Sql, action: () => Promise<void>): Promise<CapturedQuery[]> {
  const previous = sql.options.debug;
  const queries: CapturedQuery[] = [];
  sql.options.debug = (_connection, text, parameters) => { queries.push({ text, params: bindings.parse(parameters) }); };
  try { await action(); return queries; }
  finally { sql.options.debug = previous; }
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { phase: { type: "string" } }, strict: true, allowPositionals: false });
  if (values.phase !== "before" && values.phase !== "after") throw new Error("Usage: DATABASE_URL=<local dump DB> bun bench/explain.ts --phase before|after");
  if (!process.env.DATABASE_URL) throw new Error("Explicit DATABASE_URL is required");
  const env = parseEnv({ ...process.env, RESPONSE_CACHE: "false", LOG_LEVEL: "debug" });
  if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(env.DATABASE_URL).hostname)) throw new Error("Audit requires a local dump database");
  const database = createDb(env.DATABASE_URL, { max: 1 });
  const out = resolve(import.meta.dirname, "explain");
  await mkdir(out, { recursive: true });
  const prefix = values.phase === "after" ? "after-" : "";
  const app = createApp({ ...database, env, logger: createLogger("warn"), routeRegistry: [], storage: localDiskStorage(env.UPLOAD_DIR),
    cache: createResponseCache({ max: 500, ttlMs: 60_000, now: Date.now, enabled: false }),
    loadUser: email => findUserByEmail(database.db, email).then(row => row ? serializeUser(row) : null) });
  const server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: (req, server) => app.fetch(req, { socketIp: server.requestIP(req)?.address }) });
  try {
    const address = { port: server.port };
    await database.sql`SELECT 1`;
    const [event] = await database.sql<{ slug: string }[]>`SELECT slug FROM events WHERE is_deleted = false AND is_active = true ORDER BY id LIMIT 1`;
    const [project] = await database.sql<{ slug: string }[]>`SELECT slug FROM projects WHERE is_deleted = false AND is_active = true ORDER BY id LIMIT 1`;
    if (!event || !project) throw new Error("Dump must contain live events and projects");
    const cases = [
      ["events-list", "/events?limit=100"],
      ["events-list-upcoming", "/events?limit=100&status=upcoming&sort_by=start_time"],
      ["events-featured", "/events/featured"], ["events-by-slug", `/events/by-slug/${encodeURIComponent(event.slug)}`],
      ["projects-list", "/projects?limit=100"], ["projects-featured", "/projects/featured"],
      ["projects-by-slug", `/projects/by-slug/${encodeURIComponent(project.slug)}`],
      ["members-list", "/members"], ["members-leaderboard", "/members/leaderboard"],
      ["sponsors-list", "/sponsors/"], ["sponsors-categories", "/sponsors/categories"],
    ] as const;
    const counts: Record<string, number> = {};
    async function explain(name: string, queries: CapturedQuery[], forced = false): Promise<string> {
      if (!queries.length) throw new Error(`${name}: no SQL captured`);
      const parts = [`Phase: ${values.phase ?? ""}; EXPLAIN (ANALYZE, BUFFERS); enable_seqscan=${forced ? "off (index eligibility only; not a production plan)" : "on"}`];
      for (const query of queries) {
        const rows = await database.sql.unsafe<{ "QUERY PLAN": string }[]>(`EXPLAIN (ANALYZE, BUFFERS) ${query.text}`, query.params);
        parts.push(`SQL: ${query.text}\nBindings: ${JSON.stringify(query.params)}\n${rows.map(row => row["QUERY PLAN"]).join("\n")}`);
      }
      const text = `${parts.join("\n\n")}\n`;
      if (/[\w.+-]+@[\w.-]+|\$2[aby]\$/.test(text)) throw new Error(`${name}: refusing to persist email or bcrypt data`);
      await writeFile(resolve(out, `${prefix}${name}.txt`), text);
      return text;
    }
    for (const [name, path] of cases) {
      const queries = await captureQueries(database.sql, async () => {
        const response = await fetch(`http://127.0.0.1:${String(address.port)}${path}`);
        await response.arrayBuffer();
        if (response.status !== 200) throw new Error(`${name}: HTTP ${response.status.toString()}`);
      });
      counts[path] = queries.length;
      if (queries.length > 2) throw new Error(`${name}: ${queries.length.toString()} queries exceeds the N+1 gate`);
      if (name === "projects-list") {
        await explain(name, queries.filter(query => !query.text.startsWith("select count(")));
        await explain("projects-count", queries.filter(query => query.text.startsWith("select count(")));
      } else await explain(name, queries);
    }
    // A synthetic missing value retains the exact lookup SQL/bindings without persisting a real email.
    await explain("user-by-email", await captureQueries(database.sql, async () => { await findUserByEmail(database.db, "benchmark-redacted"); }));
    if (values.phase === "after") {
      await database.sql`SET enable_seqscan = off`;
      try {
        const probes = [
          ["ix_events_active_start", "SELECT start_time FROM events WHERE is_deleted = false AND is_active = true AND start_time >= (now() AT TIME ZONE 'UTC') ORDER BY start_time"],
          ["ix_events_created_at", "SELECT created_at FROM events ORDER BY created_at"],
          ["ix_projects_live_created", "SELECT created_at FROM projects WHERE is_deleted = false AND is_active = true ORDER BY created_at DESC"],
          ["ix_projects_deleted_featured", "SELECT is_deleted, is_featured FROM projects WHERE is_deleted = false AND is_featured = true"],
          ["ix_sponsors_active_category", "SELECT is_active, category FROM sponsors WHERE is_active = true ORDER BY category"],
        ] as const;
        for (const [index, text] of probes) {
          const plan = await explain(index, [{ text, params: [] }], true);
          if (!plan.includes(index)) throw new Error(`${index}: forced eligibility plan did not use the index`);
        }
      } finally { await database.sql`SET enable_seqscan = on`; }
    }
    const [countsRow] = await database.sql<{ counts: Record<string, number> }[]>`SELECT json_build_object('events', (SELECT count(*) FROM events), 'projects', (SELECT count(*) FROM projects), 'members', (SELECT count(*) FROM members), 'sponsors', (SELECT count(*) FROM sponsors)) AS counts`;
    const summary = { phase: values.phase, tableRows: countsRow?.counts, queryCounts: counts };
    await writeFile(resolve(out, `${prefix}query-counts.json`), `${JSON.stringify(summary, null, 2)}\n`);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await server.stop(true);
    await database.sql.end({ timeout: 5 });
  }
}
if (import.meta.main) main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
