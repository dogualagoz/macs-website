import { afterAll, beforeEach, expect, test } from "bun:test";
import { Writable } from "node:stream";
import { connect } from "node:net";
import { readFile } from "node:fs/promises";
import pino from "pino";
import { createApp } from "../../src/app";
import type { AppDeps } from "../../src/app";
import { parseEnv } from "../../src/config/env";
import { HttpError } from "../../src/lib/http-error";
import { testDeps } from "../helpers/app";
import { seedDb } from "../helpers/db";
import { tokenFor } from "../helpers/auth";
import { createTokenBucketLimiter } from "../../src/security/rate-limit";
import { validateRequestHead } from "../../src/security/request-guards";
import { DEFAULT_SECURITY_CONFIG } from "../../src/security/config";
const database = testDeps();
const seed = await readFile(new URL("../../contract/seed.sql", import.meta.url), "utf8");
beforeEach(async () => { await seedDb(database.sql, seed); });
afterAll(async () => { await database.sql.end(); });
function setup(overrides: Partial<AppDeps> = {}) {
  const logs: Record<string, unknown>[] = [];
  const logger = pino({ level: "info" }, new Writable({ write(chunk: Buffer, _encoding, done) { logs.push(JSON.parse(chunk.toString()) as Record<string, unknown>); done(); } }));
  const deps = testDeps({ db: database.db, sql: database.sql, counter: database.counter, env: { ...database.env, RATELIMIT_ENABLED: true }, logger, ...overrides });
  const app = createApp(deps, app => {
    app.get("/slow", async c => { await Bun.sleep(250); return c.json({ ok: true }); });
    app.get("/intentional", () => { throw new HttpError(500, "Configured failure"); });
    app.get("/unexpected", () => { throw new Error("Unexpected failure"); });
  });
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, idleTimeout: 1, maxRequestBodySize: 8 * 1024 * 1024, fetch: (req, server) => app.fetch(req, { socketIp: server.requestIP(req)?.address }) });
  const send = (path: string, init?: RequestInit) => fetch(new URL(path, server.url), { ...init, redirect: "manual" });
  return { deps, app, server, send, logs };
}
test("socket IP ignores XFF; loopback real-IP splits global/write buckets and maps stay bounded", async () => {
  const s = setup({ security: { globalRateLimit: { ratePerMin: 1, burst: 2 }, writeRateLimit: { ratePerMin: 1, burst: 1 }, maxTrackedIps: 3 } });
  try {
    for (let i = 0; i < 2; i++) expect((await s.send("/health", { headers: { "X-Forwarded-For": `9.9.9.${String(i)}` } })).status).toBe(200);
    const limited = await s.send("/health", { headers: { "X-Forwarded-For": "9.9.9.9" } }); expect(limited.status).toBe(429); expect(await limited.json()).toHaveProperty("error");
    expect((await s.send("/health", { headers: { "X-Real-IP": "192.0.2.1" } })).status).toBe(200);
    for (const method of ["POST", "PUT", "DELETE"]) {
      const headers = { "X-Real-IP": `192.0.2.${String(method.length)}`, "Content-Type": "application/json" };
      await s.send("/events/bad", { method, headers, body: "{}" });
      expect((await s.send("/events/bad", { method, headers, body: "{}" })).status).toBe(429);
    }
    expect(s.logs.some(l => l.event === "security" && l.kind === "rate_limit" && l.ip === "127.0.0.1")).toBe(true);
    const limiter = createTokenBucketLimiter({ ratePerMin: 1, burst: 2, maxIps: 3, now: () => 0, label: "test" });
    for (let i = 0; i < 50; i++) limiter.consume(String(i)); expect(limiter.size()).toBe(3);
  } finally { await s.server.stop(true); }
});
test("21st failed login blocks before SQL, other IP and account lockout stay independent", async () => {
  let time = Date.now(); const s = setup({ now: () => new Date(time) });
  const login = (ip: string, username: string) => s.send("/auth/login", { method: "POST", headers: { "X-Real-IP": ip }, body: new URLSearchParams({ username, password: "secret-must-not-leak" }) });
  try {
    for (let i = 0; i < 20; i++) { if (i === 10) time += 60001; expect((await login("192.0.2.1", "absent@example.com")).status).toBe(401); }
    time += 60001; s.deps.counter.reset(); expect((await login("192.0.2.1", "absent@example.com")).status).toBe(429); expect(s.deps.counter.count()).toBe(0);
    expect((await login("192.0.2.2", "absent@example.com")).status).toBe(401);
    for (let i = 0; i < 6; i++) await login("192.0.2.3", "mod@example.com");
    expect(s.logs.some(l => l.kind === "lockout")).toBe(true); expect(s.logs.some(l => l.kind === "login_ip_limit")).toBe(true);
    expect(JSON.stringify(s.logs)).not.toContain("secret-must-not-leak");
  } finally { await s.server.stop(true); }
});
test("size guards, chunked body and handler timeout produce safe security logs", async () => {
  const s = setup({ security: { handlerTimeoutMs: 100 } });
  try {
    expect((await s.send('/' + 'x'.repeat(2048))).status).toBe(414);
    for (const headers of [Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`x-${String(i)}`, "a"])), { "X-Large": "a".repeat(16384) }]) expect((await s.send("/health", { headers })).status).toBe(431);
    for (const chunked of [false, true]) {
      const text = '"' + 'a'.repeat(2 * 1024 * 1024) + '"';
      const body = chunked ? new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(text)); c.close(); } }) : text;
      expect((await s.send("/auth/register", { method: "POST", headers: { "Content-Type": "application/json", Connection: "close" }, body })).status).toBe(413);
    }
    const timeout = await s.send("/slow"); expect(timeout.status).toBe(503); expect(await timeout.json()).toEqual({ detail: "Service Unavailable" });
    for (const kind of ["url_too_long", "body_too_large", "handler_timeout"]) expect(s.logs.some(l => l.event === "security" && l.kind === kind && typeof l.ip === "string" && typeof l.path === "string")).toBe(true);
    expect(s.logs.filter(l => l.kind === "body_too_large")).toHaveLength(2);
  } finally { await s.server.stop(true); }
});
test("idleTimeout closes a stalled keepalive TCP client", async () => {
  const s = setup();
  try {
    await new Promise<void>((resolve, reject) => {
      const socket = connect(Number(s.server.port), "127.0.0.1", () => { socket.write("GET /health HTTP/1.1\r\nHost: localhost\r\nConnection: keep-alive\r\n\r\n"); });
      socket.setTimeout(4000, () => { socket.destroy(); reject(new Error("Idle socket was not closed")); });
      socket.on("data", () => { /* Consume the response, then stall without another request. */ });
      socket.on("error", reject); socket.on("close", () => { resolve(); });
    });
  } finally { await s.server.stop(true); }
});
test("security headers, CORS on successes/errors and intentional error logging", async () => {
  const s = setup();
  try {
    for (const path of ["/health", "/unexpected"]) for (const origin of ["https://macsclub.com.tr", "https://evil.example"]) {
      const r = await s.send(path, { headers: { Origin: origin, "X-Request-ID": "security-request" } });
      expect(r.headers.get("Access-Control-Allow-Origin")).toBe(origin.includes("evil") ? null : origin);
      for (const [key, value] of Object.entries({ "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "strict-origin-when-cross-origin", "Cross-Origin-Resource-Policy": "same-site", "Cross-Origin-Opener-Policy": "same-origin", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'" })) expect(r.headers.get(key)).toBe(value);
      expect(r.headers.has("Permissions-Policy")).toBe(true); expect(r.headers.has("Server")).toBe(false); expect(r.headers.has("X-Powered-By")).toBe(false); expect(r.headers.has("Strict-Transport-Security")).toBe(false);
    }
    expect((await s.send("/health", { headers: { "X-Forwarded-Proto": "https" } })).headers.has("Strict-Transport-Security")).toBe(true);
    expect((await s.send("/docs/")).headers.get("Content-Security-Policy")).toContain("script-src 'self'");
    const before = s.logs.filter(l => l.msg === "Unhandled request error").length;
    expect((await s.send("/intentional")).status).toBe(500);
    expect(s.logs.filter(l => l.msg === "Unhandled request error")).toHaveLength(before);
    expect(s.logs.filter(l => l.msg === "Unhandled request error").every(l => l.reqId === "security-request")).toBe(true);
  } finally { await s.server.stop(true); }
});
test("production docs toggle, path/method sanitation and auth before validation", async () => {
  for (const enabled of [false, true]) {
    const env = parseEnv({ DATABASE_URL: database.env.DATABASE_URL, JWT_SECRET_KEY: database.env.JWT_SECRET_KEY, NODE_ENV: "production", ...(enabled ? { DOCS_ENABLED: "true" } : {}) });
    const s = setup({ env });
    try { for (const path of ["/docs", "/docs/", "/openapi.json"]) expect((await s.send(path)).status).toBe(enabled ? path === "/docs" ? 301 : 200 : 404); } finally { await s.server.stop(true); }
  }
  const s = setup();
  try {
    for (const path of ["/events/%2e%2e%2fetc", "/uploads/..%2fpackage.json", "/static/%00"]) expect((await s.send(path)).status).toBe(400);
    // Fetch URL parsing removes dot segments before Hono sees them; guard the raw target too.
    expect(() => { validateRequestHead(new Request("http://localhost/etc"), "/events/%2e%2e/etc", DEFAULT_SECURITY_CONFIG); }).toThrow();
    for (const method of ["TRACE", "CONNECT"]) expect((await s.app.request("/health", { method })).status).toBe(405);
    const headers = { "Content-Type": "application/json" };
    expect((await s.send("/events/bad", { method: "PUT", headers, body: "{" })).status).toBe(401);
    const pending = await tokenFor("pending@example.com", "member");
    expect((await s.send("/events/bad", { method: "PUT", headers: { ...headers, Authorization: `Bearer ${pending}` }, body: "{" })).status).toBe(403);
  } finally { await s.server.stop(true); }
});
