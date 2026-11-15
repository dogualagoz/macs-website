import type { MiddlewareHandler } from "hono";
import { HttpError } from "../lib/http-error";
import { DEFAULT_SECURITY_CONFIG } from "./config";

export type Role = "admin" | "moderator";
export interface RateLimitSpec { limit: number; windowMs: number; label: string }
export interface IpRateLimiter { consume(ip: string): void; size(): number }
export const perMinute = (n: number): RateLimitSpec => ({ limit: n, windowMs: 60_000, label: `${String(n)} per 1 minute` });
export const perHour = (n: number): RateLimitSpec => ({ limit: n, windowMs: 3_600_000, label: `${String(n)} per 1 hour` });
export function touchLru<T>(map: Map<string, T>, key: string, value: T, maxSize: number): void {
  map.delete(key); map.set(key, value);
  if (map.size > maxSize) {
    const oldest = map.keys().next();
    if (!oldest.done) map.delete(oldest.value);
  }
}
const exceeded = (label: string) => new HttpError(429, { error: `Rate limit exceeded: ${label}` });
export function createTokenBucketLimiter(opts: { ratePerMin: number; burst: number; maxIps: number; now: () => number; label: string }): IpRateLimiter {
  const entries = new Map<string, { tokens: number; at: number }>();
  return {
    size: () => entries.size,
    consume(ip) {
      const now = opts.now();
      const entry = entries.get(ip) ?? { tokens: opts.burst, at: now };
      entry.tokens = Math.min(opts.burst, entry.tokens + Math.max(0, now - entry.at) * opts.ratePerMin / 60_000);
      entry.at = Math.max(entry.at, now);
      touchLru(entries, ip, entry, opts.maxIps);
      if (entry.tokens < 1) throw exceeded(opts.label);
      entry.tokens--;
    },
  };
}
export function createFixedWindowLimiter(opts: RateLimitSpec & { maxIps: number; now: () => number }): IpRateLimiter {
  const entries = new Map<string, { count: number; start: number }>();
  return {
    size: () => entries.size,
    consume(ip) {
      const now = opts.now();
      let entry = entries.get(ip);
      if (!entry || now - entry.start >= opts.windowMs) entry = { count: 0, start: now };
      touchLru(entries, ip, entry, opts.maxIps);
      if (entry.count >= opts.limit) throw exceeded(opts.label);
      entry.count++;
    },
  };
}
// Task 5 sets clientIp once using resolveClientIp + server.requestIP before route middleware.
export function routeRateLimit(deps: { env: { RATELIMIT_ENABLED: boolean }; now?: () => Date }, spec: RateLimitSpec): MiddlewareHandler<{ Variables: { clientIp?: string } }> {
  const limiter = createFixedWindowLimiter({ ...spec, maxIps: DEFAULT_SECURITY_CONFIG.maxTrackedIps, now: () => deps.now?.().getTime() ?? Date.now() });
  return async (c, next) => {
    if (deps.env.RATELIMIT_ENABLED) {
      try { limiter.consume(c.get("clientIp") ?? "unknown"); }
      catch (error) {
        if (error instanceof HttpError && error.status === 429) return c.json(error.detail, 429);
        throw error;
      }
    }
    await next();
  };
}
