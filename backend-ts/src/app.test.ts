import { expect, test } from "bun:test";
import request from "../test/helpers/http";
import { createApp } from "./app";
import { parseEnv } from "./config/env";
import { testDeps } from "../test/helpers/app";

const env = parseEnv({ DATABASE_URL: "postgresql://u:p@db:5432/x", JWT_SECRET_KEY: "x".repeat(32), NODE_ENV: "test" });
const app = createApp(testDeps({ env }));

test("GET / returns welcome", async () => {
  const response = await request(app).get("/");
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ message: "MACS Kulubu Web Sitesine hosgeldiniz!" });
});

test("GET /health", async () => {
  const response = await request(app).get("/health");
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: "ok" });
});

test("system responses omit framework and automatic cache headers", async () => {
  const response = await request(app).get("/health");
  expect(response.headers["x-powered-by"]).toBeUndefined();
  expect(response.headers.etag).toBeUndefined();
});

test("Hono fetch shell ignores forwarded spoofing", async () => {
  expect(typeof app.fetch).toBe("function");
  const response = await app.request("/health", { headers: { "X-Forwarded-For": "192.0.2.10" } });
  expect(response.status).toBe(200);
  expect(response.headers.get("Server")).toBeNull();
});

test("global and write limiters use real IP and run before route parsing", async () => {
  const deps = testDeps({ env: { ...env, RATELIMIT_ENABLED: true }, security: { globalRateLimit: { ratePerMin: 1, burst: 2 }, writeRateLimit: { ratePerMin: 1, burst: 1 } } });
  const app = createApp(deps);
  const first = await request(app).get("/health").set("X-Forwarded-For", "192.0.2.1");
  expect(first.status).toBe(200);
  expect((await request(app).get("/health").set("X-Forwarded-For", "192.0.2.2")).status).toBe(200);
  expect((await request(app).get("/health").set("X-Forwarded-For", "192.0.2.3")).status).toBe(429);
  expect((await request(app).get("/health").set("X-Real-IP", "192.0.2.3")).status).toBe(200);
  const write = await request(app).post("/auth/register").set("X-Real-IP", "192.0.2.4").type("application/json").send("{");
  expect(write.status).toBe(422);
  const limited = await request(app).post("/auth/register").set("X-Real-IP", "192.0.2.4").send({});
  expect(limited.status).toBe(429);
  expect(limited.body).toEqual({ error: "Rate limit exceeded: 1 per 1 minute" });
  await deps.sql.end();
});
test("handler timeout returns JSON 503 with CORS and security headers", async () => {
  const deps = testDeps({ env, security: { handlerTimeoutMs: 5 } });
  const app = createApp(deps, app => { app.get("/slow", async c => { await new Promise(resolve => setTimeout(resolve, 30)); return c.json({ ok: true }); }); });
  const response = await request(app).get("/slow").set("Origin", env.CORS_ORIGINS[0] ?? "");
  expect(response.status).toBe(503); expect(response.body).toEqual({ detail: "Service Unavailable" });
  expect(response.headers["access-control-allow-origin"]).toBe(env.CORS_ORIGINS[0]);
  expect(response.headers["content-security-policy"]).toBe("default-src 'none'; frame-ancestors 'none'");
  await deps.sql.end();
});
test("production docs are disabled by default, and an explicit override enables them", async () => {
  for (const enabled of [false, true]) {
    const production = parseEnv({ DATABASE_URL: env.DATABASE_URL, JWT_SECRET_KEY: env.JWT_SECRET_KEY, NODE_ENV: "production", ...(enabled ? { DOCS_ENABLED: "true" } : {}) });
    const deps = testDeps({ env: production }); const app = createApp(deps);
    for (const path of ["/docs", "/docs/", "/openapi.json"]) {
      const response = await request(app).get(path);
      expect(response.status).toBe(enabled ? path === "/docs" ? 301 : 200 : 404);
    }
    await deps.sql.end();
  }
});
