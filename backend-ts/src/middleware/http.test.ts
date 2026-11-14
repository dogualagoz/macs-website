import { expect, test } from "bun:test";
import { Writable } from "node:stream";
import pino from "pino";
import request from "supertest";
import { createApp } from "../app";
import type { AppDeps } from "../app";
import { parseEnv } from "../config/env";
import { HttpError } from "../lib/http-error";
import { signAccessToken } from "../lib/jwt";
import { route } from "../lib/route";
import type { AuthUser } from "./auth";
import { perHour, perMinute } from "./rate-limit";

const now = new Date("2026-11-14T00:00:00Z");
const env = parseEnv({ DATABASE_URL: "postgresql://u:p@db/x", JWT_SECRET_KEY: "x".repeat(32), NODE_ENV: "test" });
const user: AuthUser = { id: 1, email: "admin@example.com", full_name: "Admin", role: "admin", status: "approved", is_active: true, last_login: null, failed_login_attempts: 0, password_changed_at: null };
function setup(options: { user?: AuthUser | null; enabled?: boolean } = {}) {
  const logs: Record<string, unknown>[] = [];
  const logger = pino({ level: "info" }, new Writable({ write(chunk: Buffer, _encoding, done) { logs.push(JSON.parse(chunk.toString()) as Record<string, unknown>); done(); } }));
  const deps: AppDeps = { env: { ...env, RATELIMIT_ENABLED: options.enabled ?? true }, logger, routeRegistry: [], now: () => now,
    loadUser: (email) => { expect(email).toBe(user.email); return Promise.resolve(options.user === undefined ? user : options.user); } };
  const app = createApp(deps, (router, d) => {
    const base = { domain: "system", tag: "System", summary: "Test" } as const;
    route(router, d, { ...base, method: "get", path: "/protected", auth: "user", handler: ({ user: current }) => Promise.resolve({ email: current?.email }) });
    for (const path of ["/limited", "/other-limit"]) route(router, d, { ...base, method: "get", path, rateLimit: perMinute(3), handler: () => Promise.resolve({ ok: true }) });
    route(router, d, { ...base, method: "post", path: "/body", handler: ({ body }) => Promise.resolve(body) });
    route(router, d, { ...base, method: "get", path: "/boom", handler: () => Promise.reject(new Error("boom")) });
    route(router, d, { ...base, method: "get", path: "/db/:code", handler: ({ req }) => Promise.reject(Object.assign(new Error("db"), { code: req.params.code })) });
    route(router, d, { ...base, method: "get", path: "/teapot", handler: () => Promise.reject(new HttpError(418, "Tea", { "X-Tea": "yes" })) });
    for (const method of ["put", "get"] as const) route(router, d, { ...base, method, path: "/multi/:id", handler: () => Promise.resolve(null) });
  });
  return { app, logs };
}
const token = () => signAccessToken({ sub: user.email, role: "admin" }, env.JWT_SECRET_KEY, 60, now);

