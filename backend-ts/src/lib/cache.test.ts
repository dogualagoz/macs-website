import { brotliDecompressSync, gunzipSync } from "node:zlib";
import { expect, test } from "bun:test";
import {
  cacheKey,
  COMPRESS_MIN_BYTES,
  compressBytes,
  createResponseCache,
  DEFAULT_CACHE_MAX_BYTES,
  DEFAULT_CACHE_MAX_ENTRIES,
  INVALIDATES,
  RECENT_WARMUP_WINDOW_MS,
  selectEncoding,
  WARMUP_CONCURRENCY,
  weakEtag,
} from "./cache";
import type { CachedResponse } from "./cache";

function makeCached(bodyText = '{"ok":true}', status = 200): CachedResponse {
  const raw = new Uint8Array(Buffer.from(bodyText, "utf8"));
  const { br, gzip } = compressBytes(raw);
  return { status, raw, br, gzip, etag: weakEtag(raw) };
}

const value = makeCached('{"ok":true}');
const cache = (max = 500) => createResponseCache({ max, ttlMs: 60_000, now: () => 0, enabled: true });

test("exported cache v2 constants match specification", () => {
  expect(COMPRESS_MIN_BYTES).toBe(1024);
  expect(DEFAULT_CACHE_MAX_ENTRIES).toBe(500);
  expect(DEFAULT_CACHE_MAX_BYTES).toBe(64 * 1024 * 1024);
  expect(RECENT_WARMUP_WINDOW_MS).toBe(10 * 60_000);
  expect(WARMUP_CONCURRENCY).toBe(2);
});

test("cacheKey sorts query, ignores undefined values, and encodes separators without collisions", () => {
  expect(cacheKey("/events", { limit: "10", skip: "0" })).toBe("/events?limit=10&skip=0");
  expect(cacheKey("/events", { skip: "0", limit: "10" })).toBe("/events?limit=10&skip=0");
  expect(cacheKey("/events", {})).toBe("/events?");
  expect(cacheKey("/events", { limit: 10 })).toBe(cacheKey("/events", { limit: 10, utm: undefined }));
  expect(cacheKey("/events", { limit: 10, tag: ["a", undefined, "b"] })).toBe("/events?limit=10&tag=a&tag=b");
  expect(cacheKey("/events", { search: "a&b" })).not.toBe(cacheKey("/events", { search: "a", b: "" }));
  expect(cacheKey("/events", { search: ["a", "b"] })).not.toBe(cacheKey("/events", { search: "a,b" }));
  expect(cacheKey("/events", { "a=b": "c" })).not.toBe(cacheKey("/events", { a: "b=c" }));
  expect(cacheKey("/events", { filter: { id: 1 } })).not.toBe(cacheKey("/events", { filter: { id: 2 } }));
});

test("selectEncoding respects q=0 exclusions, quality weights, priority, and explicit identity exclusion", () => {
  expect(selectEncoding(undefined)).toBe("identity");
  expect(selectEncoding("")).toBe("identity");
  expect(selectEncoding("deflate")).toBe("identity");
  expect(selectEncoding("gzip, deflate, br")).toBe("br");
  expect(selectEncoding("gzip;q=0.5, br;q=0.9")).toBe("br");
  expect(selectEncoding("br;q=0.5, gzip;q=0.9")).toBe("gzip");
  expect(selectEncoding("br;q=0, gzip")).toBe("gzip");
  expect(selectEncoding("br;q=0, gzip;q=0")).toBe("identity");
  expect(selectEncoding("br;q=0.5, identity;q=0.9")).toBe("identity");
  expect(["gzip", "identity"]).toContain(selectEncoding("*") ?? "");
  expect(selectEncoding("*;q=0.5, gzip;q=0")).toBe("identity");
  expect(selectEncoding("*;q=0, identity;q=0.5")).toBe("identity");
  expect(selectEncoding("*;q=0, gzip;q=0.8")).toBe("gzip");
  expect(selectEncoding("br;q=0, gzip;q=0, identity;q=0")).toBeNull();
  expect(selectEncoding("identity;q=0")).toBeNull();
  expect(selectEncoding("deflate, identity;q=0")).toBeNull();
  expect(selectEncoding("*;q=0")).toBeNull();
  expect(selectEncoding("br;q=0, *;q=0")).toBeNull();
});

