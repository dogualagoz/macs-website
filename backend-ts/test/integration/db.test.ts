import { afterAll, expect, test } from "bun:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import request from "supertest";
import { createApp } from "../../src/app";
import { createDb } from "../../src/db/client";
import { alembicVersion, assets, events, projects, sponsors, users } from "../../src/db/schema";
import { pgToNaiveIso, pgToUtcIso } from "../../src/lib/datetime";
import { verifyAccessToken } from "../../src/lib/jwt";
import { testDeps } from "../helpers/app";
import { tokenFor } from "../helpers/auth";
import { countQueries, resetDb } from "../helpers/db";

const deps = testDeps();
afterAll(async () => { await deps.sql.end({ timeout: 1 }); });
test("session timezone is UTC", async () => { expect((await deps.sql`show timezone`)[0]?.TimeZone).toBe("UTC"); });
test("statement_timeout is 10s", async () => { expect((await deps.sql`show statement_timeout`)[0]?.statement_timeout).toBe("10s"); });
test("timestamps come back as strings", async () => {
  const [row] = await deps.sql<{ zoned: string; naive: string; date: string }[]>`SELECT '2026-05-01 11:00:00.123456+03'::timestamptz AS zoned, '2026-05-01 11:00:00.123456'::timestamp AS naive, '2026-05-01'::date AS date`;
  expect(typeof row?.zoned).toBe("string");
  expect(pgToUtcIso(row?.zoned ?? null)).toBe("2026-05-01T08:00:00.123456Z");
  expect(pgToNaiveIso(row?.naive ?? null)).toBe("2026-05-01T11:00:00.123456");
  expect(row?.date).toBe("2026-05-01");
});
test("counter counts statements", async () => {
  deps.counter.reset();
  await deps.sql`select 1`;
  await deps.sql`select 2`;
  expect(deps.counter.count()).toBe(2);
  expect(deps.counter.queries()).toEqual(["select 1", "select 2"]);
  const previous = deps.counter.queries();
  deps.counter.reset();
  expect(deps.counter.count()).toBe(0);
  expect(previous).toEqual(["select 1", "select 2"]);
  const counted = await countQueries(deps, async () => { await deps.sql`select 3`; return "done"; });
  expect(counted).toEqual({ result: "done", count: 1, queries: ["select 3"] });
});
test("GET /health/ready 200 when DB up", async () => {
  const r = await request(createApp(deps)).get("/health/ready");
  expect(r.status).toBe(200);
  expect(r.body).toEqual({ status: "ok" });
  expect(r.headers["cache-control"]).toBe("no-store");
});
test("GET /health/ready 503 when DB down", async () => {
  const down = createDb("postgresql://postgres:postgres@127.0.0.1:1/macs_test");
  try {
    const start = performance.now();
    const r = await request(createApp(testDeps(down))).get("/health/ready");
    expect(r.status).toBe(503);
    expect(r.body).toEqual({ status: "unavailable" });
    expect(r.headers["cache-control"]).toBe("no-store");
    expect(performance.now() - start).toBeLessThan(2500);
  } finally { await down.sql.end({ timeout: 1 }); }
});
test("readiness returns 503 within two seconds when the pool is occupied", async () => {
  const single = createDb(deps.env.DATABASE_URL, { max: 1 });
  const held = await single.sql.reserve();
  try {
    const start = performance.now();
    const r = await request(createApp(testDeps(single))).get("/health/ready");
    expect(r.status).toBe(503);
    expect(r.body).toEqual({ status: "unavailable" });
    expect(performance.now() - start).toBeLessThan(2500);
  } finally { held.release(); await single.sql.end({ timeout: 1 }); }
});
test("Drizzle schema preserves timestamp strings, enums and server defaults", async () => {
  await resetDb(deps.sql);
  const [user] = await deps.db.insert(users).values({ email: "schema@example.test", fullName: "Schema", hashedPassword: "synthetic" }).returning();
  expect(user?.role).toBe("moderator");
  expect(user?.status).toBe("pending");
  expect(typeof user?.createdAt).toBe("string");
  expect(user?.isActive).toBeNull();
  const [asset] = await deps.db.insert(assets).values({ filename: "binary.dat", contentType: "application/octet-stream", data: Buffer.from([0, 1, 255]) }).returning();
  expect(asset?.data).toEqual(Buffer.from([0, 1, 255]));
  expect(getTableConfig(alembicVersion).primaryKeys[0]?.getName()).toBe("alembic_version_pkc");
  const [sponsor] = await deps.db.insert(sponsors).values({ name: "Sponsor", category: "test" }).returning();
  expect(sponsor?.isFeatured).toBe(false);
  expect(getTableConfig(events).columns.find((c) => c.name === "start_time")?.dataType).toBe("string");
  expect(projects.status.enumValues).toEqual(["PLANNING", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "CANCELLED"]);
  expect(projects.projectType.enumValues).toEqual(["DEVELOPED_BY_MACS", "SUPPORTED_BY_MACS", "MEMBER_SHOWCASE"]);
  await resetDb(deps.sql);
  expect(await deps.db.select().from(users)).toHaveLength(0);
  const [reset] = await deps.db.insert(users).values({ email: "reset@example.test", fullName: "Reset", hashedPassword: "synthetic" }).returning();
  expect(reset?.id).toBe(1);
  await resetDb(deps.sql);
});
test("tokenFor signs claims using the testDeps secret", async () => {
  const token = await tokenFor("token@example.test", "moderator");
  const claims = await verifyAccessToken(token, deps.env.JWT_SECRET_KEY, new Date());
  expect(claims.sub).toBe("token@example.test");
  expect(claims.role).toBe("moderator");
});
