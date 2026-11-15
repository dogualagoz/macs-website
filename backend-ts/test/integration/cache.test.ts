import { afterAll, beforeEach, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import request from "../helpers/http";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { createApp } from "../../src/app";
import type { AppDeps } from "../../src/app";
import { route } from "../helpers/native-route";
import type { EventResponse } from "../../src/modules/events/schemas";
import type { ProjectResponse } from "../../src/modules/projects/schemas";
import type { SponsorResponse } from "../../src/modules/sponsors/schemas";
import { getSponsorJson } from "../../src/modules/sponsors/queries";
import { login } from "../../src/modules/auth/service";
import { createResponseCache } from "../../src/lib/cache";
import { testDeps } from "../helpers/app";
import { seedDb } from "../helpers/db";
import { tokenFor } from "../helpers/auth";

const database = testDeps();
const seed = await readFile(new URL("../../contract/seed.sql", import.meta.url), "utf8");
let deps: AppDeps;
beforeEach(async () => {
  await seedDb(database.sql, seed);
  deps = testDeps({ db: database.db, sql: database.sql, counter: database.counter, env: { ...database.env, RESPONSE_CACHE: true, RATELIMIT_ENABLED: false } });
});
afterAll(async () => { await database.sql.end({ timeout: 1 }); });
const mod = () => tokenFor("mod@example.com", "moderator");
const publicHeaders = "public, max-age=30, stale-while-revalidate=300";
function noStore(response: import("../helpers/http").TestResponse): void {
  expect(response.headers["cache-control"]).toBe("no-store");
  expect(response.headers.etag).toBeUndefined(); expect(response.headers["x-cache"]).toBeUndefined();
}
function gate() { let open!: () => void; const wait = new Promise<void>(resolve => { open = resolve; }); return { wait, open }; }

test("public GET sets headers; identical and reordered queries HIT with zero SQL", async () => {
  const app = createApp(deps);
  const first = await request(app).get("/events?limit=10&skip=0").set("Origin", "https://macsclub.com.tr");
  expect(first.status).toBe(200); expect(first.headers["cache-control"]).toBe(publicHeaders);
  expect(first.headers.etag).toMatch(/^W\/"[0-9a-z]+"$/); expect(first.headers.vary?.split(/,\s*/)).toContain("Origin"); expect(first.headers["x-cache"]).toBe("MISS");
  deps.counter.reset(); const second = await request(app).get("/events?skip=0&limit=10");
  expect(second.status).toBe(200); expect(second.headers["x-cache"]).toBe("HIT"); expect(second.text).toBe(first.text);
  expect(second.headers.etag).toBe(first.headers.etag); expect(deps.counter.count()).toBe(0);
});
test("different query values and paths never share a response", async () => {
  const app = createApp(deps); const first = await request(app).get("/events?limit=1");
  const second = await request(app).get("/events?limit=2"); const detail = await request(app).get("/events/1");
  expect(first.body).toHaveLength(1); expect(second.body).toHaveLength(2); expect(detail.body).toMatchObject({ id: 1 });
  expect(second.headers["x-cache"]).toBe("MISS"); expect(detail.headers["x-cache"]).toBe("MISS");
});
test("If-None-Match handles lists, whitespace, strong/weak tags and wildcard with no body", async () => {
  const app = createApp(deps); const first = await request(app).get("/events"); const etag = first.headers.etag as string;
  for (const candidate of [etag, `W/"other", ${etag}`, ` "other" , ${etag.slice(2)} `, "*"]) {
    deps.counter.reset(); const r = await request(app).get("/events").set("If-None-Match", candidate);
    expect(r.status).toBe(304); expect(r.text).toBe(""); expect(r.headers.etag).toBe(etag);
    expect(r.headers["cache-control"]).toBe(publicHeaders); expect(r.headers["x-cache"]).toBe("HIT"); expect(deps.counter.count()).toBe(0);
  }
  const different = await request(app).get("/events").set("If-None-Match", 'W/"other"'); expect(different.status).toBe(200); expect(different.text).toBe(first.text);
});
test.each(["garbage", "valid", "empty"])("Authorization %s bypasses cache reads/writes and conditional responses", async kind => {
  const app = createApp(deps); const authorization = kind === "empty" ? "" : `Bearer ${kind === "valid" ? await mod() : "abc"}`;
  const before = await request(app).get("/events").set("Authorization", authorization).set("If-None-Match", "*");
  expect(before.status).toBe(200); noStore(before);
  const first = await request(app).get("/events"); expect(first.headers["x-cache"]).toBe("MISS");
  deps.counter.reset(); const after = await request(app).get("/events").set("Authorization", authorization).set("If-None-Match", first.headers.etag as string);
  expect(after.status).toBe(200); noStore(after); expect(after.text).toBe(first.text); expect(deps.counter.count()).toBeGreaterThan(0);
  expect((await request(app).get("/events")).headers["x-cache"]).toBe("HIT");
});
test.each(["/users/me", "/users", "/auth/missing", "/events/admin", "/projects/admin"])("%s is no-store with or without credentials", async path => {
  const app = createApp(deps);
  noStore(await request(app).get(path));
  const r = await request(app).get(path).auth(await tokenFor("admin@example.com", "admin"), { type: "bearer" });
  expect(r.status).toBe(path === "/auth/missing" ? 404 : 200); noStore(r);
});
test("write invalidates own domain while leaving unrelated domains warm", async () => {
  const app = createApp(deps); await request(app).get("/sponsors/"); await request(app).get("/events");
  const write = await request(app).post("/sponsors/").auth(await mod(), { type: "bearer" }).send({ name: "Yeni Sponsor", category: "Kafe" });
  expect(write.status).toBe(201); noStore(write);
  const r = await request(app).get("/sponsors/"); expect(r.headers["x-cache"]).toBe("MISS"); expect(r.body).toContainEqual(expect.objectContaining({ name: "Yeni Sponsor" }));
  expect((await request(app).get("/events")).headers["x-cache"]).toBe("HIT");
});
test("validation and rolled-back writes do not invalidate", async () => {
  const app = createApp(deps); await request(app).get("/sponsors/"); await request(app).get("/projects");
  const invalid = await request(app).post("/sponsors/").auth(await mod(), { type: "bearer" }).send({}); expect(invalid.status).toBe(422); noStore(invalid);
  expect((await request(app).get("/sponsors/")).headers["x-cache"]).toBe("HIT");
  const rolledBack = await request(app).put("/projects/1").auth(await mod(), { type: "bearer" }).send({ title: "Rollback", member_ids: [{ member_id: 999 }] });
  expect(rolledBack.status).toBe(404); noStore(rolledBack);
  const projects = await request(app).get("/projects"); expect(projects.headers["x-cache"]).toBe("HIT"); expect((projects.body as { projects: ProjectResponse[] }).projects.find(p => p.id === 1)).toMatchObject({ title: "MACS Web Sitesi" });
});
test("member rename invalidates embedded project members", async () => {
  const app = createApp(deps); await request(app).get("/projects/1");
  expect((await request(app).put("/members/1").auth(await mod(), { type: "bearer" }).send({ full_name: "Yeni Üye" })).status).toBe(200);
  const r = await request(app).get("/projects/1"); expect(r.headers["x-cache"]).toBe("MISS"); expect((r.body as ProjectResponse).members.find(m => m.id === 1)).toMatchObject({ full_name: "Yeni Üye" });
});
test("project soft delete invalidates leaderboard and 204 member delete invalidates projects", async () => {
  const app = createApp(deps); const before = await request(app).get("/members/leaderboard"); expect(before.body).toContainEqual(expect.objectContaining({ id: 1, project_count: 2 }));
  const removed = await request(app).delete("/projects/1").auth(await mod(), { type: "bearer" }); expect(removed.status).toBe(204); expect(removed.text).toBe(""); noStore(removed);
  const r = await request(app).get("/members/leaderboard"); expect(r.headers["x-cache"]).toBe("MISS"); expect(r.body).toContainEqual(expect.objectContaining({ id: 1, project_count: 1 }));
  await request(app).get("/projects/2"); const deleted = await request(app).delete("/members/1").auth(await mod(), { type: "bearer" });
  expect(deleted.status).toBe(204); expect(deleted.text).toBe(""); noStore(deleted);
  const project = await request(app).get("/projects/2"); expect(project.headers["x-cache"]).toBe("MISS"); expect((project.body as ProjectResponse).members).toEqual([]);
});
test("user rename invalidates events creator", async () => {
  const app = createApp(deps); await request(app).get("/events/1");
  expect((await request(app).put("/users/me?full_name=Yeni").auth(await mod(), { type: "bearer" })).status).toBe(200);
  const r = await request(app).get("/events/1"); expect(r.headers["x-cache"]).toBe("MISS"); expect((r.body as EventResponse).creator?.full_name).toBe("Yeni");
});
test.each([true, false])("login success=%s invalidates events after committed login metadata changes", async success => {
  const app = createApp(deps); const first = await request(app).get("/events/1"); expect((first.body as EventResponse).creator).toMatchObject({ last_login: null, failed_login_attempts: 0 });
  const login = await request(app).post("/auth/login").type("form").send({ username: "mod@example.com", password: success ? "parola123" : "incorrect" });
  expect(login.status).toBe(success ? 200 : 401); noStore(login);
  const r = await request(app).get("/events/1"); expect(r.headers["x-cache"]).toBe("MISS");
  const creator = (r.body as EventResponse).creator;
  if (success) { expect(creator?.last_login).toBeString(); expect(creator?.failed_login_attempts).toBe(0); }
  else { expect(creator?.last_login).toBeNull(); expect(creator?.failed_login_attempts).toBe(1); }
});
test("login without a committed write leaves cache warm", async () => {
  const app = createApp(deps); await request(app).get("/events");
  const r = await request(app).post("/auth/login").type("form").send({ username: "missing@example.com", password: "incorrect" });
  expect(r.status).toBe(401); expect((await request(app).get("/events")).headers["x-cache"]).toBe("HIT");
});
test("failed-login invalidation callback runs after the real SQL COMMIT", async () => {
  deps.counter.reset(); let statement: string | undefined;
  const result = await login(deps.db, deps.env, new Date(), "mod@example.com", "incorrect", () => { statement = deps.counter.queries().at(-1); }).catch((error: unknown) => error);
  expect(result).toMatchObject({ status: 401 });
  expect(statement?.trim().toLowerCase()).toBe("commit");
  expect([...(await deps.sql`SELECT failed_login_attempts FROM users WHERE id = 2`)]).toEqual([{ failed_login_attempts: 1 }]);
});
test("expired lockout reset commits and invalidates even when inactive login is rejected", async () => {
  await deps.sql`UPDATE users SET failed_login_attempts = 5, last_failed_login = now() - interval '1 day' WHERE id = 5`;
  await deps.sql`UPDATE events SET created_by = 5 WHERE id = 1`;
  const app = createApp(deps); const first = await request(app).get("/events/1"); expect((first.body as EventResponse).creator?.failed_login_attempts).toBe(5);
  const r = await request(app).post("/auth/login").type("form").send({ username: "inactive@example.com", password: "parola123" });
  expect(r.status).toBe(401); noStore(r);
  const next = await request(app).get("/events/1"); expect(next.headers["x-cache"]).toBe("MISS"); expect((next.body as EventResponse).creator?.failed_login_attempts).toBe(0);
});
test("TTL expiry reruns the public handler and preserves conditional HTTP semantics", async () => {
  let now = 0;
  deps.cache = createResponseCache({ max: 500, ttlMs: 60_000, now: () => now, enabled: true });
  const app = createApp(deps); const first = await request(app).get("/events");
  now = 59_999; deps.counter.reset(); expect((await request(app).get("/events")).headers["x-cache"]).toBe("HIT"); expect(deps.counter.count()).toBe(0);
  now = 60_000; deps.counter.reset(); const expired = await request(app).get("/events").set("If-None-Match", first.headers.etag as string);
  expect(expired.status).toBe(304); expect(expired.text).toBe(""); expect(expired.headers["x-cache"]).toBe("MISS"); expect(deps.counter.count()).toBeGreaterThan(0);
});
test("HEAD bypasses shared cache and leaves warm GET entries intact", async () => {
  const app = createApp(deps); await request(app).get("/events");
  const head = await request(app).head("/events").set("If-None-Match", "*"); expect(head.status).toBe(200); expect(head.text).toBe(""); noStore(head);
  deps.counter.reset(); expect((await request(app).get("/events")).headers["x-cache"]).toBe("HIT"); expect(deps.counter.count()).toBe(0);
});
test("non-200 public route and JSON null retain correct eligibility", async () => {
  const app = createApp(deps, (router, d) => {
    route(router, d, { method: "get", path: "/cache-created", domain: "events", public: true, status: 201, tag: "test", summary: "Not cacheable", handler: () => Promise.resolve({ ok: true }) });
    route(router, d, { method: "get", path: "/cache-null", domain: "events", public: true, tag: "test", summary: "Null", handler: () => Promise.resolve(null) });
  });
  const created = await request(app).get("/cache-created").set("If-None-Match", "*"); expect(created.status).toBe(201); noStore(created);
  const first = await request(app).get("/cache-null"); expect(first.status).toBe(200); expect(first.text).toBe("null"); expect(first.headers["x-cache"]).toBe("MISS");
  const next = await request(app).get("/cache-null"); expect(next.text).toBe("null"); expect(next.headers["x-cache"]).toBe("HIT");
});
test("404 and 422 responses are no-store and never cached", async () => {
  const app = createApp(deps);
  for (let i = 0; i < 2; i++) {
    deps.counter.reset(); const missing = await request(app).get("/events/999").set("If-None-Match", "*");
    expect(missing.status).toBe(404); noStore(missing); expect(deps.counter.count()).toBeGreaterThan(0);
    const invalid = await request(app).get("/events?limit=0"); expect(invalid.status).toBe(422); noStore(invalid);
  }
});
test("RESPONSE_CACHE=false disables application storage while retaining ETag/304", async () => {
  deps = testDeps({ db: database.db, sql: database.sql, counter: database.counter, env: { ...deps.env, RESPONSE_CACHE: false } });
  const app = createApp(deps); const first = await request(app).get("/events");
  expect(first.headers["cache-control"]).toBe(publicHeaders); expect(first.headers["x-cache"]).toBe("MISS");
  deps.counter.reset(); const second = await request(app).get("/events").set("If-None-Match", first.headers.etag as string);
  expect(second.status).toBe(304); expect(second.text).toBe(""); expect(second.headers.etag).toBe(first.headers.etag); expect(second.headers["x-cache"]).toBe("MISS"); expect(deps.counter.count()).toBeGreaterThan(0);
});
test.each(["/", "/health", "/health/ready"])("health/system endpoint %s is no-store", async path => {
  const r = await request(createApp(deps)).get(path).set("If-None-Match", "*"); expect(r.status).toBe(200); noStore(r);
});
test("paused GET cannot repopulate stale data after a committed write with an empty cache", async () => {
  const read = gate(), resume = gate(); let paused = false;
  const app = createApp(deps, (router, d) => {
    route(router, d, { method: "get", path: "/cache-race", domain: "sponsors", public: true, tag: "test", summary: "Race",
      handler: async () => { const row = JSON.parse((await getSponsorJson(d.db, 1)) ?? "null") as SponsorResponse | null; if (!paused) { paused = true; read.open(); await resume.wait; } return row; } });
  });
  const pending = request(app).get("/cache-race").then(r => r);
  try {
    await read.wait;
    const write = await request(app).put("/sponsors/1").auth(await mod(), { type: "bearer" }).send({ name: "Committed" }); expect(write.status).toBe(200);
  } finally { resume.open(); }
  const stale = await pending; expect((stale.body as SponsorResponse).name).toBe("Kahve Durağı");
  const next = await request(app).get("/cache-race"); expect(next.headers["x-cache"]).toBe("MISS"); expect((next.body as SponsorResponse).name).toBe("Committed");
  expect((await request(app).get("/cache-race")).headers["x-cache"]).toBe("HIT");
});
test("write invalidation waits until its transaction commits", async () => {
  const changed = gate(), commit = gate();
  const app = createApp(deps, (router, d) => {
    route(router, d, { method: "put", path: "/cache-commit", domain: "sponsors", auth: ["moderator"], tag: "test", summary: "Commit boundary",
      handler: async () => { await d.db.transaction(async tx => { await tx.execute(sql`UPDATE sponsors SET name = 'Committed' WHERE id = 1`); changed.open(); await commit.wait; }); return { ok: true }; } });
  });
  await request(app).get("/sponsors/1");
  const pending = request(app).put("/cache-commit").auth(await mod(), { type: "bearer" }).then(r => r);
  try { await changed.wait; const before = await request(app).get("/sponsors/1"); expect(before.headers["x-cache"]).toBe("HIT"); expect((before.body as SponsorResponse).name).toBe("Kahve Durağı"); }
  finally { commit.open(); }
  expect((await pending).status).toBe(200);
  const after = await request(app).get("/sponsors/1"); expect(after.headers["x-cache"]).toBe("MISS"); expect((after.body as SponsorResponse).name).toBe("Committed");
});
test("cache HIT still applies query validation and rate limits", async () => {
  deps.env.RATELIMIT_ENABLED = true;
  const app = createApp(deps, (router, d) => {
    route(router, d, { method: "get", path: "/cache-limited", domain: "events", public: true, tag: "test", summary: "Limited", query: z.object({ q: z.string().min(1) }),
      rateLimit: { limit: 3, windowMs: 60_000, label: "3 per 1 minute" }, handler: ({ query }) => Promise.resolve(query) });
  });
  expect((await request(app).get("/cache-limited?q=yes")).headers["x-cache"]).toBe("MISS");
  expect((await request(app).get("/cache-limited?q=yes")).headers["x-cache"]).toBe("HIT");
  const invalid = await request(app).get("/cache-limited?q="); expect(invalid.status).toBe(422); noStore(invalid);
  const limited = await request(app).get("/cache-limited?q=yes"); expect(limited.status).toBe(429); noStore(limited);
});

test("v2 cached byte variants and uncached authorized compression", async () => {
  const { brotliDecompressSync, gunzipSync } = await import("node:zlib");
  const app = createApp(deps);
  const raw = await request(app).get("/events?limit=100");
  expect(raw.rawBytes.length).toBeGreaterThan(1024);
  for (const [accept, encoding, decode] of [["br", "br", brotliDecompressSync], ["gzip", "gzip", gunzipSync], ["br;q=0, gzip", "gzip", gunzipSync]] as const) {
    deps.counter.reset();
    const cached = await request(app).get("/events?limit=100").set("Accept-Encoding", accept);
    expect(cached.headers["content-encoding"]).toBe(encoding);
    expect(cached.headers.vary).toBe("Accept-Encoding, Origin");
    expect(decode(cached.rawBytes).toString()).toBe(raw.text); expect(deps.counter.count()).toBe(0);
    const privateResponse = await request(app).get("/events?limit=100").auth(await mod(), { type: "bearer" }).set("Accept-Encoding", accept);
    noStore(privateResponse); expect(privateResponse.headers["content-encoding"]).toBe(encoding);
    expect(decode(privateResponse.rawBytes).toString()).toBe(raw.text);
  }
  expect((await request(app).get("/health").set("Accept-Encoding", "br")).headers["content-encoding"]).toBeUndefined();
});
test("20 concurrent project misses execute exactly one SQL query", async () => {
  const app = createApp(deps); deps.counter.reset();
  const responses = await Promise.all(Array.from({ length: 20 }, async () => app.request("/projects?limit=100")));
  expect(responses.every(r => r.status === 200)).toBe(true); expect(deps.counter.count()).toBe(1);
});
test("unknown query spam shares one normalized cache key", async () => {
  const app = createApp(deps); await app.request("/events?limit=10"); deps.counter.reset();
  for (let i = 0; i < 50; i++) expect((await app.request(`/events?limit=10&utm_${String(i)}=a`)).headers.get("X-Cache")).toBe("HIT");
  expect(deps.cache.size()).toBe(1); expect(deps.counter.count()).toBe(0);
});
test("seven startup benchmark keys match HTTP keys and invalidation rewarms sponsors", async () => {
  const { registerBenchmarkWarmup } = await import("../../src/lib/cache-warmup");
  registerBenchmarkWarmup(deps); await deps.cache.warmupStartup();
  expect(deps.cache.size()).toBe(7);
  const app = createApp(deps); deps.counter.reset();
  for (const path of ["/events?limit=100", "/events/featured", "/projects?limit=100", "/projects/featured", "/members/leaderboard", "/members", "/sponsors/"]) expect((await app.request(path)).headers.get("X-Cache")).toBe("HIT");
  expect(deps.counter.count()).toBe(0);
  await deps.sql`UPDATE sponsors SET name = 'Warm changed' WHERE id = 1`;
  deps.cache.invalidate("sponsors"); await deps.cache.drain(); deps.counter.reset();
  const response = await request(app).get("/sponsors/"); expect(response.headers["x-cache"]).toBe("HIT");
  expect(response.body).toContainEqual(expect.objectContaining({ name: "Warm changed" })); expect(deps.counter.count()).toBe(0);
});