test("compressBytes skips payloads < 1024 bytes and precompresses >= 1024 bytes with lossless round-trip", () => {
  const smallRaw = new Uint8Array(Buffer.from("x".repeat(COMPRESS_MIN_BYTES - 1), "utf8"));
  expect(compressBytes(smallRaw)).toEqual({ br: null, gzip: null });

  const largeText = JSON.stringify({
    items: Array.from({ length: 40 }, (_, i) => ({
      id: i + 1,
      title: `MACS Etkinlik #${String(i + 1)} — ÇĞIİÖŞÜçğıiöşü`,
    })),
  });
  const largeRaw = new Uint8Array(Buffer.from(largeText, "utf8"));
  expect(largeRaw.byteLength).toBeGreaterThanOrEqual(COMPRESS_MIN_BYTES);

  const compressed = compressBytes(largeRaw);
  expect(compressed.br).toBeInstanceOf(Uint8Array);
  expect(compressed.gzip).toBeInstanceOf(Uint8Array);
  if (!compressed.br || !compressed.gzip) {
    throw new Error("Expected non-null br and gzip buffers");
  }
  expect(compressed.br.byteLength).toBeLessThan(largeRaw.byteLength);
  expect(compressed.gzip.byteLength).toBeLessThan(largeRaw.byteLength);

  expect(brotliDecompressSync(compressed.br).toString("utf8")).toBe(largeText);
  expect(gunzipSync(compressed.gzip).toString("utf8")).toBe(largeText);
});

test("entry expires at ttl without extending on a hit and releases byteSize", () => {
  let now = 0;
  const c = createResponseCache({ max: 500, ttlMs: 60_000, now: () => now, enabled: true });
  c.set("a", "events", value);
  expect(c.byteSize()).toBe(value.raw.byteLength);
  now = 59_999;
  expect(c.get("a")).toEqual(value);
  now = 60_000;
  expect(c.get("a")).toBeUndefined();
  expect(c.size()).toBe(0);
  expect(c.byteSize()).toBe(0);
});

test("LRU evicts the least recently used at max", () => {
  const c = cache(2);
  c.set("a", "events", value);
  c.set("b", "events", value);
  expect(c.get("a")).toEqual(value);
  c.set("c", "events", value);
  expect(c.get("b")).toBeUndefined();
  expect(c.get("a")).toEqual(value);
  expect(c.get("c")).toEqual(value);
  expect(c.size()).toBe(2);
});

test("replacing a key refreshes LRU position, updates byteSize, and never exceeds capacity", () => {
  const c = cache(2);
  const updated = makeCached("new-payload-value");
  c.set("a", "events", value);
  c.set("b", "events", value);
  c.set("a", "events", updated);
  expect(c.byteSize()).toBe(updated.raw.byteLength + value.raw.byteLength);
  c.set("c", "events", value);
  expect(Buffer.from(c.get("a")?.raw ?? []).toString("utf8")).toBe("new-payload-value");
  expect(c.get("b")).toBeUndefined();
  expect(c.size()).toBe(2);
  expect(c.byteSize()).toBe(updated.raw.byteLength + value.raw.byteLength);
});

test("byte cap evicts LRU entries when maxBytes is exceeded and rejects single entry > maxBytes", () => {
  const item100 = makeCached("a".repeat(100));
  const item120 = makeCached("b".repeat(120));
  const item150 = makeCached("c".repeat(150));
  const oversized = makeCached("d".repeat(300));

  const c = createResponseCache({
    maxEntries: 500,
    maxBytes: 250,
    ttlMs: 60_000,
    now: () => 0,
    enabled: true,
  });

  c.set("k1", "events", item100);
  c.set("k2", "events", item120);
  expect(c.size()).toBe(2);
  expect(c.byteSize()).toBe(220);

  // Touch k1 so k2 becomes the LRU entry
  expect(c.get("k1")).toEqual(item100);

  // Adding 150 bytes requires evicting k2 (120 bytes) so 100 + 150 <= 250
  c.set("k3", "events", item150);
  expect(c.get("k2")).toBeUndefined();
  expect(c.get("k1")).toEqual(item100);
  expect(c.get("k3")).toEqual(item150);
  expect(c.size()).toBe(2);
  expect(c.byteSize()).toBe(250);

  // Single entry > maxBytes (300 > 250) is never stored and does not evict valid entries
  c.set("huge", "events", oversized);
  expect(c.get("huge")).toBeUndefined();
  expect(c.get("k1")).toEqual(item100);
  expect(c.get("k3")).toEqual(item150);
  expect(c.size()).toBe(2);
  expect(c.byteSize()).toBe(250);
});

