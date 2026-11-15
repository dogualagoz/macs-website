import { afterAll, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { Writable } from "node:stream";
import pino from "pino";
import request from "supertest";
import { createApp } from "../../src/app";
import type { AppDeps } from "../../src/app";
import { parseEnv } from "../../src/config/env";
import { testDeps, TEST_DATABASE_URL, TEST_JWT_SECRET } from "../helpers/app";
import { seedDb } from "../helpers/db";
import { tokenFor } from "../helpers/auth";

const deps = testDeps();
const seed = await readFile(new URL("../../contract/seed.sql", import.meta.url), "utf8");
afterAll(async () => { await deps.sql.end({ timeout: 1 }); });
beforeEach(async () => { await seedDb(deps.sql, seed); });
const mod = () => tokenFor("mod@example.com", "moderator");
const noNetwork = (): Promise<Response> => Promise.reject(new Error("Unexpected upstream fetch"));
function geocodeApp(fetchImpl: NonNullable<AppDeps["fetchImpl"]>, extra: Partial<AppDeps> = {}) {
  return createApp({ ...deps, routeRegistry: [], fetchImpl, ...extra });
}

describe("members and sponsors database integration", () => {
  test("leaderboard issues exactly one aggregate SQL and returns required counts", async () => {
    deps.counter.reset(); const r = await request(createApp(deps)).get("/members/leaderboard").auth("garbage", { type: "bearer" });
    expect(r.status).toBe(200); expect((r.body as { id: number; project_count: number; total_contributions: number }[]).map(({ id, project_count, total_contributions }) => ({ id, project_count, total_contributions }))).toEqual([
      { id: 1, project_count: 2, total_contributions: 6 }, { id: 2, project_count: 1, total_contributions: 2 }, { id: 4, project_count: 0, total_contributions: 0 },
    ]);
    expect(deps.counter.count()).toBe(1);
  });
  test("public lists use at most two SQL, project memberships included, and no credential/user_id projection", async () => {
    const app = createApp(deps);
    for (const [path, expectedIds] of [["/members", [4, 3, 2, 1]], ["/sponsors/", [1, 2, 3, 5]], ["/sponsors/categories", undefined], ["/members/1/projects", [1, 3, 5]]] as const) {
      deps.counter.reset(); const r = await request(app).get(path).auth("garbage", { type: "bearer" }); expect(r.status).toBe(200);
      if (expectedIds) expect((r.body as { id: number }[]).map(row => row.id)).toEqual([...expectedIds]);
      expect(deps.counter.count()).toBeGreaterThan(0); expect(deps.counter.count()).toBeLessThanOrEqual(2);
      expect(deps.counter.queries().every(query => !query.includes("hashed_password") && !query.includes("user_id"))).toBe(true);
    }
  });
  test("member deletion cascades only its memberships in the database", async () => {
    const r = await request(createApp(deps)).delete("/members/1").auth(await mod(), { type: "bearer" }); expect(r.status).toBe(204); expect(r.text).toBe("");
    expect(await deps.sql`SELECT id FROM members WHERE id = 1`).toHaveLength(0);
    expect(await deps.sql`SELECT id FROM project_members WHERE member_id = 1`).toHaveLength(0);
    expect((await deps.sql<{ id: number }[]>`SELECT id FROM project_members ORDER BY id`).map(row => row.id)).toEqual([2, 4, 6]);
    expect(await deps.sql`SELECT id FROM projects`).toHaveLength(5);
  });
  test("member serializer coerces NULL active to false and preserves timestamp precision", async () => {
    await deps.sql`UPDATE members SET is_active = NULL WHERE id = 1`;
    const r = await request(createApp(deps)).get("/members/1"); expect(r.status).toBe(200);
    expect(r.body).toEqual({ full_name: "Ayşe Yılmaz", profile_image: null, id: 1, is_active: false, created_at: "2026-01-01T12:00:00.123456Z" });
  });
  test("NULL contribution_count serializes to zero and SUM ignores it", async () => {
    await deps.sql`UPDATE project_members SET contribution_count = NULL WHERE id = 1`;
    const app = createApp(deps); const r = await request(app).get("/members/1/projects"); expect(r.status).toBe(200); expect((r.body as object[])[0]).toMatchObject({ id: 1, contribution_count: 0 });
    const stats = await request(app).get("/members/1/stats"); expect(stats.status).toBe(200); expect(stats.body).toMatchObject({ project_count: 3, total_contributions: 10 });
    const board = await request(app).get("/members/leaderboard"); expect(board.status).toBe(200); expect((board.body as object[])[0]).toMatchObject({ id: 1, project_count: 2, total_contributions: 1 });
  });
  test("leaderboard excludes members with only filtered projects and breaks aggregate ties by id", async () => {
    await deps.sql`UPDATE project_members SET project_id = 3 WHERE member_id = 2`;
    const app = createApp(deps); const filtered = await request(app).get("/members/leaderboard"); expect(filtered.status).toBe(200); expect((filtered.body as { id: number }[]).map(row => row.id)).toEqual([1, 4]);
    await deps.sql`DELETE FROM project_members`;
    const tied = await request(app).get("/members/leaderboard"); expect(tied.status).toBe(200); expect((tied.body as { id: number }[]).map(row => row.id)).toEqual([1, 2, 4]);
  });
  test("members with tied creation dates order by descending id", async () => {
    await deps.sql`UPDATE members SET created_at = '2026-01-01 12:00:00.123456+00'`;
    const r = await request(createApp(deps)).get("/members"); expect(r.status).toBe(200); expect((r.body as { id: number }[]).map(row => row.id)).toEqual([4, 3, 2, 1]);
  });
  test("sponsor categories include inactive sponsors, exclude empty category and support both slash forms", async () => {
    await deps.sql`UPDATE sponsors SET category = 'Inactive only' WHERE id = 4`;
    await deps.sql`UPDATE sponsors SET category = '' WHERE id = 5`;
    const app = createApp(deps); const categories = await request(app).get("/sponsors/categories"); expect(categories.status).toBe(200); expect(categories.body).toEqual(["Inactive only", "Kafe", "Kitap", "Restoran"]);
    await deps.sql`UPDATE sponsors SET category = 'Teknoloji' WHERE id = 5`;
    const slash = await request(app).get("/sponsors/"); const noSlash = await request(app).get("/sponsors"); expect(slash.status).toBe(200); expect(noSlash.status).toBe(200); expect(noSlash.body).toEqual(slash.body);
  });
  test("invalid sponsor update is rejected with 422 before writing and preserves cached GET /sponsors/:id", async () => {
    const logger = pino({ level: "silent" });
    const cachedDeps = testDeps({ db: deps.db, sql: deps.sql, counter: deps.counter, logger, env: { ...deps.env, RESPONSE_CACHE: true, RATELIMIT_ENABLED: false } });
    const app = createApp(cachedDeps);
    const token = await mod();
    const warm = await request(app).get("/sponsors/1");
    expect(warm.status).toBe(200); expect(warm.headers["x-cache"]).toBe("MISS");
    expect(warm.body).toMatchObject({ id: 1, name: "Kahve Durağı", discount_info: null, is_active: true, is_featured: true });
    for (const [payload, expectedItem] of [
      [{ discount_info: "x".repeat(501) }, { type: "string_too_long", loc: ["body", "discount_info"], msg: "String should have at most 500 characters", input: "x".repeat(501) }],
      [{ is_active: null }, { type: "bool_type", loc: ["body", "is_active"], msg: "Input should be a valid boolean", input: null }],
      [{ is_featured: null }, { type: "bool_type", loc: ["body", "is_featured"], msg: "Input should be a valid boolean", input: null }],
    ] as const) {
      deps.counter.reset();
      const r = await request(app).put("/sponsors/1").auth(token, { type: "bearer" }).send(payload);
      expect(r.status).toBe(422); expect(r.body).toEqual({ detail: [expectedItem] });
      expect(deps.counter.queries().some(q => /\bupdate\b/i.test(q))).toBe(false);
      const [row] = await deps.sql<{ discount_info: string | null; is_active: boolean; is_featured: boolean }[]>`SELECT discount_info, is_active, is_featured FROM sponsors WHERE id = 1`;
      expect(row).toEqual({ discount_info: null, is_active: true, is_featured: true });
      deps.counter.reset();
      const cached = await request(app).get("/sponsors/1");
      expect(cached.status).toBe(200); expect(cached.headers["x-cache"]).toBe("HIT"); expect(cached.body).toEqual(warm.body); expect(deps.counter.count()).toBe(0);
      const uncached = await request(app).get("/sponsors/1").auth("garbage", { type: "bearer" });
      expect(uncached.status).toBe(200); expect(uncached.body).toEqual(warm.body);
    }
  });
});

describe("geocode with injected upstream (no real network)", () => {
  test("success maps fields and sends exact URL parameters, User-Agent and timeout signal", async () => {
    let observedUrl: URL | undefined; let observedHeaders: Headers | undefined; let signal: AbortSignal | null | undefined;
    const fetchImpl: NonNullable<AppDeps["fetchImpl"]> = (input, init) => {
      observedUrl = new URL(input instanceof Request ? input.url : input.toString()); observedHeaders = new Headers(init?.headers); signal = init?.signal;
      return Promise.resolve(Response.json([{ lat: "40.9887", lon: "29.0274", display_name: "Kadıköy, İstanbul, Türkiye" }]));
    };
    const r = await request(geocodeApp(fetchImpl)).post("/sponsors/geocode").auth(await mod(), { type: "bearer" }).send({ address: "Kadıköy & İstanbul" });
    expect(r.status).toBe(200); expect(r.body).toEqual({ latitude: 40.9887, longitude: 29.0274, formatted_address: "Kadıköy, İstanbul, Türkiye" });
    expect(observedUrl?.origin).toBe("https://nominatim.openstreetmap.org"); expect(observedUrl?.pathname).toBe("/search");
    expect(Object.fromEntries(observedUrl?.searchParams ?? [])).toEqual({ q: "Kadıköy & İstanbul", format: "json", limit: "1", countrycodes: "tr" });
    expect(observedHeaders?.get("User-Agent")).toBe("MACS-Website/1.0 (contact@macs.com)"); expect(signal).toBeInstanceOf(AbortSignal); expect(signal?.aborted).toBe(false);
  });
  test("geocode creates a five-second AbortSignal timeout", async () => {
    const timeout = spyOn(AbortSignal, "timeout");
    try {
      const r = await request(geocodeApp(() => Promise.resolve(Response.json([])))).post("/sponsors/geocode").auth(await mod(), { type: "bearer" }).send({ address: "Kadıköy" });
      expect(r.status).toBe(404); expect(timeout).toHaveBeenCalledTimes(1); expect(timeout).toHaveBeenCalledWith(5000);
    } finally { timeout.mockRestore(); }
  });
  test("configured geocode User-Agent is forwarded", async () => {
    const observed: { ua: string | null } = { ua: null };
    const env = parseEnv({ DATABASE_URL: TEST_DATABASE_URL, JWT_SECRET_KEY: TEST_JWT_SECRET, NOMINATIM_USER_AGENT: "Club-Test/contact@example.com", RATELIMIT_ENABLED: "false" });
    const r = await request(geocodeApp((_input, init) => { observed.ua = new Headers(init?.headers).get("User-Agent"); return Promise.resolve(Response.json([])); }, { env })).post("/sponsors/geocode").auth(await mod(), { type: "bearer" }).send({ address: "Kadıköy" });
    expect(r.status).toBe(404); expect(observed.ua).toBe("Club-Test/contact@example.com");
  });
  test("empty upstream array returns exact 404", async () => {
    const r = await request(geocodeApp(() => Promise.resolve(Response.json([])))).post("/sponsors/geocode").auth(await mod(), { type: "bearer" }).send({ address: "Kadıköy" });
    expect(r.status).toBe(404); expect(r.body).toEqual({ detail: "Adres bulunamadı. Lütfen daha detaylı bir adres girin." });
  });
  test.each(["AbortError", "TimeoutError"])("upstream %s returns exact 504", async name => {
    const r = await request(geocodeApp(() => Promise.reject(new DOMException("Aborted", name)))).post("/sponsors/geocode").auth(await mod(), { type: "bearer" }).send({ address: "Kadıköy" });
    expect(r.status).toBe(504); expect(r.body).toEqual({ detail: "Geocoding servisi yanıt vermiyor. Lütfen tekrar deneyin." });
  });
  test.each(["network", "http503"])("upstream %s returns exact logged 500", async failure => {
    const logs: string[] = []; const logger = pino({ level: "error" }, new Writable({ write(chunk: Buffer, _encoding, callback) { logs.push(chunk.toString()); callback(); } }));
    const r = await request(geocodeApp(() => failure === "network" ? Promise.reject(new TypeError("Network unreachable")) : Promise.resolve(new Response("Unavailable", { status: 503 })), { logger })).post("/sponsors/geocode").auth(await mod(), { type: "bearer" }).send({ address: "Kadıköy" });
    expect(r.status).toBe(500); expect(r.body).toEqual({ detail: "Geocoding servisine ulaşılamadı" }); expect(logs.join("")).toContain("Geocoding isteği başarısız");
  });
  test("authentication and input validation happen before upstream fetch", async () => {
    const app = geocodeApp(noNetwork); const anonymous = await request(app).post("/sponsors/geocode").send({ address: "Kadıköy" }); expect(anonymous.status).toBe(401);
    const short = await request(app).post("/sponsors/geocode").auth(await mod(), { type: "bearer" }).send({ address: "ab" }); expect(short.status).toBe(422);
  });
  test("geocode rate limit is ten per minute", async () => {
    const app = geocodeApp(() => Promise.resolve(Response.json([]))); const token = await mod();
    for (let i = 0; i < 10; i++) expect((await request(app).post("/sponsors/geocode").auth(token, { type: "bearer" }).send({ address: "Kadıköy" })).status).toBe(404);
    const r = await request(app).post("/sponsors/geocode").auth(token, { type: "bearer" }).send({ address: "Kadıköy" }); expect(r.status).toBe(429); expect(r.body).toEqual({ error: "Rate limit exceeded: 10 per 1 minute" });
  });
});
