import { brotliCompressSync, constants } from "node:zlib";

export type Domain = "auth" | "users" | "events" | "projects" | "members" | "sponsors" | "uploads" | "system";

export const COMPRESS_MIN_BYTES = 1024;
export const DEFAULT_CACHE_MAX_ENTRIES = 500;
export const DEFAULT_CACHE_MAX_BYTES = 64 * 1024 * 1024;
export const RECENT_WARMUP_WINDOW_MS = 10 * 60_000;
export const WARMUP_CONCURRENCY = 2;
export const MAX_STARTUP_WARMUP_KEYS = 7;

export type ContentEncoding = "br" | "gzip" | "identity";

export interface CachedResponse {
  status: number;
  raw: Uint8Array;
  br: Uint8Array | null;
  gzip: Uint8Array | null;
  etag: string;
}

export interface CacheLoadResult {
  status: number;
  bodyText: string;
  cacheable: boolean;
}

export interface LoadedCachedResponse extends CachedResponse {
  readonly hit: boolean;
  readonly value: CachedResponse;
  readonly response: CachedResponse;
  readonly cacheable: boolean;
}

export interface WarmupRegistration {
  key: string;
  domain: Domain;
  loader: () => Promise<CacheLoadResult>;
}

export interface ResponseCacheOptions {
  max?: number;
  maxEntries?: number;
  maxBytes?: number;
  ttlMs?: number;
  now?: () => number;
  enabled?: boolean;
  recentWindowMs?: number;
  warmupConcurrency?: number;
  minCompressBytes?: number;
}

export interface ResponseCache {
  get(key: string): CachedResponse | undefined;
  set(key: string, domain: Domain, value: CachedResponse): void;
  getOrLoad(
    key: string,
    domain: Domain,
    loader: () => Promise<CacheLoadResult>,
  ): Promise<LoadedCachedResponse>;
  invalidate(domain: Domain): void;
  generation(domain: Domain): number;
  size(): number;
  byteSize(): number;
  registerWarmup(key: string, domain: Domain, loader: () => Promise<CacheLoadResult>): void;
  registerWarmup(spec: WarmupRegistration): void;
  warmupStartup(): Promise<void>;
  drain(): Promise<void>;
  stop(): void;
}

export const INVALIDATES: Record<Domain, readonly Domain[]> = {
  events: ["events"],
  projects: ["projects", "members"],
  members: ["members", "projects"],
  sponsors: ["sponsors"],
  users: ["events"],
  auth: ["events"],
  uploads: [],
  system: [],
};

export function selectEncoding(acceptEncoding: string | undefined): ContentEncoding {
  if (!acceptEncoding) return "identity";
  let brQ: number | undefined;
  let gzipQ: number | undefined;
  let identityQ: number | undefined;
  let starQ: number | undefined;

  for (const rawRange of acceptEncoding.split(",")) {
    const [rawCoding, ...params] = rawRange.split(";");
    const coding = rawCoding?.trim().toLowerCase() ?? "";
    if (!coding) continue;
    let q = 1;
    let validQ = true;
    for (const rawParam of params) {
      const param = rawParam.trim();
      const match = /^q\s*=\s*(.+)$/i.exec(param);
      if (match?.[1] !== undefined) {
        const parsed = Number(match[1]);
        if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
          validQ = false;
        } else {
          q = parsed;
        }
      }
    }
    if (!validQ) continue;
    if (coding === "br") brQ = q;
    else if (coding === "gzip" || coding === "x-gzip") gzipQ = q;
    else if (coding === "identity") identityQ = q;
    else if (coding === "*") starQ = q;
  }

  const effectiveBr = brQ ?? 0;
  const effectiveGzip = gzipQ ?? (starQ ?? 0);
  const effectiveIdentity = identityQ ?? 0;

  if (effectiveBr <= 0 && effectiveGzip <= 0) return "identity";
  if (effectiveIdentity > effectiveBr && effectiveIdentity > effectiveGzip) return "identity";
  if (effectiveBr >= effectiveGzip && effectiveBr > 0) return "br";
  return "gzip";
}

export const negotiateEncoding = selectEncoding;