test("invalidate removes only mapped domains and updates byteSize", () => {
  const c = cache();
  c.set("e", "events", value);
  c.set("p", "projects", value);
  c.set("s", "sponsors", value);
  expect(c.byteSize()).toBe(value.raw.byteLength * 3);
  c.invalidate("sponsors");
  expect(c.get("s")).toBeUndefined();
  expect(c.get("e")).toEqual(value);
  expect(c.get("p")).toEqual(value);
  expect(c.byteSize()).toBe(value.raw.byteLength * 2);
});

test("INVALIDATES includes embedded creator and member/project dependencies", () => {
  expect(INVALIDATES).toEqual({
    events: ["events"],
    projects: ["projects", "members"],
    members: ["members", "projects"],
    sponsors: ["sponsors"],
    users: ["events"],
    auth: ["events"],
    uploads: [],
    system: [],
  });
});

test("generations advance for every mapped domain even with no entries", () => {
  const c = cache();
  expect(c.generation("events")).toBe(0);
  c.invalidate("auth");
  c.invalidate("users");
  expect(c.generation("events")).toBe(2);
  expect(c.generation("sponsors")).toBe(0);
  c.invalidate("members");
  expect(c.generation("members")).toBe(1);
  expect(c.generation("projects")).toBe(1);
  c.invalidate("projects");
  expect(c.generation("members")).toBe(2);
  expect(c.generation("projects")).toBe(2);
});

test("disabled cache never stores", () => {
  const c = createResponseCache({ max: 500, ttlMs: 60_000, now: () => 0, enabled: false });
  c.set("a", "events", value);
  expect(c.get("a")).toBeUndefined();
  expect(c.size()).toBe(0);
  expect(c.byteSize()).toBe(0);
});

test("weakEtag is stable, body-sensitive, weak, and identical for string and Uint8Array", () => {
  const text = '{"a":1}';
  const bytes = new Uint8Array(Buffer.from(text, "utf8"));
  expect(weakEtag(text)).toBe(weakEtag(text));
  expect(weakEtag(text)).toBe(weakEtag(bytes));
  expect(weakEtag('{"a":1}')).not.toBe(weakEtag('{"a":2}'));
  expect(weakEtag("x")).toMatch(/^W\/"[0-9a-z]+"$/);
});

test("getOrLoad coalesces 10 concurrent misses into 1 loader call and clears inFlight on rejection", async () => {
  const c = cache();
  const payloadText = JSON.stringify({ data: "x".repeat(1500) });
  let calls = 0;

  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      c.getOrLoad("/events?", "events", async () => {
        calls += 1;
        await Bun.sleep(10);
        return { status: 200, bodyText: payloadText, cacheable: true };
      }),
    ),
  );

  expect(calls).toBe(1);
  for (const res of results) {
    expect(res.status).toBe(200);
    expect(Buffer.from(res.raw).toString("utf8")).toBe(payloadText);
    expect(res.br).not.toBeNull();
    expect(res.gzip).not.toBeNull();
    expect(res.etag).toBe(weakEtag(res.raw));
  }
  expect(c.size()).toBe(1);
  const first = results[0];
  expect(c.byteSize()).toBe(
    (first?.raw.byteLength ?? 0) + (first?.br?.byteLength ?? 0) + (first?.gzip?.byteLength ?? 0),
  );

  // Subsequent hit does not invoke loader
  const hitRes = await c.getOrLoad("/events?", "events", () => {
    calls += 1;
    return Promise.resolve({ status: 200, bodyText: "unexpected", cacheable: true });
  });
  expect(calls).toBe(1);
  expect(Buffer.from(hitRes.raw).toString("utf8")).toBe(payloadText);

  // Rejection clears inFlight immediately and does not poison next call
  let failCalls = 0;
  const failing = Array.from({ length: 5 }, () =>
    c.getOrLoad("/sponsors?", "sponsors", async () => {
      failCalls += 1;
      await Bun.sleep(5);
      throw new Error("transient db failure");
    }),
  );
  const outcomes = await Promise.all(
    failing.map((p) => p.catch((err: unknown) => (err instanceof Error ? err.message : String(err)))),
  );
  expect(outcomes).toEqual(Array.from({ length: 5 }, () => "transient db failure"));
  expect(failCalls).toBe(1);
  expect(c.get("/sponsors?")).toBeUndefined();

  const recovered = await c.getOrLoad("/sponsors?", "sponsors", () => {
    failCalls += 1;
    return Promise.resolve({ status: 200, bodyText: "[]", cacheable: true });
  });
  expect(failCalls).toBe(2);
  expect(Buffer.from(recovered.raw).toString("utf8")).toBe("[]");
  expect(c.get("/sponsors?")).toBeDefined();
});

