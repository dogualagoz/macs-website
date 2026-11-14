import { expect, test } from "bun:test";
import { cacheKey, createResponseCache, INVALIDATES, weakEtag } from "./cache";

const value = { status: 200, body: '{"ok":true}', etag: 'W/"test"' };
const cache = (max = 500) => createResponseCache({ max, ttlMs: 60_000, now: () => 0, enabled: true });

test("cacheKey sorts query and encodes separators without collisions", () => {
  expect(cacheKey("/events", { limit: "10", skip: "0" })).toBe("/events?limit=10&skip=0");
  expect(cacheKey("/events", { skip: "0", limit: "10" })).toBe("/events?limit=10&skip=0");
  expect(cacheKey("/events", {})).toBe("/events?");
  expect(cacheKey("/events", { search: "a&b" })).not.toBe(cacheKey("/events", { search: "a", b: "" }));
  expect(cacheKey("/events", { search: ["a", "b"] })).not.toBe(cacheKey("/events", { search: "a,b" }));
  expect(cacheKey("/events", { "a=b": "c" })).not.toBe(cacheKey("/events", { a: "b=c" }));
});
test("entry expires at ttl without extending on a hit", () => {
  let now = 0;
  const c = createResponseCache({ max: 500, ttlMs: 60_000, now: () => now, enabled: true });
  c.set("a", "events", value);
  now = 59_999; expect(c.get("a")).toEqual(value);
  now = 60_000; expect(c.get("a")).toBeUndefined(); expect(c.size()).toBe(0);
});
test("LRU evicts the least recently used at max", () => {
  const c = cache(2); c.set("a", "events", value); c.set("b", "events", value);
  expect(c.get("a")).toEqual(value); c.set("c", "events", value);
  expect(c.get("b")).toBeUndefined(); expect(c.get("a")).toEqual(value); expect(c.get("c")).toEqual(value); expect(c.size()).toBe(2);
});
test("replacing a key refreshes LRU position and never exceeds capacity", () => {
  const c = cache(2); c.set("a", "events", value); c.set("b", "events", value);
  c.set("a", "events", { ...value, body: "new" }); c.set("c", "events", value);
  expect(c.get("a")?.body).toBe("new"); expect(c.get("b")).toBeUndefined(); expect(c.size()).toBe(2);
});
test("invalidate removes only mapped domains", () => {
  const c = cache(); c.set("e", "events", value); c.set("p", "projects", value); c.set("s", "sponsors", value);
  c.invalidate("sponsors"); expect(c.get("s")).toBeUndefined(); expect(c.get("e")).toEqual(value); expect(c.get("p")).toEqual(value);
});
test("INVALIDATES includes embedded creator and member/project dependencies", () => {
  expect(INVALIDATES).toEqual({ events: ["events"], projects: ["projects", "members"], members: ["members", "projects"],
    sponsors: ["sponsors"], users: ["events"], auth: ["events"], uploads: [], system: [] });
});
test("generations advance for every mapped domain even with no entries", () => {
  const c = cache(); expect(c.generation("events")).toBe(0); c.invalidate("auth"); c.invalidate("users");
  expect(c.generation("events")).toBe(2); expect(c.generation("sponsors")).toBe(0);
  c.invalidate("members"); expect(c.generation("members")).toBe(1); expect(c.generation("projects")).toBe(1);
  c.invalidate("projects"); expect(c.generation("members")).toBe(2); expect(c.generation("projects")).toBe(2);
});
test("disabled cache never stores", () => {
  const c = createResponseCache({ max: 500, ttlMs: 60_000, now: () => 0, enabled: false });
  c.set("a", "events", value); expect(c.get("a")).toBeUndefined(); expect(c.size()).toBe(0);
});
test("weakEtag is stable, body-sensitive and weak", () => {
  expect(weakEtag('{"a":1}')).toBe(weakEtag('{"a":1}'));
  expect(weakEtag('{"a":1}')).not.toBe(weakEtag('{"a":2}')); expect(weakEtag("x")).toMatch(/^W\/"[0-9a-z]+"$/);
});