export function compressBytes(
  raw: Uint8Array,
  minBytes: number = COMPRESS_MIN_BYTES,
): { br: Uint8Array | null; gzip: Uint8Array | null } {
  if (raw.byteLength < minBytes) return { br: null, gzip: null };
  const brBuffer = brotliCompressSync(raw, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 4 },
  });
  const br = new Uint8Array(brBuffer.buffer, brBuffer.byteOffset, brBuffer.byteLength);
  const gzipInput =
    raw.buffer instanceof ArrayBuffer
      ? new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength)
      : new Uint8Array(raw);
  const gzip = Bun.gzipSync(gzipInput);
  return { br, gzip };
}

export function weakEtag(body: string | Uint8Array): string {
  return `W/"${Bun.hash(body).toString(36)}"`;
}

export function toCachedResponse(
  status: number,
  body: string | Uint8Array,
  minBytes: number = COMPRESS_MIN_BYTES,
): CachedResponse {
  const raw =
    typeof body === "string"
      ? (() => {
          const buf = Buffer.from(body, "utf8");
          return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        })()
      : body;
  const { br, gzip } = compressBytes(raw, minBytes);
  return { status, raw, br, gzip, etag: weakEtag(raw) };
}

function entryByteLength(value: CachedResponse): number {
  return value.raw.byteLength + (value.br?.byteLength ?? 0) + (value.gzip?.byteLength ?? 0);
}

function attachLookupMeta(
  value: CachedResponse,
  hit: boolean,
  cacheable: boolean,
): LoadedCachedResponse {
  const result = { ...value };
  Object.defineProperties(result, {
    hit: { value: hit, enumerable: false },
    value: { value, enumerable: false },
    response: { value, enumerable: false },
    cacheable: { value: cacheable, enumerable: false },
  });
  return result as LoadedCachedResponse;
}

