import { afterAll, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { readFile } from "node:fs/promises";
import request from "../helpers/http";
import { createApp } from "../../src/app";
import { testDeps } from "../helpers/app";
import { seedDb } from "../helpers/db";
import { tokenFor } from "../helpers/auth";

const deps = testDeps();
const seed = await readFile(new URL("../../contract/seed.sql", import.meta.url), "utf8");
afterAll(async () => { await deps.sql.end({ timeout: 1 }); });
beforeEach(async () => { await seedDb(deps.sql, seed); });
const mod = () => tokenFor("mod@example.com", "moderator");

describe("projects database integration", () => {
  test("list embeds members in exactly 1 CTE SQL independent of five projects and membership count", async () => {
    const app = createApp(deps); deps.counter.reset();
    const baseline = await request(app).get("/projects?limit=100"); expect(baseline.status).toBe(200); expect(baseline.body).toMatchObject({ total: 3 }); expect(deps.counter.count()).toBe(1);
    await deps.sql`UPDATE projects SET is_active = true, is_deleted = false`;
    await deps.sql`INSERT INTO project_members (project_id, member_id, role, contribution_count) SELECT p.id, m.id, 'Extra', 1 FROM projects p CROSS JOIN members m`;
    deps.counter.reset(); const r = await request(app).get("/projects?limit=100").auth("garbage", { type: "bearer" });
    expect(r.status).toBe(200); expect(r.body).toMatchObject({ total: 5 }); const rows = (r.body as { projects: { members: object[] }[] }).projects;
    expect(rows).toHaveLength(5); expect(rows.every(row => row.members.length >= 5)).toBe(true); expect(deps.counter.count()).toBe(1);
    expect(deps.counter.queries().some(query => query.includes("json_agg"))).toBe(true); expect(deps.counter.queries().every(query => !query.includes("hashed_password") && !query.includes('"users"'))).toBe(true);
  });
  test("featured, detail, slug and project members use at most 2 SQL", async () => {
    const app = createApp(deps);
    for (const path of ["/projects/featured", "/projects/1", "/projects/by-slug/macs-web-sitesi", "/projects/1/members", "/projects/categories"]) {
      deps.counter.reset(); const r = await request(app).get(path); expect(r.status).toBe(200); expect(deps.counter.count()).toBeGreaterThan(0); expect(deps.counter.count()).toBeLessThanOrEqual(2);
      expect(deps.counter.queries().every(query => !query.includes("hashed_password"))).toBe(true);
    }
    await deps.sql`UPDATE projects SET is_featured = false`;
    deps.counter.reset(); const fallback = await request(app).get("/projects/featured"); expect(fallback.status).toBe(200); expect(fallback.body).toMatchObject({ id: 5 }); expect(deps.counter.count()).toBeLessThanOrEqual(2);
  });
  test("create is atomic including project insert, earlier memberships and featured flags", async () => {
    const r = await request(createApp(deps)).post("/projects").auth(await mod(), { type: "bearer" }).send({ title: "Atomic", is_featured: true, member_ids: [{ member_id: 4 }, { member_id: 999 }] });
    expect(r.status).toBe(404); expect(r.body).toEqual({ detail: "Member ID 999 bulunamadı" });
    expect(await deps.sql`SELECT id FROM projects ORDER BY id`).toHaveLength(5);
    expect(await deps.sql`SELECT id FROM project_members ORDER BY id`).toHaveLength(6);
    expect([...(await deps.sql`SELECT id FROM projects WHERE is_featured = true`)]).toEqual([{ id: 1 }]);
  });
  test("update is atomic including scalar fields, old memberships and featured flags", async () => {
    const r = await request(createApp(deps)).put("/projects/2").auth(await mod(), { type: "bearer" }).send({ title: "Changed", is_featured: true, member_ids: [{ member_id: 4 }, { member_id: 999 }] });
    expect(r.status).toBe(404); expect(r.body).toEqual({ detail: "Member ID 999 bulunamadı" });
    expect([...(await deps.sql`SELECT title, slug, is_featured, updated_at FROM projects WHERE id = 2`)]).toEqual([{ title: "Mobil Uygulama", slug: "mobil-uygulama", is_featured: false, updated_at: null }]);
    expect([...(await deps.sql`SELECT id, member_id, contribution_count FROM project_members WHERE project_id = 2`)]).toEqual([{ id: 3, member_id: 1, contribution_count: 1 }]);
    expect([...(await deps.sql`SELECT id FROM projects WHERE is_featured = true`)]).toEqual([{ id: 1 }]);
  });
  test("used category deletion nulls all associated projects including hidden ones and stamps updated_at", async () => {
    const r = await request(createApp(deps)).delete("/projects/categories/1").auth(await mod(), { type: "bearer" }); expect(r.status).toBe(204);
    expect([...(await deps.sql`SELECT id FROM project_categories WHERE id = 1`)]).toEqual([]);
    expect([...(await deps.sql`SELECT id FROM projects WHERE id IN (1,3,4) AND category_id IS NULL AND updated_at IS NOT NULL ORDER BY id`)]).toEqual([{ id: 1 }, { id: 3 }, { id: 4 }]);
    expect([...(await deps.sql`SELECT category_id, updated_at FROM projects WHERE id = 2`)]).toEqual([{ category_id: 2, updated_at: null }]);
  });
  test("category delete rollback preserves project categories and timestamps if delete fails", async () => {
    const repo = await import("../../src/modules/projects/queries"); const service = await import("../../src/modules/projects/service");
    const remove = spyOn(repo, "deleteCategoryRow").mockImplementation(() => { throw new Error("injected category delete failure"); });
    try {
      let failure: unknown;
      try { await service.deleteProjectCategory(deps.db, 1); } catch (error: unknown) { failure = error; }
      expect(failure).toBeInstanceOf(Error); expect(failure).toMatchObject({ message: "injected category delete failure" });
    }
    finally { remove.mockRestore(); }
    const rows = await deps.sql<{ id: number; category_id: number; updated_at: string | null }[]>`SELECT id, category_id, updated_at FROM projects WHERE id IN (1,3,4) ORDER BY id`;
    expect([...rows]).toEqual([{ id: 1, category_id: 1, updated_at: null }, { id: 3, category_id: 1, updated_at: null }, { id: 4, category_id: 1, updated_at: null }]);
    expect(await deps.sql`SELECT id FROM project_categories WHERE id = 1`).toHaveLength(1);
  });
  test("admin domain list also uses exactly one CTE SQL and preserves inactive projects", async () => {
    const { listProjectsJson } = await import("../../src/modules/projects/queries"); const { adminProjectQuerySchema } = await import("../../src/modules/projects/schemas");
    deps.counter.reset(); const r = JSON.parse(await listProjectsJson(deps.db, adminProjectQuerySchema.parse({}), true)) as { projects: { id: number }[]; total: number };
    expect(r.projects.map(row => row.id)).toEqual([5, 3, 2, 1]); expect(r.total).toBe(4); expect(deps.counter.count()).toBe(1);
  });
  test("admin HTTP list counts auth plus one CTE", async () => {
    const token = await mod(); deps.counter.reset();
    const r = await request(createApp(deps)).get("/projects/admin").auth(token, { type: "bearer" });
    expect(r.status).toBe(200); expect(r.body).toMatchObject({ total: 4 }); expect(deps.counter.count()).toBe(2);
  });
  test("missing and deleted project members return null and HTTP 404 (F15)", async () => {
    const { listProjectMembersJson } = await import("../../src/modules/projects/queries");
    for (const id of [4, 999999]) {
      expect(await listProjectMembersJson(deps.db, id)).toBeNull();
      const r = await request(createApp(deps)).get(`/projects/${String(id)}/members`);
      expect(r.status).toBe(404); expect(r.body).toEqual({ detail: "Proje bulunamadı" });
    }
  });
  test("every required body rejects missing JSON after authentication", async () => {
    const token = await mod(); const app = createApp(deps);
    for (const [method, path] of [["post", "/projects"], ["put", "/projects/1"], ["post", "/projects/categories"], ["put", "/projects/categories/1"], ["post", "/projects/1/members"], ["put", "/projects/1/members/1"]] as const) {
      const r = await request(app)[method](path).auth(token, { type: "bearer" });
      expect(r.status).toBe(422); expect(r.body).toMatchObject({ detail: [{ loc: ["body"], type: "missing" }] });
    }
  });
  test("PG JSON coerces NULL project booleans and json_agg member timestamps retain UTC microseconds", async () => {
    await deps.sql`UPDATE projects SET is_active = NULL, is_featured = NULL WHERE id = 1`;
    const app = createApp(deps); const r = await request(app).put("/projects/1").auth(await mod(), { type: "bearer" }).send({}); expect(r.status).toBe(200); expect(r.body).toMatchObject({ is_active: false, is_featured: false, is_deleted: false });
    const { getProjectJson } = await import("../../src/modules/projects/queries");
    await deps.sql`UPDATE projects SET is_deleted = NULL WHERE id = 1`;
    const json = await getProjectJson(deps.db, 1, { scope: "all", members: "embed" });
    expect(JSON.parse(json ?? "null")).toMatchObject({ is_active: false, is_featured: false, is_deleted: false,
      members: [{ created_at: "2026-01-01T12:00:00.123456Z" }, { created_at: "2026-01-02T12:00:00.123456Z" }] });
    await deps.sql`UPDATE projects SET is_active = true, is_deleted = false WHERE id = 1`;
    const detail = await request(app).get("/projects/1"); expect(detail.status).toBe(200); expect(detail.body).toMatchObject({ members: [{ created_at: "2026-01-01T12:00:00.123456Z" }, { created_at: "2026-01-02T12:00:00.123456Z" }] });
  });
  test("body integer and boolean coercions apply to category, memberships and contributions", async () => {
    const app = createApp(deps); const token = await mod();
    const r = await request(app).post("/projects").auth(token, { type: "bearer" }).send({ title: "Coercion", category_id: "1.0", is_active: "YES", is_featured: 0, member_ids: [{ member_id: true }] }); expect(r.status).toBe(201); expect(r.body).toMatchObject({ category_id: 1, is_active: true, is_featured: false, members: [] });
    const id = (r.body as { id: number }).id;
    const added = await request(app).post(`/projects/${String(id)}/members`).auth(token, { type: "bearer" }).send({ member_id: "2.0" }); expect(added.status).toBe(201); expect(added.body).toMatchObject({ member_id: 2, contribution_count: 1 });
    const updated = await request(app).put(`/projects/${String(id)}/members/1`).auth(token, { type: "bearer" }).send({ contribution_count: true }); expect(updated.status).toBe(200); expect(updated.body).toMatchObject({ contribution_count: 1 });
    for (const [path, json, loc, type] of [["/projects", { title: "bad", category_id: 1.2 }, ["body", "category_id"], "int_from_float"], ["/projects", { title: "bad", member_ids: [{ member_id: "bad" }] }, ["body", "member_ids", 0, "member_id"], "int_parsing"], ["/projects/1/members", { member_id: 1.2 }, ["body", "member_id"], "int_from_float"]] as const) {
      const bad = await request(app).post(path).auth(token, { type: "bearer" }).send(json); expect(bad.status).toBe(422); expect(bad.body).toMatchObject({ detail: [{ loc: [...loc], type }] });
    }
  });
  test("null status update preserves serialization failure and rollback", async () => {
    const r = await request(createApp(deps)).put("/projects/1").auth(await mod(), { type: "bearer" }).send({ status: null });
    expect(r.status).toBe(500);
    expect([...(await deps.sql`SELECT status::text, updated_at FROM projects WHERE id = 1`)]).toEqual([{ status: "COMPLETED", updated_at: null }]);
  });
  test("tied timestamps order by descending id; empty page preserves total", async () => {
    await deps.sql`UPDATE projects SET created_at = '2026-01-01 00:00:00+00'`;
    const app = createApp(deps); const r = await request(app).get("/projects"); expect(r.status).toBe(200); expect((r.body as { projects: { id: number }[] }).projects.map(row => row.id)).toEqual([5, 2, 1]);
    const empty = await request(app).get("/projects?skip=100&limit=2"); expect(empty.status).toBe(200); expect(empty.body).toEqual({ projects: [], total: 3, page: 51, size: 2 });
  });
});
