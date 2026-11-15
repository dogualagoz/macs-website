import { describe, expect, test } from "bun:test";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import pino from "pino";
import { DEFAULT_SECURITY_CONFIG as config } from "./config";
import { resolveClientIp } from "./ip";
import { createTokenBucketLimiter, createFixedWindowLimiter, perMinute, perHour, routeRateLimit } from "./rate-limit";
import { createLoginShield } from "./login-shield";
import { applySecurityHeaders } from "./headers";
import { limitBodySize, readBoundedBody, validateRequestHead, withHandlerTimeout } from "./request-guards";
import { logSecurityEvent } from "./security-log";
import { HttpError } from "../lib/http-error";

function status(run: () => void, code: number) {
  try { run(); throw new Error("Expected rejection"); } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(code);
  }
}
async function rejected(promise: Promise<unknown>): Promise<Error> {
  try { await promise; } catch (error) { return error as Error; }
  throw new Error("Expected rejection");
}
const request = (headers?: Headers) => new Request("http://localhost/", headers === undefined ? {} : { headers });
describe("security primitives", () => {
  test("exact defaults", () => {
    expect(config).toEqual({ globalRateLimit: { ratePerMin: 1200, burst: 200 }, writeRateLimit: { ratePerMin: 60, burst: 60 }, maxTrackedIps: 50_000, loginIpLimit: { maxAttempts: 20, windowMs: 900_000 }, maxUrlLength: 2048, maxHeaderCount: 100, maxHeaderBytes: 16_384, maxBodyBytes: 2 * 1024 * 1024, uploadOverheadBytes: 262_144, idleTimeoutSec: 10, handlerTimeoutMs: 15_000 });
  });
  test("single hop X-Real-IP only from private/loopback/test sockets", () => {
    for (const ip of ["127.0.0.1", "172.18.0.1", "10.0.0.1", "192.168.1.1", "::1", undefined]) {
      expect(resolveClientIp(new Headers({ "X-Real-IP": "203.0.113.5", "X-Forwarded-For": "9.9.9.9" }), ip)).toBe("203.0.113.5");
    }
    for (const value of ["1.2.3.4, 5.6.7.8", "bad", "1.2.3.4:80", "999.1.1.1"]) expect(resolveClientIp(new Headers({ "X-Real-IP": value }), "127.0.0.1")).toBe("127.0.0.1");
    expect(resolveClientIp(new Headers({ "X-Real-IP": "203.0.113.5" }), "198.51.100.2")).toBe("198.51.100.2");
    expect(resolveClientIp(new Headers({ "X-Forwarded-For": "9.9.9.9" }), undefined)).toBe("unknown");
    expect(resolveClientIp(new Headers({ "X-Real-IP": "2001:db8::1" }), "::1")).toBe("2001:db8::1");
  });
  test("token burst, fractional refill, cap, and LRU touch", () => {
    let now = 0;
    const limiter = createTokenBucketLimiter({ ratePerMin: 300, burst: 60, maxIps: 5, now: () => now, label: "global" });
    for (let i = 0; i < 60; i++) limiter.consume("a");
    status(() => { limiter.consume("a"); }, 429);
    try { limiter.consume("a"); } catch (e) { expect((e as HttpError).detail).toEqual({ error: "Rate limit exceeded: global" }); }
    now = 199; status(() => { limiter.consume("a"); }, 429);
    now = 200; limiter.consume("a");
    now = 1200; for (let i = 0; i < 5; i++) limiter.consume("a");
    status(() => { limiter.consume("a"); }, 429);
    for (let i = 0; i < 8; i++) limiter.consume(String(i));
    expect(limiter.size()).toBe(5);
    const small = createTokenBucketLimiter({ ratePerMin: 60, burst: 1, maxIps: 2, now: () => now, label: "write" });
    small.consume("a"); small.consume("b"); status(() => { small.consume("a"); }, 429); small.consume("c");
    status(() => { small.consume("a"); }, 429); small.consume("b");
  });
  test("fixed windows reset at boundary and remain bounded", () => {
    let now = 0;
    const limiter = createFixedWindowLimiter({ ...perMinute(2), maxIps: 2, now: () => now });
    limiter.consume("a"); limiter.consume("a"); status(() => { limiter.consume("a"); }, 429);
    now = 59_999; status(() => { limiter.consume("a"); }, 429);
    now++; limiter.consume("a"); limiter.consume("b"); limiter.consume("c"); expect(limiter.size()).toBe(2);
    expect(perHour(3)).toEqual({ limit: 3, windowMs: 3_600_000, label: "3 per 1 hour" });
  });
  test("login check precedes DB: twenty failures allowed, next blocked; window resets", () => {
    let now = 0;
    const shield = createLoginShield({ ...config.loginIpLimit, maxIps: 5, now: () => now });
    for (let i = 0; i < 20; i++) { shield.check("a"); shield.recordFailure("a"); }
    status(() => { shield.check("a"); }, 429);
    now = 899_999; status(() => { shield.check("a"); }, 429);
    now++; shield.check("a");
    for (let i = 0; i < 8; i++) shield.recordFailure(String(i));
    expect(shield.size()).toBe(5);
  });
  test("login LRU checks refresh recency; successful checks do not count as failures", () => {
    const shield = createLoginShield({ maxAttempts: 1, windowMs: 100, maxIps: 2, now: () => 0 });
    shield.check("a"); shield.check("a"); shield.recordFailure("a"); shield.recordFailure("b");
    status(() => { shield.check("a"); }, 429);
    shield.recordFailure("c"); status(() => { shield.check("a"); }, 429);
    shield.check("b"); expect(shield.size()).toBe(2);
  });
  test("clean login probes cannot allocate entries or evict a blocked IP", () => {
    const shield = createLoginShield({ maxAttempts: 20, windowMs: 900_000, maxIps: 2, now: () => 0 });
    for (let i = 0; i < 20; i++) shield.recordFailure("blocked");
    for (let i = 0; i < 100; i++) shield.check(`clean-${String(i)}`);
    expect(shield.size()).toBe(1);
    status(() => { shield.check("blocked"); }, 429);
  });
  test("checking an expired login entry deletes it without allocating a replacement", () => {
    let now = 0;
    const shield = createLoginShield({ maxAttempts: 1, windowMs: 100, maxIps: 2, now: () => now });
    shield.check("clean"); expect(shield.size()).toBe(0);
    shield.recordFailure("a"); now = 99;
    status(() => { shield.check("a"); }, 429);
    now = 100; shield.check("a"); expect(shield.size()).toBe(0);
    shield.recordFailure("a"); status(() => { shield.check("a"); }, 429);
  });
  test("headers: API/docs policies, exact HTTPS only, remove disclosure", () => {
    for (const proto of [undefined, null, "http", "https,http", "HTTPS", "https"]) {
      const headers = new Headers({ Server: "Bun", "X-Powered-By": "Hono", "Strict-Transport-Security": "stale" });
      applySecurityHeaders(headers, { forwardedProto: proto, isDocs: false });
      expect(headers.get("Content-Security-Policy")).toBe("default-src 'none'; frame-ancestors 'none'");
      expect(headers.get("Strict-Transport-Security")).toBe(proto === "https" ? "max-age=31536000; includeSubDomains" : null);
      for (const [key, value] of Object.entries({ "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "strict-origin-when-cross-origin", "Permissions-Policy": "geolocation=(), microphone=(), camera=()", "Cross-Origin-Resource-Policy": "same-site", "Cross-Origin-Opener-Policy": "same-origin" })) expect(headers.get(key)).toBe(value);
      expect(headers.has("Server")).toBe(false); expect(headers.has("X-Powered-By")).toBe(false);
    }
    const headers = new Headers(); applySecurityHeaders(headers, { isDocs: true });
    expect(headers.get("Content-Security-Policy")).toContain("script-src 'self'");
    expect(headers.get("Content-Security-Policy")).not.toContain("https:");
  });
  test("raw path/method guards and exact URL length boundary", () => {
    for (const method of ["TRACE", "CONNECT"]) status(() => { validateRequestHead({ method } as Request, "/", config); }, 405);
    for (const path of ["/../a", "/%2e%2e/a", "/.%2E/a", "/a\0", "/%00", "/%252e%252e/a"]) status(() => { validateRequestHead(request(), path, config); }, 400);
    validateRequestHead(request(), "/" + "a".repeat(2047), config);
    status(() => { validateRequestHead(request(), "/" + "a".repeat(2048), config); }, 414);
    validateRequestHead(request(), "/ok?search=..", config);
  });
  test("header count/UTF8 bytes boundaries (wire name + colon-space + CRLF)", () => {
    const headers = new Headers(); for (let i = 0; i < 100; i++) headers.set(`x-${String(i)}`, "v");
    validateRequestHead(request(headers), "/", config); headers.set("extra", "v"); status(() => { validateRequestHead(request(headers), "/", config); }, 431);
    validateRequestHead(request(new Headers({ x: "a".repeat(16_379) })), "/", config);
    status(() => { validateRequestHead(request(new Headers({ x: "a".repeat(16_380) })), "/", config); }, 431);
    status(() => { validateRequestHead(request(new Headers({ x: "é".repeat(8190) })), "/", config); }, 431);
  });
  test("bounded reader accepts exact/empty and cancels chunked overflow immediately", async () => {
    expect(await readBoundedBody(request(), 4)).toEqual(new Uint8Array());
    expect(await readBoundedBody(new Request("http://localhost", { method: "POST", body: "1234" }), 4)).toEqual(new TextEncoder().encode("1234"));
    let cancelled = false; let pulls = 0;
    const stream = new ReadableStream<Uint8Array>({ pull(c) { pulls++; c.enqueue(new Uint8Array(3)); }, cancel() { cancelled = true; } }, { highWaterMark: 0 });
    expect(await rejected(readBoundedBody(new Request("http://localhost", { method: "POST", body: stream }), 4))).toMatchObject({ status: 413, detail: "İstek gövdesi çok büyük" });
    expect(cancelled).toBe(true); expect(pulls).toBe(2);
  });
  test("overflow remains 413 even if producer cancellation fails", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(c) { c.enqueue(new Uint8Array(5)); },
      cancel() { throw new Error("producer failure"); },
    });
    expect(await rejected(readBoundedBody(new Request("http://localhost", { method: "POST", body }), 4))).toMatchObject({ status: 413 });
  });
  test("dishonest small Content-Length cannot bypass streaming cap", async () => {
    expect(await rejected(readBoundedBody(new Request("http://localhost", { method: "POST", body: "12345", headers: { "Content-Length": "1" } }), 4))).toMatchObject({ status: 413 });
  });
  test("Content-Length over limit rejected without pulling", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
    expect(await rejected(readBoundedBody(new Request("http://localhost", { method: "POST", body, headers: { "Content-Length": "5" } }), 4))).toMatchObject({ status: 413 });
    expect(cancelled).toBe(true);
  });
  test("body middleware preserves JSON/form validators, default cap, and 413", async () => {
    for (const kind of ["json", "form"] as const) {
      const app = new OpenAPIHono();
      app.onError((e, c) => c.json({ detail: e.message }, e instanceof HttpError && e.status === 413 ? 413 : 500));
      if (kind === "json") app.openapi(createRoute({ method: "post", path: "/", middleware: [limitBodySize()] as const, request: { body: { content: { "application/json": { schema: z.object({ name: z.string() }) } }, required: true } }, responses: { 200: { description: "ok" } } }), (c) => c.json(c.req.valid("json")));
      else app.openapi(createRoute({ method: "post", path: "/", middleware: [limitBodySize()] as const, request: { body: { content: { "application/x-www-form-urlencoded": { schema: z.object({ name: z.string() }) } }, required: true } }, responses: { 200: { description: "ok" } } }), (c) => c.json(c.req.valid("form")));
      const headers = { "Content-Type": kind === "json" ? "application/json" : "application/x-www-form-urlencoded" };
      const result = await app.request("/", { method: "POST", headers, body: kind === "json" ? '{"name":"Ada"}' : "name=Ada" });
      expect(result.status).toBe(200); expect(await result.json()).toEqual({ name: "Ada" });
      expect((await app.request("/", { method: "POST", headers, body: "a".repeat(config.maxBodyBytes + 1) })).status).toBe(413);
    }
  });
  test("handler timeout succeeds, propagates errors, and returns 503", async () => {
    expect(await withHandlerTimeout(100, () => Promise.resolve(42))).toBe(42);
    expect(await rejected(withHandlerTimeout(100, () => Promise.reject(new Error("original"))))).toMatchObject({ message: "original" });
    expect(await rejected(withHandlerTimeout(1, () => new Promise(() => {})))).toMatchObject({ status: 503, detail: "Service Unavailable" });
  });
  test("security logger allowlists fields and removes query/secret path segments", () => {
    let output = "";
    const logger = pino({ base: null, timestamp: false }, { write(chunk: string) { output += chunk; } });
    const event = { kind: "rate_limit" as const, ip: "203.0.113.5", path: "/users/person@example.com?password=secret&token=abc", method: "POST", status: 429, body: "secret", password: "secret", token: "abc", email: "person@example.com" };
    logSecurityEvent(logger, event);
    expect(output.trim().split("\n")).toHaveLength(1);
    expect(JSON.parse(output)).toMatchObject({ event: "security", kind: "rate_limit", ip: "203.0.113.5", path: "/users/:redacted", method: "POST", status: 429 });
    for (const secret of ["password", "token", "email", "secret", "person@", "body"]) expect(output).not.toContain(secret);
  });
  test("security logs retain actual static routes and redact ids and free text", () => {
    const paths: [string, string][] = [
      ["/auth/register", "/auth/register"],
      ["/api/upload/", "/api/upload/"],
      ["/api/upload/download-all", "/api/upload/download-all"],
      ["/users/42/access", "/users/:redacted/access"],
      ["/users/me/change-password", "/users/me/change-password"],
      ["/events/by-slug/free-text-title", "/events/by-slug/:redacted"],
      ["/projects/categories/17", "/projects/categories/:redacted"],
      ["/projects/17/hard", "/projects/:redacted/hard"],
      ["/members/leaderboard", "/members/leaderboard"],
      ["/members/17/stats", "/members/:redacted/stats"],
      ["/sponsors/geocode", "/sponsors/geocode"],
    ];
    for (const [path, expected] of paths) {
      let output = "";
      const logger = pino({ base: null, timestamp: false }, { write(chunk: string) { output += chunk; } });
      logSecurityEvent(logger, { kind: "rate_limit", ip: "203.0.113.5", path, method: undefined, status: undefined });
      expect(JSON.parse(output)).toEqual({ level: 40, event: "security", kind: "rate_limit", ip: "203.0.113.5", path: expected });
    }
  });
  test("Hono route limit slowapi JSON and disable switch", async () => {
    for (const enabled of [true, false]) {
      const app = new OpenAPIHono();
      app.use("*", routeRateLimit({ env: { RATELIMIT_ENABLED: enabled } }, perMinute(1)));
      app.get("/", (c) => c.text("ok"));
      expect((await app.request("/")).status).toBe(200);
      const res = await app.request("/"); expect(res.status).toBe(enabled ? 429 : 200);
      if (enabled) expect(await res.text()).toBe('{"error":"Rate limit exceeded: 1 per 1 minute"}');
    }
  });
});