export function createResponseCache(o: ResponseCacheOptions = {}): ResponseCache {
  const maxEntries = o.maxEntries ?? o.max ?? DEFAULT_CACHE_MAX_ENTRIES;
  const maxBytes = o.maxBytes ?? DEFAULT_CACHE_MAX_BYTES;
  const ttlMs = o.ttlMs ?? 60_000;
  const now = o.now ?? Date.now;
  const enabled = o.enabled ?? true;
  const recentWindowMs = o.recentWindowMs ?? RECENT_WARMUP_WINDOW_MS;
  const warmupConcurrency = Math.max(1, o.warmupConcurrency ?? WARMUP_CONCURRENCY);
  const minCompressBytes = o.minCompressBytes ?? COMPRESS_MIN_BYTES;

  const entries = new Map<
    string,
    { value: CachedResponse; domain: Domain; expires: number; bytes: number }
  >();
  const generations = new Map<Domain, number>();
  const inFlight = new Map<
    string,
    { domain: Domain; touchLastSeen: boolean; promise: Promise<LoadedCachedResponse> }
  >();
  const warmupRegistry = new Map<
    string,
    { domain: Domain; loader: () => Promise<CacheLoadResult>; lastSeenAt: number }
  >();
  const startupRegistry = new Map<
    string,
    { domain: Domain; loader: () => Promise<CacheLoadResult> }
  >();

  let totalBytes = 0;
  let stopped = false;
  const warmupQueue: Array<{ key: string; domain: Domain; loader: () => Promise<CacheLoadResult> }> = [];
  const queuedKeys = new Set<string>();
  const activeWorkers = new Set<Promise<void>>();
  const drainWaiters: Array<() => void> = [];

  function removeEntry(key: string): void {
    const existing = entries.get(key);
    if (!existing) return;
    entries.delete(key);
    totalBytes = Math.max(0, totalBytes - existing.bytes);
  }

  function pruneWarmupRegistry(currentNow: number): void {
    for (const [key, item] of warmupRegistry) {
      if (currentNow - item.lastSeenAt > recentWindowMs) {
        warmupRegistry.delete(key);
      }
    }
  }

  function upsertWarmupEntry(
    key: string,
    domain: Domain,
    loader: () => Promise<CacheLoadResult>,
    seenAt: number,
  ): void {
    if (!enabled || stopped || maxEntries <= 0) return;
    pruneWarmupRegistry(seenAt);
    warmupRegistry.delete(key);
    while (warmupRegistry.size >= maxEntries) {
      const oldest = warmupRegistry.keys().next().value;
      if (oldest === undefined) break;
      warmupRegistry.delete(oldest);
    }
    warmupRegistry.set(key, { domain, loader, lastSeenAt: seenAt });
  }

  function getGeneration(domain: Domain): number {
    return generations.get(domain) ?? 0;
  }

  function setEntry(key: string, domain: Domain, value: CachedResponse): boolean {
    if (!enabled) return false;
    removeEntry(key);
    const bytes = entryByteLength(value);
    if (maxEntries <= 0 || maxBytes <= 0 || bytes > maxBytes) return false;
    while (entries.size > 0 && (entries.size >= maxEntries || totalBytes + bytes > maxBytes)) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;
      removeEntry(oldest);
      if (!startupRegistry.has(oldest)) {
        warmupRegistry.delete(oldest);
      }
    }
    entries.set(key, { value, domain, expires: now() + ttlMs, bytes });
    totalBytes += bytes;
    return true;
  }

  function getEntry(key: string): CachedResponse | undefined {
    if (!enabled) return undefined;
    const entry = entries.get(key);
    if (!entry) return undefined;
    const currentNow = now();
    if (entry.expires <= currentNow) {
      removeEntry(key);
      pruneWarmupRegistry(currentNow);
      return undefined;
    }
    entries.delete(key);
    entries.set(key, entry);
    const warm = warmupRegistry.get(key);
    if (warm) {
      upsertWarmupEntry(key, warm.domain, warm.loader, currentNow);
    }
    return entry.value;
  }

  function isStopped(): boolean {
    return stopped;
  }

  function loadSingleFlight(
    key: string,
    domain: Domain,
    loader: () => Promise<CacheLoadResult>,
    touchLastSeen: boolean,
  ): Promise<LoadedCachedResponse> {
    const existingFlight = inFlight.get(key);
    if (existingFlight) {
      if (touchLastSeen) existingFlight.touchLastSeen = true;
      return existingFlight.promise;
    }

    const startGen = getGeneration(domain);
    const flightRecord: {
      domain: Domain;
      touchLastSeen: boolean;
      promise: Promise<LoadedCachedResponse>;
    } = {
      domain,
      touchLastSeen,
      promise: Promise.resolve() as unknown as Promise<LoadedCachedResponse>,
    };

    const promise = (async () => {
      const loaded = await loader();
      const response = toCachedResponse(loaded.status, loaded.bodyText, minCompressBytes);
      const canStore =
        enabled &&
        (!isStopped() || flightRecord.touchLastSeen) &&
        loaded.cacheable &&
        loaded.status === 200 &&
        getGeneration(domain) === startGen;
      if (canStore) {
        const stored = setEntry(key, domain, response);
        if (stored && flightRecord.touchLastSeen) {
          upsertWarmupEntry(key, domain, loader, now());
        }
      }
      return attachLookupMeta(response, false, loaded.cacheable);
    })().finally(() => {
      if (inFlight.get(key)?.promise === promise) {
        inFlight.delete(key);
      }
    });

    flightRecord.promise = promise;
    inFlight.set(key, flightRecord);
    return promise;
  }

  function notifyIdleIfDrained(): void {
    if (activeWorkers.size === 0 && (stopped || warmupQueue.length === 0)) {
      const waiters = drainWaiters.splice(0);
      for (const resolve of waiters) resolve();
    }
  }

  function pumpWarmup(): void {
    while (!stopped && enabled && activeWorkers.size < warmupConcurrency && warmupQueue.length > 0) {
      const next = warmupQueue.shift();
      if (!next) break;
      queuedKeys.delete(next.key);
      const worker = (async () => {
        try {
          const existing = entries.get(next.key);
          if (existing && existing.expires > now()) return;
          await loadSingleFlight(next.key, next.domain, next.loader, false);
        } catch {
          // Background warmup failures are intentionally ignored so teardown/runtime never leaks unhandled rejections.
        }
      })().finally(() => {
        activeWorkers.delete(worker);
        if (!isStopped() && warmupQueue.length > 0) {
          pumpWarmup();
        } else {
          notifyIdleIfDrained();
        }
      });
      activeWorkers.add(worker);
    }
  }

  function enqueueWarmup(
    key: string,
    domain: Domain,
    loader: () => Promise<CacheLoadResult>,
  ): void {
    if (!enabled || stopped || maxEntries <= 0) return;
    if (queuedKeys.has(key)) return;
    if (activeWorkers.size + warmupQueue.length >= maxEntries) return;
    queuedKeys.add(key);
    warmupQueue.push({ key, domain, loader });
    pumpWarmup();
  }

  return {
    get: getEntry,
    set(key, domain, value) {
      setEntry(key, domain, value);
    },
    getOrLoad(key, domain, loader) {
      const cached = getEntry(key);
      if (cached !== undefined) {
        upsertWarmupEntry(key, domain, loader, now());
        return Promise.resolve(attachLookupMeta(cached, true, true));
      }
      return loadSingleFlight(key, domain, loader, true);
    },
    invalidate(domain) {
      const targets = new Set(INVALIDATES[domain]);
      for (const target of targets) {
        generations.set(target, (generations.get(target) ?? 0) + 1);
      }
      for (const [key, entry] of entries) {
        if (targets.has(entry.domain)) {
          removeEntry(key);
        }
      }
      const inFlightKeysAtInvalidate = new Set<string>();
      for (const [key, flight] of inFlight) {
        if (targets.has(flight.domain)) {
          inFlightKeysAtInvalidate.add(key);
          inFlight.delete(key);
        }
      }
      if (enabled && !stopped) {
        const currentNow = now();
        pruneWarmupRegistry(currentNow);
        for (const [key, item] of warmupRegistry) {
          if (
            targets.has(item.domain) &&
            !inFlightKeysAtInvalidate.has(key) &&
            currentNow - item.lastSeenAt <= recentWindowMs
          ) {
            enqueueWarmup(key, item.domain, item.loader);
          }
        }
      }
    },
    generation: getGeneration,
    size: () => entries.size,
    byteSize: () => totalBytes,
    registerWarmup(
      keyOrSpec: string | WarmupRegistration,
      domain?: Domain,
      loader?: () => Promise<CacheLoadResult>,
    ) {
      let spec: WarmupRegistration;
      if (typeof keyOrSpec === "string") {
        if (!domain || !loader) return;
        spec = { key: keyOrSpec, domain, loader };
      } else {
        spec = keyOrSpec;
      }
      if (startupRegistry.has(spec.key) || startupRegistry.size < MAX_STARTUP_WARMUP_KEYS) {
        startupRegistry.set(spec.key, { domain: spec.domain, loader: spec.loader });
      }
      const existing = warmupRegistry.get(spec.key);
      upsertWarmupEntry(spec.key, spec.domain, spec.loader, existing?.lastSeenAt ?? now());
    },
    warmupStartup() {
      if (!enabled || stopped) return Promise.resolve();
      let count = 0;
      for (const [key, item] of startupRegistry) {
        if (count >= MAX_STARTUP_WARMUP_KEYS) break;
        count += 1;
        enqueueWarmup(key, item.domain, item.loader);
      }
      return this.drain();
    },
    drain() {
      if (activeWorkers.size === 0 && (stopped || warmupQueue.length === 0)) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        drainWaiters.push(resolve);
      });
    },
    stop() {
      stopped = true;
      warmupQueue.length = 0;
      queuedKeys.clear();
      warmupRegistry.clear();
      startupRegistry.clear();
      notifyIdleIfDrained();
    },
  };
}

function stringifyQueryValue(item: unknown): string {
  return String(item);
}

export function cacheKey(canonicalPath: string, validatedQuery: Record<string, unknown>): string {
  const pairs: string[] = [];
  for (const key of Object.keys(validatedQuery).sort()) {
    const value = validatedQuery[key];
    if (value === undefined) continue;
    const values: readonly unknown[] = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (item === undefined) continue;
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(stringifyQueryValue(item))}`);
    }
  }
  return `${canonicalPath}?${pairs.join("&")}`;
}