test.each([undefined, "Basic secret", "bearer secret"])("missing/non-Bearer Authorization: %s", async (authorization) => {
  const req = request(setup().app).get("/protected");
  if (authorization !== undefined) req.set("Authorization", authorization);
  const r = await req;
  expect(r.status).toBe(401);
  expect(r.body).toEqual({ detail: "Not authenticated" });
  expect(r.headers["www-authenticate"]).toBe("Bearer");
});
test("valid token loads the current user", async () => {
  const r = await request(setup().app).get("/protected").auth(await token(), { type: "bearer" });
  expect(r.status).toBe(200);
  expect(r.body).toEqual({ email: user.email });
});
test.each([
  { current: null, status: 401, detail: "Kimlik doğrulanamadı" },
  { current: { ...user, is_active: false }, status: 401, detail: "Hesap aktif değil" },
  { current: { ...user, status: "pending" }, status: 403, detail: "Hesabınız henüz onaylanmadı" },
])("current user authorization: $detail", async ({ current, status, detail }) => {
  const r = await request(setup({ user: current }).app).get("/protected").auth(await token(), { type: "bearer" });
  expect(r.status).toBe(status);
  expect(r.body).toEqual({ detail });
  expect(r.headers["www-authenticate"]).toBe(status === 401 ? "Bearer" : undefined);
});
test("token errors preserve all four messages and Bearer challenge", async () => {
  const { SignJWT } = await import("jose");
  const noSub = await new SignJWT({ role: "admin", exp: 4102444800 }).setProtectedHeader({ alg: "HS256" }).sign(new TextEncoder().encode(env.JWT_SECRET_KEY));
  const expired = await signAccessToken({ sub: user.email, role: "admin" }, env.JWT_SECRET_KEY, 0, now);
  const wrongKey = await signAccessToken({ sub: user.email, role: "admin" }, "other-secret-other-secret", 60, now);
  for (const [value, detail] of [
    ["abc", "Token geçersiz veya süresi dolmuş: Not enough segments"],
    [expired, "Token geçersiz veya süresi dolmuş: Signature has expired."],
    [wrongKey, "Token geçersiz veya süresi dolmuş: Signature verification failed."],
    [noSub, "Token doğrulama hatası: 401: Token içinde email bilgisi eksik"],
  ] as const) {
    const r = await request(setup().app).get("/protected").auth(value, { type: "bearer" });
    expect(r.status).toBe(401);
    expect(r.body).toEqual({ detail });
    expect(r.headers["www-authenticate"]).toBe("Bearer");
  }
});
test("rate limit: 4th request is 429, counters are per-route and per-IP", async () => {
  const { app } = setup();
  for (let i = 0; i < 3; i++) expect((await request(app).get("/limited").set("X-Forwarded-For", "192.0.2.1")).status).toBe(200);
  const r = await request(app).get("/limited").set("X-Forwarded-For", "192.0.2.1");
  expect(r.status).toBe(429);
  expect(r.body).toEqual({ error: "Rate limit exceeded: 3 per 1 minute" });
  expect(r.headers["x-ratelimit-limit"]).toBeUndefined();
  expect(r.headers["ratelimit-limit"]).toBeUndefined();
  expect((await request(app).get("/other-limit").set("X-Forwarded-For", "192.0.2.1")).status).toBe(200);
  expect((await request(app).get("/limited").set("X-Forwarded-For", "192.0.2.2")).status).toBe(200);
  expect(perHour(5)).toEqual({ limit: 5, windowMs: 3600000, label: "5 per 1 hour" });
});
test("RATELIMIT_ENABLED=false allows 20 requests", async () => {
  const { app } = setup({ enabled: false });
  for (let i = 0; i < 20; i++) expect((await request(app).get("/limited")).status).toBe(200);
});
test("unknown path is JSON 404; known path unsupported method is 405 with Allow", async () => {
  const { app } = setup();
  const missing = await request(app).get("/missing");
  expect(missing.status).toBe(404);
  expect(missing.body).toEqual({ detail: "Not Found" });
  for (const path of ["/health", "/multi/3", "/multi/3/"]) {
    const r = await request(app).post(path);
    expect(r.status).toBe(405);
    expect(r.body).toEqual({ detail: "Method Not Allowed" });
    expect(r.headers.allow).toBe(path === "/health" ? "GET" : "GET, PUT");
  }
});
test("body >2 MB is 413 for JSON and form", async () => {
  const { app } = setup();
  for (const type of ["application/json", "application/x-www-form-urlencoded"]) {
    const r = await request(app).post("/body").set("Content-Type", type).send(type === "application/json" ? JSON.stringify({ a: "x".repeat(2 * 1024 * 1024) }) : `a=${"x".repeat(2 * 1024 * 1024)}`);
    expect(r.status).toBe(413);
    expect(r.body).toEqual({ detail: "İstek gövdesi çok büyük" });
  }
});
test("malformed JSON is FastAPI 422", async () => {
  const r = await request(setup().app).post("/body").set("Content-Type", "application/json").send("{");
  expect(r.status).toBe(422);
  expect(r.body).toEqual({ detail: [{ type: "json_invalid", loc: ["body"], msg: "JSON decode error", input: {} }] });
});
test.each([
  ["23505", 409, "Kayıt zaten mevcut"],
  ["23503", 409, "Kayıt başka kayıtlar tarafından kullanıldığı için işlem tamamlanamadı"],
  ["57014", 503, "Veritabanı zaman aşımı"],
] as const)("PG %s maps to %i", async (code, status, detail) => {
  const r = await request(setup().app).get(`/db/${code}`);
  expect(r.status).toBe(status);
  expect(r.body).toEqual({ detail });
});
test("unexpected error includes CORS headers and logs a stack", async () => {
  const { app, logs } = setup();
  const r = await request(app).get("/boom").set("Origin", "https://macsclub.com.tr");
  expect(r.status).toBe(500);
  expect(r.body).toEqual({ detail: "Internal Server Error" });
  expect(r.headers["access-control-allow-origin"]).toBe("https://macsclub.com.tr");
  expect(r.headers["access-control-allow-credentials"]).toBe("true");
  const error = logs.find((entry) => entry.level === 50);
  const err = error?.err as { message: string; stack: string } | undefined;
  expect(err?.message).toBe("boom");
  expect(err?.stack).toContain("Error: boom");
});
test("HttpError headers are emitted with a single detail envelope", async () => {
  const r = await request(setup().app).get("/teapot");
  expect(r.status).toBe(418);
  expect(r.body).toEqual({ detail: "Tea" });
  expect(r.headers["x-tea"]).toBe("yes");
});
test("every response carries security headers and validated request ID", async () => {
  const { app } = setup();
  for (const path of ["/health", "/missing", "/boom", "/protected"]) {
    const r = await request(app).get(path).set("X-Request-Id", "Request_1.a-b");
    expect(r.headers["x-request-id"]).toBe("Request_1.a-b");
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
    expect(r.headers["x-frame-options"]).toBe("DENY");
    expect(r.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(r.headers["permissions-policy"]).toBe("geolocation=(), microphone=(), camera=()");
    expect(r.headers["strict-transport-security"]).toBeUndefined();
  }
  for (const id of ["has spaces", "x".repeat(65), ""]) {
    const r = await request(app).get("/health").set("X-Request-Id", id);
    expect(r.headers["x-request-id"] as string).toMatch(/^[0-9a-f-]{36}$/);
  }
  expect((await request(app).get("/health").set("X-Request-Id", "a".repeat(64))).headers["x-request-id"]).toBe("a".repeat(64));
  expect((await request(app).get("/health")).headers["x-request-id"] as string).toMatch(/^[0-9a-f-]{36}$/);
  const secure = await request(app).get("/health").set("X-Forwarded-Proto", "https");
  expect(secure.headers["strict-transport-security"]).toBe("max-age=31536000; includeSubDomains");
});
test("request completion logs exactly one line with correlation fields", async () => {
  const { app, logs } = setup();
  const r = await request(app).get("/health?secret=hidden").set("X-Request-Id", "log-id");
  expect(r.status).toBe(200);
  expect(logs).toHaveLength(1);
  expect(logs[0]?.reqId).toBe("log-id");
  expect(logs[0]?.method).toBe("GET");
  expect(logs[0]?.path).toBe("/health");
  expect(logs[0]?.status).toBe(200);
  expect(typeof logs[0]?.ms).toBe("number");
  expect(logs[0]?.ms as number).toBeGreaterThanOrEqual(0);
  expect(JSON.stringify(logs)).not.toContain("hidden");
});
test("CORS allows configured origins, rejects others, preflight is 200", async () => {
  const { app } = setup();
  const allowed = await request(app).get("/health").set("Origin", "https://macsclub.com.tr");
  expect(allowed.headers["access-control-allow-origin"]).toBe("https://macsclub.com.tr");
  expect(allowed.headers["access-control-allow-credentials"]).toBe("true");
  const denied = await request(app).get("/health").set("Origin", "https://evil.invalid");
  expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
  const preflight = await request(app).options("/body").set("Origin", "https://macsclub.com.tr").set("Access-Control-Request-Method", "POST");
  expect(preflight.status).toBe(200);
  expect(preflight.headers["access-control-max-age"]).toBe("600");
  expect(preflight.headers["x-request-id"]).toBeDefined();
});