test("getOrLoad caches literal 'null' 200 payload (F2) but never caches non-cacheable or 404 results", async () => {
  const c = cache();
  let featuredCalls = 0;
  const firstNull = await c.getOrLoad("/events/featured?", "events", () => {
    featuredCalls += 1;
    return Promise.resolve({ status: 200, bodyText: "null", cacheable: true });
  });
  expect(firstNull.status).toBe(200);
  expect(Buffer.from(firstNull.raw).toString("utf8")).toBe("null");
  expect(c.get("/events/featured?")).toBeDefined();

  const secondNull = await c.getOrLoad("/events/featured?", "events", () => {
    featuredCalls += 1;
    return Promise.resolve({ status: 200, bodyText: '{"id":1}', cacheable: true });
  });
  expect(featuredCalls).toBe(1);
  expect(Buffer.from(secondNull.raw).toString("utf8")).toBe("null");

  let missingCalls = 0;
  const missing = await c.getOrLoad("/events/999?", "events", () => {
    missingCalls += 1;
    return Promise.resolve({ status: 404, bodyText: '{"detail":"Etkinlik bulunamadı"}', cacheable: false });
  });
  expect(missing.status).toBe(404);
  expect(c.get("/events/999?")).toBeUndefined();
  expect(missingCalls).toBe(1);
});

test("generation race guard (F29): invalidate during in-flight getOrLoad returns payload without caching", async () => {
  const c = cache();
  let resolveLoader!: () => void;
  const loaderGate = new Promise<void>((resolve) => {
    resolveLoader = resolve;
  });
  let started!: () => void;
  const startedGate = new Promise<void>((resolve) => {
    started = resolve;
  });

  const inFlightPromise = c.getOrLoad("/events/1?", "events", async () => {
    started();
    await loaderGate;
    return { status: 200, bodyText: '{"id":1,"title":"Stale"}', cacheable: true };
  });

  await startedGate;
  // Trigger invalidation on mapped domain while loader is awaiting
  c.invalidate("users");
  expect(c.generation("events")).toBe(1);

  resolveLoader();
  const result = await inFlightPromise;
  expect(result.status).toBe(200);
  expect(Buffer.from(result.raw).toString("utf8")).toBe('{"id":1,"title":"Stale"}');
  expect(c.get("/events/1?")).toBeUndefined();
  expect(c.size()).toBe(0);
  expect(c.byteSize()).toBe(0);
});

test("warmupStartup fills up to 7 registered keys with max concurrency 2", async () => {
  const c = cache();
  let active = 0;
  let maxActive = 0;
  const loadedKeys: string[] = [];

  for (let i = 1; i <= 9; i++) {
    const key = `/endpoint-${String(i)}?`;
    c.registerWarmup(key, "events", async () => {
      active += 1;
      if (active > maxActive) maxActive = active;
      await Bun.sleep(10);
      active -= 1;
      loadedKeys.push(key);
      return { status: 200, bodyText: `{"id":${String(i)}}`, cacheable: true };
    });
  }

  await c.warmupStartup();
  await c.drain();

  expect(loadedKeys).toHaveLength(7);
  expect(c.size()).toBe(7);
  expect(maxActive).toBeLessThanOrEqual(2);
  expect(maxActive).toBe(2);
  expect(c.get("/endpoint-1?")).toBeDefined();
  expect(c.get("/endpoint-7?")).toBeDefined();
  expect(c.get("/endpoint-8?")).toBeUndefined();
  expect(c.get("/endpoint-9?")).toBeUndefined();
});

