import type { Domain } from "./route";

export interface CachedResponse { status: number; body: string; etag: string }
export interface ResponseCache {
  get(key: string): CachedResponse | undefined;
  set(key: string, domain: Domain, value: CachedResponse): void;
  invalidate(domain: Domain): void;
  generation(domain: Domain): number;
  size(): number;
}
export const INVALIDATES: Record<Domain, readonly Domain[]> = {
  events: ["events"], projects: ["projects", "members"], members: ["members", "projects"],
  sponsors: ["sponsors"], users: ["events"], auth: ["events"], uploads: [], system: [],
};

export function createResponseCache(o: { max: number; ttlMs: number; now: () => number; enabled: boolean }): ResponseCache {
  const entries = new Map<string, { value: CachedResponse; domain: Domain; expires: number }>();
  const generations = new Map<Domain, number>();
  return {
    get(key) {
      if (!o.enabled) return undefined;
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expires <= o.now()) { entries.delete(key); return undefined; }
      entries.delete(key); entries.set(key, entry);
      return entry.value;
    },
    set(key, domain, value) {
      if (!o.enabled) return;
      entries.delete(key);
      entries.set(key, { value, domain, expires: o.now() + o.ttlMs });
      while (entries.size > o.max) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        entries.delete(oldest);
      }
    },
    invalidate(domain) {
      const targets = new Set(INVALIDATES[domain]);
      for (const target of targets) generations.set(target, (generations.get(target) ?? 0) + 1);
      for (const [key, entry] of entries) if (targets.has(entry.domain)) entries.delete(key);
    },
    generation: domain => generations.get(domain) ?? 0,
    size: () => entries.size,
  };
}

export function cacheKey(path: string, query: Record<string, unknown>): string {
  const pairs: string[] = [];
  for (const key of Object.keys(query).sort()) {
    const value = query[key];
    const values: readonly unknown[] = Array.isArray(value) ? value : [value];
    for (const item of values) pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
  }
  return `${path}?${pairs.join("&")}`;
}
export function weakEtag(body: string): string { return `W/"${Bun.hash(body).toString(36)}"`; }
