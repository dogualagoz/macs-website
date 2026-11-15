import { HttpError } from "../lib/http-error";
import { touchLru } from "./rate-limit";

export interface LoginShield { check(ip: string): void; recordFailure(ip: string): void; size(): number }
export function createLoginShield(opts: { maxAttempts: number; windowMs: number; maxIps: number; now: () => number }): LoginShield {
  const entries = new Map<string, { count: number; start: number }>();
  function entryFor(ip: string) {
    const now = opts.now();
    let entry = entries.get(ip);
    if (!entry || now - entry.start >= opts.windowMs) entry = { count: 0, start: now };
    touchLru(entries, ip, entry, opts.maxIps);
    return entry;
  }
  return {
    size: () => entries.size,
    check(ip) {
      if (entryFor(ip).count >= opts.maxAttempts) throw new HttpError(429, { error: `Rate limit exceeded: ${String(opts.maxAttempts)} failed logins per ${String(opts.windowMs / 60_000)} minutes` });
    },
    recordFailure(ip) { const entry = entryFor(ip); entry.count = Math.min(opts.maxAttempts, entry.count + 1); },
  };
}