test("invalidate re-warms only keys seen within recent 10-minute window with max concurrency 2 and respects stop/drain", async () => {
  let now = 0;
  const c = createResponseCache({
    maxEntries: 500,
    ttlMs: 60 * 60_000,
    now: () => now,
    enabled: true,
  });

  let active = 0;
  let maxActive = 0;
  const counts: Record<string, number> = {};

  const makeLoader = (name: string) => async () => {
    counts[name] = (counts[name] ?? 0) + 1;
    active += 1;
    if (active > maxActive) maxActive = active;
    await Bun.sleep(10);
    active -= 1;
    return { status: 200, bodyText: `{"name":"${name}","v":${String(counts[name])}}`, cacheable: true };
  };

  // Load "stale-key" at t = 0
  await c.getOrLoad("/events?page=stale", "events", makeLoader("stale"));

  // Advance clock to 5 minutes and load 3 recent keys
  now = 5 * 60_000;
  await c.getOrLoad("/events?page=1", "events", makeLoader("r1"));
  await c.getOrLoad("/events?page=2", "events", makeLoader("r2"));
  await c.getOrLoad("/events?page=3", "events", makeLoader("r3"));

  // Advance clock to 11 minutes: "stale" is 11m old (> 10m), r1..r3 are 6m old (<= 10m)
  now = 11 * 60_000;
  maxActive = 0;
  c.invalidate("events");
  await c.drain();

  expect(counts.stale).toBe(1);
  expect(counts.r1).toBe(2);
  expect(counts.r2).toBe(2);
  expect(counts.r3).toBe(2);
  expect(maxActive).toBeLessThanOrEqual(2);
  expect(c.get("/events?page=stale")).toBeUndefined();
  expect(Buffer.from(c.get("/events?page=1")?.raw ?? []).toString("utf8")).toBe('{"name":"r1","v":2}');

  // Verify stop() cancels queued warmup work cleanly while drain() awaits active workers
  c.invalidate("events");
  c.stop();
  await c.drain();
  expect(active).toBe(0);
  // At most 2 workers started before stop() cancelled the 3rd queued key
  const totalAfterStop = (counts.r1 ?? 0) + (counts.r2 ?? 0) + (counts.r3 ?? 0);
  expect(totalAfterStop).toBeLessThanOrEqual(8);
});

test("warmupRegistry is bounded by maxEntries/LRU and prunes expired/evicted registrations", async () => {
  const now = 0;
  const c1 = createResponseCache({
    maxEntries: 1,
    ttlMs: 60_000,
    now: () => now,
    enabled: true,
  });

  const calls: Record<number, number> = {};
  for (let i = 1; i <= 8; i++) {
    await c1.getOrLoad(`/events?k=${String(i)}`, "events", () => {
      calls[i] = (calls[i] ?? 0) + 1;
      return Promise.resolve({ status: 200, bodyText: `{"k":${String(i)}}`, cacheable: true });
    });
  }
  expect(c1.size()).toBe(1);

  c1.invalidate("events");
  await c1.drain();

  // Only the 1 retained LRU key (k=8) is re-warmed; keys 1..7 were pruned on eviction
  for (let i = 1; i <= 7; i++) {
    expect(calls[i]).toBe(1);
    expect(c1.get(`/events?k=${String(i)}`)).toBeUndefined();
  }
  expect(calls[8]).toBe(2);
  expect(c1.get("/events?k=8")).toBeDefined();

  // Also verify expired (>10m) warmup registrations are pruned on subsequent insert and never retained if clock rewinds or invalidates
  let clock = 0;
  const c2 = createResponseCache({
    maxEntries: 2,
    ttlMs: 60 * 60_000,
    now: () => clock,
    enabled: true,
  });
  let oldCalls = 0;
  let freshCalls = 0;
  await c2.getOrLoad("/events?old=1", "events", () => {
    oldCalls += 1;
    return Promise.resolve({ status: 200, bodyText: '{"old":true}', cacheable: true });
  });
  // Advance past 10-minute window and insert a new key, which prunes old registration
  clock = 11 * 60_000;
  await c2.getOrLoad("/events?fresh=1", "events", () => {
    freshCalls += 1;
    return Promise.resolve({ status: 200, bodyText: '{"fresh":true}', cacheable: true });
  });
  // Even if clock is set back to 5m, "/events?old=1" was already pruned from warmupRegistry on insert
  clock = 5 * 60_000;
  c2.invalidate("events");
  await c2.drain();
  expect(oldCalls).toBe(1);
  expect(freshCalls).toBe(2);
});

