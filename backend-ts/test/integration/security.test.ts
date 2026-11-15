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

async function sendRawHttp(port: number, rawRequest: string): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  const raw = await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks).toString("utf8"));
    };
    const socket = connect(port, "127.0.0.1", () => { socket.write(rawRequest); });
    socket.setTimeout(3000, () => { socket.destroy(); reject(new Error("Raw HTTP request timed out")); });
    socket.on("data", chunk => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      const buf = Buffer.concat(chunks);
      const sep = buf.indexOf("\r\n\r\n");
      if (sep < 0) return;
      const head = buf.subarray(0, sep).toString("utf8");
      const lenMatch = /\r\nContent-Length:\s*(\d+)/i.exec(head);
      if (lenMatch?.[1] !== undefined && buf.length >= sep + 4 + Number(lenMatch[1])) {
        socket.end();
        finish();
      }
    });
    socket.on("end", finish);
    socket.on("error", reject);
  });
  const [head = "", body = ""] = raw.split("\r\n\r\n", 2);
  const [statusLine = "", ...headerLines] = head.split("\r\n");
  const statusMatch = /^HTTP\/1\.\d\s+(\d{3})/.exec(statusLine);
  const headers: Record<string, string> = {};
  for (const line of headerLines) {
    const colon = line.indexOf(":");
    if (colon > 0) headers[line.slice(0, colon).trim().toLowerCase()] = line.slice(colon + 1).trim();
  }
  return { status: Number(statusMatch?.[1] ?? 0), headers, body };
}
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
test("socket IP ignores XFF; loopback real-IP splits global/write buckets and LRU eviction resets only evicted IPs", async () => {
  const s = setup({
    now: () => new Date(1_000_000),
    security: { globalRateLimit: { ratePerMin: 1, burst: 2 }, writeRateLimit: { ratePerMin: 1, burst: 1 }, maxTrackedIps: 3 },
  });
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
  } finally { await s.server.stop(true); }

  const lru = setup({
    now: () => new Date(1_000_000),
    security: { globalRateLimit: { ratePerMin: 1, burst: 2 }, writeRateLimit: { ratePerMin: 1, burst: 1 }, maxTrackedIps: 3 },
  });
  try {
    for (const ip of ["198.51.100.1", "198.51.100.2"]) {
      expect((await lru.send("/health", { headers: { "X-Real-IP": ip } })).status).toBe(200);
      expect((await lru.send("/health", { headers: { "X-Real-IP": ip } })).status).toBe(200);
      expect((await lru.send("/health", { headers: { "X-Real-IP": ip } })).status).toBe(429);
    }
    // Insert .3 (LRU->MRU: .1, .2, .3), touch .2 so .1 is oldest, then insert .4 to evict .1.
    expect((await lru.send("/health", { headers: { "X-Real-IP": "198.51.100.3" } })).status).toBe(200);
    expect((await lru.send("/health", { headers: { "X-Real-IP": "198.51.100.2" } })).status).toBe(429);
    expect((await lru.send("/health", { headers: { "X-Real-IP": "198.51.100.4" } })).status).toBe(200);
    // Retained .2 still has an exhausted bucket; evicted .1 gets a fresh burst=2 bucket.
    expect((await lru.send("/health", { headers: { "X-Real-IP": "198.51.100.2" } })).status).toBe(429);
    expect((await lru.send("/health", { headers: { "X-Real-IP": "198.51.100.1" } })).status).toBe(200);
    expect((await lru.send("/health", { headers: { "X-Real-IP": "198.51.100.1" } })).status).toBe(200);
    expect((await lru.send("/health", { headers: { "X-Real-IP": "198.51.100.1" } })).status).toBe(429);
  } finally { await lru.server.stop(true); }
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
    const oversizedText = '"' + 'a'.repeat(2 * 1024 * 1024) + '"';
    for (const chunked of [false, true]) {
      const body = chunked ? new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(oversizedText)); c.close(); } }) : oversizedText;
      expect((await s.send("/auth/register", { method: "POST", headers: { "Content-Type": "application/json", Connection: "close" }, body })).status).toBe(413);
    }
    const noCloseProbe = await sendRawHttp(
      Number(s.server.port),
      `POST /auth/register HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: ${String(oversizedText.length)}\r\n\r\n${oversizedText}`,
    );
    expect(noCloseProbe.status).toBe(413);
    expect(noCloseProbe.headers["connection"]?.toLowerCase()).toBe("close");
    expect((await sendRawHttp(Number(s.server.port), "GET /health HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n")).status).toBe(200);
    const timeout = await s.send("/slow"); expect(timeout.status).toBe(503); expect(await timeout.json()).toEqual({ detail: "Service Unavailable" });
    for (const kind of ["url_too_long", "body_too_large", "handler_timeout"]) expect(s.logs.some(l => l.event === "security" && l.kind === kind && typeof l.ip === "string" && typeof l.path === "string")).toBe(true);
    expect(s.logs.filter(l => l.kind === "body_too_large")).toHaveLength(3);
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
    const unexpectedLogs = s.logs.filter(l => l.msg === "Unhandled request error");
    expect(unexpectedLogs).toHaveLength(2);
    for (const entry of unexpectedLogs) expect(entry.reqId).toBe("security-request");
    expect((await s.send("/intentional")).status).toBe(500);
    expect(s.logs.filter(l => l.msg === "Unhandled request error")).toHaveLength(2);
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
    const port = Number(s.server.port);
    for (const target of [
      "/events/%2e%2e%2fetc",
      "/uploads/..%2fpackage.json",
      "/static/%00",
      "/events/%252e%252e/etc",
      "/events/foo%5cbar",
      "/bad%ZZ",
    ]) {
      const rawRes = await sendRawHttp(port, `GET ${target} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`);
      expect(rawRes.status).toBe(400);
    }
    for (const rawRequest of [
      "TRACE /health HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n",
      "CONNECT example.com:443 HTTP/1.1\r\nHost: example.com:443\r\nConnection: close\r\n\r\n",
      "CONNECT /health HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n",
    ]) {
      expect((await sendRawHttp(port, rawRequest)).status).toBe(405);
    }
    const headers = { "Content-Type": "application/json" };
    expect((await s.send("/events/bad", { method: "PUT", headers, body: "{" })).status).toBe(401);
    const pending = await tokenFor("pending@example.com", "member");
    expect((await s.send("/events/bad", { method: "PUT", headers: { ...headers, Authorization: `Bearer ${pending}` }, body: "{" })).status).toBe(403);
  } finally { await s.server.stop(true); }
});
