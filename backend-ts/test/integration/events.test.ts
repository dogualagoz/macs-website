import { afterAll, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { readFile } from "node:fs/promises";
import request from "supertest";
import { createApp } from "../../src/app";
import { testDeps } from "../helpers/app";
import { seedDb } from "../helpers/db";
import { tokenFor } from "../helpers/auth";

const deps = testDeps();
const seed = await readFile(new URL("../../contract/seed.sql", import.meta.url), "utf8");
afterAll(async () => { await deps.sql.end({ timeout: 1 }); });
beforeEach(async () => { await seedDb(deps.sql, seed); });

describe("events database integration", () => {
  test("public list uses one joined SQL, never selects credentials, and ignores Authorization", async () => {
    deps.counter.reset();
    const r = await request(createApp(deps)).get("/events?limit=100").auth("abc", { type: "bearer" });
    expect(r.status).toBe(200); expect((r.body as { id: number }[]).map(row => row.id)).toEqual([2, 6, 5, 1]);
    expect(deps.counter.count()).toBe(1);
    const queries = deps.counter.queries(); expect(queries).toHaveLength(1);
    expect(queries[0]).toContain('left join "users"'); expect(queries[0]).toContain('left join "event_categories"');
    expect(queries.every(query => !query.includes("hashed_password"))).toBe(true);
  });
  test("featured flagged and fallback reads each use at most two SQL", async () => {
    const app = createApp(deps); deps.counter.reset();
    const flagged = await request(app).get("/events/featured"); expect(flagged.status).toBe(200); expect(flagged.body).toMatchObject({ id: 1 });
    expect(deps.counter.count()).toBeLessThanOrEqual(2);
    await deps.sql`UPDATE events SET is_featured = false`;
    deps.counter.reset(); const fallback = await request(app).get("/events/featured");
    expect(fallback.status).toBe(200); expect(fallback.body).toMatchObject({ id: 6 }); expect(deps.counter.count()).toBeLessThanOrEqual(2);
    expect(deps.counter.queries().every(query => !query.includes("hashed_password"))).toBe(true);
  });
  test("category delete rollback leaves event references intact when repo DELETE fails", async () => {
    const repo = await import("../../src/modules/events/repo");
    const service = await import("../../src/modules/events/service");
    const remove = spyOn(repo, "deleteCategoryRow").mockImplementation(() => { throw new Error("injected category delete failure"); });
    try {
      let failure: unknown;
      try { await service.deleteEventCategory(deps.db, 1); } catch (error: unknown) { failure = error; }
      expect(failure).toBeInstanceOf(Error); expect(failure).toMatchObject({ message: "injected category delete failure" });
    }
    finally { remove.mockRestore(); }
    const rows = await deps.sql<{ category_id: number | null }[]>`SELECT category_id FROM events WHERE id IN (1, 2, 3, 4) ORDER BY id`;
    expect(rows.map(row => row.category_id)).toEqual([1, 1, 1, 1]);
    expect(await deps.sql`SELECT id FROM event_categories WHERE id = 1`).toHaveLength(1);
  });
  test("serializer coerces NULL flags without losing datetime microseconds", async () => {
    const { findEventRow } = await import("../../src/modules/events/repo");
    const { serializeEvent } = await import("../../src/modules/events/serializer");
    await deps.sql`UPDATE events SET is_active = NULL, is_featured = NULL, is_deleted = NULL, start_time = '2099-05-01 11:00:00.123456' WHERE id = 1`;
    const row = await findEventRow(deps.db, 1, "all"); expect(row).not.toBeNull(); if (!row) throw new Error("Missing seed event");
    const result = serializeEvent(row); expect(result).toMatchObject({ is_active: false, is_featured: false, is_deleted: false,
      start_time: "2099-05-01T11:00:00.123456", created_at: "2026-01-01T12:00:00.123456Z", creator: { id: 2 } });
    expect(result.creator).not.toHaveProperty("hashed_password");
    expect(serializeEvent({ ...row, creator: null, category: null })).toMatchObject({ creator: null, category: null });
  });
  test("slug race maps real unique violation to 409 and preserves one row", async () => {
    const repo = await import("../../src/modules/events/repo");
    const original = repo.slugExists;
    let arrived = 0; let release: () => void = () => { throw new Error("Barrier uninitialized"); };
    const barrier = new Promise<void>(resolve => { release = resolve; });
    const check = spyOn(repo, "slugExists").mockImplementation(async (...args) => {
      const taken = await original(...args); arrived++; if (arrived === 2) release(); await barrier; return taken;
    });
    try {
      const app = createApp(deps); const token = await tokenFor("mod@example.com", "moderator");
      const send = () => request(app).post("/events").auth(token, { type: "bearer" }).send({ title: "Slug race", start_time: "2099-05-01T10:00" });
      const results = await Promise.all([send(), send()]);
      expect(results.map(r => r.status).sort()).toEqual([201, 409]); expect(results.find(r => r.status === 409)?.body).toEqual({ detail: "Kayıt zaten mevcut" });
      const [stored] = await deps.sql`SELECT count(*)::int AS total FROM events WHERE slug = 'slug-race'`; expect(stored?.total).toBe(1);
    } finally { check.mockRestore(); }
  });
  test("concurrent featured writes and failed featured updates preserve exactly one featured event", async () => {
    const repo = await import("../../src/modules/events/repo");
    const service = await import("../../src/modules/events/service");
    const update = spyOn(repo, "updateEventRow").mockImplementation(() => { throw new Error("injected featured update failure"); });
    try {
      let failure: unknown;
      try { await service.updateEvent(deps.db, 6, { is_featured: true }, new Date()); } catch (error: unknown) { failure = error; }
      expect(failure).toBeInstanceOf(Error); expect(failure).toMatchObject({ message: "injected featured update failure" });
    } finally { update.mockRestore(); }
    expect((await deps.sql<{ id: number }[]>`SELECT id FROM events WHERE is_featured`).map(row => row.id)).toEqual([1]);
    const app = createApp(deps); const token = await tokenFor("mod@example.com", "moderator");
    const results = await Promise.all([5, 6].map(id => request(app).put(`/events/${String(id)}`).auth(token, { type: "bearer" }).send({ is_featured: true })));
    expect(results.map(r => r.status)).toEqual([200, 200]);
    const rows = await deps.sql<{ id: number }[]>`SELECT id FROM events WHERE is_featured`; expect(rows).toHaveLength(1); expect(rows[0]?.id === 5 || rows[0]?.id === 6).toBe(true);
  });
  test("empty sort and equal values have deterministic id ASC tie-breaking", async () => {
    const app = createApp(deps);
    const unsorted = await request(app).get("/events?sort_by="); expect(unsorted.status).toBe(200); expect((unsorted.body as { id: number }[]).map(row => row.id)).toEqual([1, 2, 5, 6]);
    await deps.sql`UPDATE events SET title = 'Same', start_time = '2099-01-01'`;
    for (const query of ["sort_by=title&sort_desc=true", "sort_by=start_time&sort_desc=true"]) {
      const r = await request(app).get(`/events?${query}`); expect(r.status).toBe(200); expect((r.body as { id: number }[]).map(row => row.id)).toEqual([1, 2, 5, 6]);
    }
  });
  test("past first flagged event triggers fallback even if a later flagged event is upcoming", async () => {
    await deps.sql`UPDATE events SET start_time = '2020-01-01' WHERE id = 1`;
    await deps.sql`UPDATE events SET is_featured = true WHERE id = 5`;
    deps.counter.reset(); const r = await request(createApp(deps)).get("/events/featured"); expect(r.status).toBe(200); expect(r.body).toMatchObject({ id: 6 }); expect(deps.counter.count()).toBeLessThanOrEqual(2);
  });
});