test("warmup failures report only safe classifications (no PII/message/stack), walk error cause codes, fall back to logger.error, keep peers warming, and retry on next trigger", async () => {
  const errors: Array<{ key: string; domain: string; errorName: string; errorKind: string; code?: string }> = [];
  const onErrorEvents: Array<{ key: string; domain: string; errorName: string; errorKind: string; code?: string }> = [];
  const logWarnings: Array<{ obj: Record<string, unknown>; msg?: string }> = [];

  const c = createResponseCache({
    maxEntries: 500,
    ttlMs: 60_000,
    now: () => 0,
    enabled: true,
    onWarmupError: (event) => {
      errors.push(event);
    },
    onError: (event) => {
      onErrorEvents.push(event);
    },
    logger: {
      warn: (obj, msg) => {
        logWarnings.push(msg !== undefined ? { obj, msg } : { obj });
      },
    },
  });

  let flakyAttempts = 0;
  c.registerWarmup("/events?k=1", "events", () =>
    Promise.resolve({ status: 200, bodyText: '{"k":1}', cacheable: true }),
  );
  c.registerWarmup("/events?k=flaky", "events", () => {
    flakyAttempts += 1;
    if (flakyAttempts === 1) {
      const pgCause = Object.assign(new Error("canceling statement due to statement timeout for secret.user@example.com"), {
        code: "57014",
      });
      const dbErr = new TypeError("Failed query for secret.user@example.com", { cause: pgCause });
      return Promise.reject(dbErr);
    }
    return Promise.resolve({ status: 200, bodyText: '{"k":"recovered"}', cacheable: true });
  });
  c.registerWarmup("/events?k=3", "events", () =>
    Promise.resolve({ status: 200, bodyText: '{"k":3}', cacheable: true }),
  );

  const startupSummary = await c.warmupStartup();
  const drainSummary = await c.drain();

  expect(startupSummary).toEqual({ warmed: 2, failed: 1 });
  expect(drainSummary).toEqual({ warmed: 2, failed: 1 });
  expect(errors).toEqual([
    {
      key: "/events?k=flaky",
      domain: "events",
      errorName: "TypeError",
      errorKind: "57014",
      code: "57014",
    },
  ]);
  expect(onErrorEvents).toEqual(errors);
  expect(logWarnings).toEqual([
    {
      obj: {
        event: "cache_warmup_failed",
        key: "/events?k=flaky",
        domain: "events",
        errorName: "TypeError",
        errorKind: "57014",
        code: "57014",
      },
      msg: "Cache warmup failed",
    },
  ]);
  // Verify PII in Error.message never reaches callbacks or logger
  expect(JSON.stringify(errors)).not.toContain("secret.user@example.com");
  expect(JSON.stringify(onErrorEvents)).not.toContain("secret.user@example.com");
  expect(JSON.stringify(logWarnings)).not.toContain("secret.user@example.com");

  expect(c.get("/events?k=1")).toBeDefined();
  expect(c.get("/events?k=3")).toBeDefined();
  expect(c.get("/events?k=flaky")).toBeUndefined();

  // Next trigger (invalidate) retries "/events?k=flaky" and succeeds
  c.invalidate("events");
  const retrySummary = await c.drain();
  expect(retrySummary).toEqual({ warmed: 3, failed: 0 });
  expect(flakyAttempts).toBe(2);
  expect(Buffer.from(c.get("/events?k=flaky")?.raw ?? []).toString("utf8")).toBe('{"k":"recovered"}');

  // Verify error-only logger fallback when logger.warn is absent
  const errorOnlyLogs: Array<{ obj: Record<string, unknown>; msg?: string }> = [];
  const cErrorLogger = createResponseCache({
    maxEntries: 500,
    ttlMs: 60_000,
    now: () => 0,
    enabled: true,
    logger: {
      error: (obj, msg) => {
        errorOnlyLogs.push(msg !== undefined ? { obj, msg } : { obj });
      },
    },
  });
  cErrorLogger.registerWarmup("/events?k=err-only", "events", () =>
    Promise.reject(new RangeError("sensitive user2@example.com failure")),
  );
  const errOnlySummary = await cErrorLogger.warmupStartup();
  expect(errOnlySummary).toEqual({ warmed: 0, failed: 1 });
  expect(errorOnlyLogs).toEqual([
    {
      obj: {
        event: "cache_warmup_failed",
        key: "/events?k=err-only",
        domain: "events",
        errorName: "RangeError",
        errorKind: "RangeError",
      },
      msg: "Cache warmup failed",
    },
  ]);
  expect(JSON.stringify(errorOnlyLogs)).not.toContain("user2@example.com");
});



test("empty invalidation targets do not even consult warmup clock", () => {
  let calls = 0;
  const cache = createResponseCache({ now: () => { calls++; return 0; } });
  cache.invalidate("uploads"); cache.invalidate("system");
  expect(calls).toBe(0); expect(cache.size()).toBe(0);
});
