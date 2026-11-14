import type { RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import type { RateLimitSpec } from "../lib/route";

export const perMinute = (n: number): RateLimitSpec => ({ limit: n, windowMs: 60_000, label: `${n.toString()} per 1 minute` });
export const perHour = (n: number): RateLimitSpec => ({ limit: n, windowMs: 3_600_000, label: `${n.toString()} per 1 hour` });

export function createLimiter(spec: RateLimitSpec, enabled: boolean): RequestHandler {
  if (!enabled) return (_req, _res, next) => { next(); };
  return rateLimit({
    limit: spec.limit, windowMs: spec.windowMs, standardHeaders: false, legacyHeaders: false,
    handler: (_req, res) => { res.status(429).json({ error: `Rate limit exceeded: ${spec.label}` }); },
  });
}
