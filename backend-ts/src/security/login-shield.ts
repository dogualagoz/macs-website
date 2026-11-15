import { HttpError } from "../lib/http-error";
import { touchLru } from "./rate-limit";

export interface LoginShield { check(ip: string): void; recordFailure(ip: string): void; size(): number }
export function createLoginShield(opts: { maxAttempts: number; windowMs: number; maxIps: number; now: () => number }): LoginShield {
  const entries = new Map<string, { count: number; start: number }>();
  return {
    size: () => entries.size,
    check(ip) {
      const entry = entries.get(ip);
      if (!entry) return;
      if (opts.now() - entry.start >= opts.windowMs) { entries.delete(ip); return; }
      touchLru(entries, ip, entry, opts.maxIps);
      if (entry.count >= opts.maxAttempts) throw new HttpError(429, { error: `Rate limit exceeded: ${String(opts.maxAttempts)} failed logins per ${String(opts.windowMs / 60_000)} minutes` });
    },
    recordFailure(ip) {
      const now = opts.now();
      let entry = entries.get(ip);
      if (!entry || now - entry.start >= opts.windowMs) entry = { count: 0, start: now };
      entry.count = Math.min(opts.maxAttempts, entry.count + 1);
      touchLru(entries, ip, entry, opts.maxIps);
    },
  };
}
