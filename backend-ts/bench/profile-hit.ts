/** Isolated steady-state costs; medians of seven rounds, not additive CPU attribution. */
import { Hono } from "hono";
import pino from "pino";
import { validateRequestHead, withHandlerTimeout } from "../src/security/request-guards";
import { DEFAULT_SECURITY_CONFIG } from "../src/security/config";
import { applySecurityHeaders } from "../src/security/headers";
import { resolveClientIp } from "../src/security/ip";
import { createTokenBucketLimiter } from "../src/security/rate-limit";
import { cacheKey, createResponseCache, selectEncoding, toCachedResponse } from "../src/lib/cache";
import { createCors } from "../src/middleware/cors";
import { canonicalizeApiPath } from "../src/app";
import { parseEnv } from "../src/config/env";

const req = new Request("http://localhost/members", { headers: { host: "localhost", accept: "*/*", "accept-encoding": "gzip, br", "user-agent": "oha/1.17.0" } });
const headers = new Headers();
const value = toCachedResponse(200, JSON.stringify(Array.from({ length: 14 }, (_, id) => ({ id, name: "Member" }))));
const dest = pino.destination({ dest: "/dev/null", sync: true });
const logger = pino({ level: "info" }, dest);
const cache = createResponseCache();
cache.set("/members?", "members", value);
const loader = () => Promise.resolve({ status: 200, bodyText: "[]", cacheable: true });
const limiter = () => createTokenBucketLimiter({ ratePerMin: 1e12, burst: 1e12, maxIps: 50000, now: Date.now, label: "profile" });
const global = limiter(), writes = limiter();
const bare = new Hono({ getPath: canonicalizeApiPath }).get("/members", c => c.body(null));
const cors = new Hono({ getPath: canonicalizeApiPath });
cors.use("*", createCors(parseEnv({ DATABASE_URL: "postgresql://localhost/profile", JWT_SECRET_KEY: "profile-only-secret-at-least-32-characters" })));
cors.get("/members", c => c.body(null));
const bufferedDest = pino.destination({ dest: "/dev/null", sync: false, minLength: 4096, periodicFlush: 1000 });
await new Promise<void>(resolve => { bufferedDest.once("ready", resolve); });
const bufferedLogger = pino({ level: "info" }, bufferedDest);
const jobs: Record<string, () => unknown> = {
  "completion logging (sync pino /dev/null)": () => { logger.info({ reqId: "request", method: "GET", path: "/members", status: 200, ms: 0.1 }, "Request completed"); },
  "completion logging (buffered pino /dev/null)": () => { bufferedLogger.info({ reqId: "request", method: "GET", path: "/members", status: 200, ms: 0.1 }, "Request completed"); },
  "request id (randomUUID)": () => crypto.randomUUID(),
  "validateRequestHead (4 headers)": () => { validateRequestHead(req, "/members", DEFAULT_SECURITY_CONFIG); },
  "security headers": () => { applySecurityHeaders(headers, { isDocs: false }); },
  "client IP": () => resolveClientIp(req.headers, "127.0.0.1"),
  "global token bucket": () => { global.consume("127.0.0.1"); },
  "write token bucket (not used on GET)": () => { writes.consume("127.0.0.1"); },
  "cache key": () => cacheKey("/members", {}),
  "encoding negotiation": () => selectEncoding("gzip, br"),
  "ETag match": () => 'W/"abc"'.replace(/^W\//, "") === value.etag.replace(/^W\//, ""),
  "cache lookup metadata + warmup touch": () => cache.getOrLoad("/members?", "members", loader),
  "Response construction": () => new Response(value.raw as Uint8Array<ArrayBuffer>, { headers: { "content-type": "application/json", "content-length": String(value.raw.length) } }),
  "Hono route + canonical path + Response": () => bare.fetch(req),
  "Hono route + CORS + Response": () => cors.fetch(req),
  "handler timeout": () => withHandlerTimeout(15000, () => Promise.resolve()),
};
const results = [];
for (const [name, run] of Object.entries(jobs)) {
  const rounds = [];
  for (let round = 0; round < 8; round++) {
    const start = performance.now();
    for (let i = 0; i < 20000; i++) await run();
    if (round) rounds.push((performance.now() - start) * 1000 / 20000);
  }
  rounds.sort((a, b) => a - b);
  results.push({ name, medianUs: rounds[3], minUs: rounds[0], maxUs: rounds[6] });
}
bufferedDest.flushSync(); bufferedDest.end();
dest.flushSync(); dest.end(); cache.stop();
console.log(JSON.stringify({ bun: Bun.version, iterations: 20000, rounds: 7, results: results.sort((a, b) => (b.medianUs ?? 0) - (a.medianUs ?? 0)) }, null, 2));
