import { beforeEach, describe, expect, test } from "bun:test";
import { api, resetState, SEED, signedToken, TARGET_KIND } from "./client";
import { deviation } from "./deviations";

interface ProjectBody { id: number; slug: string; members: { id: number; project_role: string | null; created_at: string }[] }
interface ProjectList { projects: ProjectBody[]; total: number; page: number; size: number }
const mod = () => signedToken(SEED.mod);
const ids = (body: unknown) => (body as ProjectList).projects.map(row => row.id);
const keys = ["title", "description", "content", "image_url", "technologies", "github_url", "live_url", "status", "project_type", "category_id", "team_members", "started_at", "completed_at", "is_active", "is_featured", "id", "slug", "created_by", "members", "is_deleted", "created_at", "updated_at", "category"].sort();

describe("projects contract", () => {
  beforeEach(resetState);
  test("default list has exact shape, embedded members and category", async () => {
    const r = await api("GET", "/projects"); expect(r.status).toBe(200); expect(ids(r.body)).toEqual([5, 2, 1]);
    expect(r.body).toMatchObject({ total: 3, page: 1, size: 10 });
    const rows = (r.body as ProjectList).projects; const row = rows.find(row => row.id === 1);
    expect(Object.keys(row ?? {}).sort()).toEqual(keys);
    expect(row).toMatchObject({ status: "COMPLETED", project_type: "DEVELOPED_BY_MACS", category: { icon: "globe" }, members: [
      { id: 1, full_name: "Ayşe Yılmaz", profile_image: null, is_active: true, created_at: "2026-01-01T12:00:00.123456Z", project_role: "Lead" },
      { id: 2, full_name: "Mehmet Öz", profile_image: null, is_active: true, created_at: "2026-01-02T12:00:00.123456Z", project_role: "Designer" },
    ] });
    // Deviation k: old SQLAlchemy shares Member 1 with project 1 and leaks its Lead role.
    expect(rows.find(row => row.id === 2)?.members[0]?.project_role).toBe(deviation("k", { old: "Lead", new: null }));
  });
  test.each([["skip=2&limit=2", [1]], ["status=COMPLETED", [1]], ["search=mobil", [2]], ["category_id=1", [1]], ["category_id=0", [5, 2, 1]], ["status=", [5, 2, 1]]] as const)("list filter %s", async (query, expected) => {
    const r = await api("GET", `/projects?${query}`); expect(r.status).toBe(200); expect(ids(r.body)).toEqual([...expected]);
    if (query === "skip=2&limit=2") expect(r.body).toMatchObject({ page: 2, size: 2, total: 3 });
  });
  test("invalid status is explicit deviation f on public and admin lists", async () => {
    for (const path of ["/projects", "/projects/admin"]) {
      const r = await api("GET", `${path}?status=BOGUS`, { token: await mod() }); expect(r.status).toBe(deviation("f", { old: 500, new: 422 }));
      if (TARGET_KIND === "new") expect(r.body).toMatchObject({ detail: [{ type: "enum", loc: ["query", "status"], input: "BOGUS" }] });
    }
  });
  test.each(["limit=101", "limit=0", "skip=-1", "category_id=no"])("list validation %s", async query => { expect((await api("GET", `/projects?${query}`)).status).toBe(422); });
  test("admin pagination includes inactive projects and requires staff", async () => {
    expect((await api("GET", "/projects/admin")).status).toBe(401);
    const r = await api("GET", "/projects/admin", { token: await mod() }); expect(r.status).toBe(200); expect(ids(r.body)).toEqual([5, 3, 2, 1]); expect(r.body).toMatchObject({ total: 4, size: 50 });
    expect((await api("GET", "/projects/admin?limit=201", { token: await mod() })).status).toBe(422);
  });
  test("public GETs ignore garbage Authorization", async () => {
    for (const path of ["/projects", "/projects/categories", "/projects/categories/1", "/projects/featured", "/projects/by-slug/macs-web-sitesi", "/projects/1", "/projects/1/members"]) expect((await api("GET", path, { token: "garbage" })).status).toBe(200);
  });
  test("featured embeds members, falls back to newest and returns exact 404", async () => {
    const token = await mod(); const r = await api("GET", "/projects/featured"); expect(r.status).toBe(200); expect(r.body).toMatchObject({ id: 1 }); expect((r.body as ProjectBody).members).toHaveLength(2);
    expect((await api("PUT", "/projects/1", { token, json: { is_featured: false } })).status).toBe(200);
    expect((await api("GET", "/projects/featured")).body).toMatchObject({ id: 5 });
    for (const id of [1, 2, 5]) expect((await api("DELETE", `/projects/${String(id)}`, { token })).status).toBe(204);
    const missing = await api("GET", "/projects/featured"); expect(missing.status).toBe(404); expect(missing.body).toEqual({ detail: "Öne çıkan proje bulunamadı" });
  });
  test.each(["/projects/3", "/projects/4", "/projects/999", "/projects/by-slug/yok", "/projects/by-slug/pasif-proje"])("hidden or missing detail %s", async path => {
    const r = await api("GET", path); expect(r.status).toBe(404); expect(r.body).toEqual({ detail: "Proje bulunamadı" });
  });
  test("slug detail embeds members", async () => { const r = await api("GET", "/projects/by-slug/macs-web-sitesi"); expect(r.status).toBe(200); expect(r.body).toMatchObject({ id: 1 }); expect((r.body as ProjectBody).members).toHaveLength(2); });
  test("writes require approved staff", async () => {
    for (const [method, path, json] of [["POST", "/projects", { title: "x" }], ["PUT", "/projects/1", {}], ["DELETE", "/projects/1", undefined], ["POST", "/projects/categories", { name: "x" }], ["PUT", "/projects/categories/1", {}], ["DELETE", "/projects/categories/1", undefined], ["POST", "/projects/1/members", { member_id: 4 }], ["PUT", "/projects/1/members/1", {}], ["DELETE", "/projects/1/members/1", undefined]] as const) {
      expect((await api(method, path, { ...(json ? { json } : {}) })).status).toBe(401);
      expect((await api(method, path, { token: await signedToken(SEED.pending), ...(json ? { json } : {}) })).status).toBe(403);
    }
  });
  test("minimal create uses defaults and empty members", async () => {
    const r = await api("POST", "/projects", { token: await mod(), json: { title: "Yeni Proje" } }); expect(r.status).toBe(201);
    expect(Object.keys(r.body as object).sort()).toEqual(keys);
    expect(r.body).toMatchObject({ slug: "yeni-proje", status: "PLANNING", project_type: "DEVELOPED_BY_MACS", is_active: true, is_featured: false, is_deleted: false, created_by: 2, members: [], category: null });
  });
  test("create members returns empty, reads embed roles, duplicates are retained", async () => {
    const r = await api("POST", "/projects", { token: await mod(), json: { title: "Üyeli", member_ids: [{ member_id: 1, role: "Dev" }, { member_id: 1, role: "Dev" }] } }); expect(r.status).toBe(201); expect(r.body).toMatchObject({ members: [] });
    const id = (r.body as ProjectBody).id; const detail = await api("GET", `/projects/${String(id)}`); expect(detail.status).toBe(200); expect((detail.body as ProjectBody).members).toHaveLength(2); expect((detail.body as ProjectBody).members[0]?.project_role).toBe("Dev");
    const memberships = await api("GET", `/projects/${String(id)}/members`); expect(memberships.status).toBe(200); expect(memberships.body).toMatchObject([{ contribution_count: 1 }, { contribution_count: 1 }]);
  });
  test("unknown member create rolls back project on new target (P6)", async () => {
    const token = await mod(); const r = await api("POST", "/projects", { token, json: { title: "Atomic", member_ids: [{ member_id: 999 }] } });
    expect(r.status).toBe(404); expect(r.body).toEqual({ detail: "Member ID 999 bulunamadı" });
    expect((await api("GET", "/projects/admin", { token })).body).toMatchObject({ total: deviation("P6", { old: 5, new: 4 }) });
  });
  test("category lookup uses create 404 and update 400", async () => {
    const token = await mod(); for (const [method, path, json, status] of [["POST", "/projects", { title: "x", category_id: 999 }, 404], ["PUT", "/projects/1", { category_id: 999 }, 400]] as const) {
      const r = await api(method, path, { token, json }); expect(r.status).toBe(status); expect(r.body).toEqual({ detail: "Belirtilen kategori bulunamadı" });
    }
  });
  test.each([["status", "X"], ["project_type", "X"], ["category_id", "bad"], ["is_active", "bad"], ["started_at", "bad"]] as const)("create validates %s", async (field, value) => {
    const r = await api("POST", "/projects", { token: await mod(), json: { title: "x", [field]: value } }); expect(r.status).toBe(422); expect(r.body).toMatchObject({ detail: [{ loc: ["body", field] }] });
  });
  test("duplicate slug timestamp and featured uniqueness", async () => {
    const token = await mod(); const r = await api("POST", "/projects", { token, json: { title: "MACS Web Sitesi", is_featured: true } }); expect(r.status).toBe(201); expect((r.body as ProjectBody).slug).toMatch(/^macs-web-sitesi-\d{8}-\d{6}$/);
    expect((await api("GET", "/projects/1")).body).toMatchObject({ is_featured: false });
  });
  test("update keeps identical slug, handles naive dates and all content fields", async () => {
    const r = await api("PUT", "/projects/1", { token: await mod(), json: { title: "MACS Web Sitesi", description: "A", content: "B", image_url: "/x", technologies: "TS", github_url: "repo", live_url: "live", team_members: "legacy", started_at: "2026-01-05T00:00:00", completed_at: "2026-02-05T00:00:00", status: "ON_HOLD", project_type: "MEMBER_SHOWCASE" } });
    expect(r.status).toBe(200); expect(r.body).toMatchObject({ slug: "macs-web-sitesi", description: "A", content: "B", image_url: "/x", technologies: "TS", github_url: "repo", live_url: "live", team_members: "legacy", started_at: "2026-01-05T00:00:00", completed_at: "2026-02-05T00:00:00", status: "ON_HOLD", project_type: "MEMBER_SHOWCASE", members: [] });
  });
  test("update replaces and clears memberships and allows inactive projects", async () => {
    const token = await mod(); const r = await api("PUT", "/projects/1", { token, json: { member_ids: [{ member_id: 4, role: "QA" }] } }); expect(r.status).toBe(200); expect(r.body).toMatchObject({ members: [] });
    const memberships = await api("GET", "/projects/1/members"); expect(memberships.status).toBe(200); expect(memberships.body).toMatchObject([{ member_id: 4, role: "QA", contribution_count: 1 }]); expect(memberships.body as object[]).toHaveLength(1);
    expect((await api("PUT", "/projects/1", { token, json: { member_ids: [] } })).status).toBe(200); expect((await api("GET", "/projects/1/members")).body).toEqual([]);
    expect((await api("PUT", "/projects/3", { token, json: { description: "inactive" } })).status).toBe(200);
  });
  test("update changes title and featured, clears category and handles missing project", async () => {
    const token = await mod(); const r = await api("PUT", "/projects/2", { token, json: { title: "Yeni Ad", is_featured: true, category_id: null } }); expect(r.status).toBe(200); expect(r.body).toMatchObject({ slug: "yeni-ad", is_featured: true, category: null, category_id: null });
    expect((await api("GET", "/projects/1")).body).toMatchObject({ is_featured: false });
    const missing = await api("PUT", "/projects/4", { token, json: {} }); expect(missing.status).toBe(404); expect(missing.body).toEqual({ detail: "Proje bulunamadı" });
  });
  test("soft delete and admin-only hard delete cascade member projects", async () => {
    const token = await mod(); expect((await api("DELETE", "/projects/1", { token })).status).toBe(204);
    for (const method of ["GET", "DELETE"]) { const r = await api(method, "/projects/1", { token }); expect(r.status).toBe(404); expect(r.body).toEqual({ detail: "Proje bulunamadı" }); }
    expect((await api("DELETE", "/projects/1/hard", { token })).status).toBe(403);
    expect((await api("DELETE", "/projects/1/hard", { token: await signedToken(SEED.admin, "admin") })).status).toBe(204);
    const memberships = await api("GET", "/members/1/projects"); expect(memberships.status).toBe(200); expect((memberships.body as { project_id: number }[]).some(row => row.project_id === 1)).toBe(false);
    const missing = await api("DELETE", "/projects/1/hard", { token: await signedToken(SEED.admin, "admin") }); expect(missing.status).toBe(404); expect(missing.body).toEqual({ detail: "Proje bulunamadı" });
  });
  test("project members shape, inactive project allowed, deleted project hidden", async () => {
    const r = await api("GET", "/projects/1/members"); expect(r.status).toBe(200); expect(r.body as object[]).toHaveLength(2);
    expect((r.body as object[])[0]).toEqual({ id: 1, project_id: 1, member_id: 1, role: "Lead", contribution_count: 5, member: { id: 1, full_name: "Ayşe Yılmaz", profile_image: null, is_active: true } });
    const inactive = await api("GET", "/projects/3/members"); expect(inactive.status).toBe(200); expect(inactive.body as object[]).toHaveLength(1);
    const deleted = await api("GET", "/projects/4/members"); expect(deleted.status).toBe(404); expect(deleted.body).toEqual({ detail: "Proje bulunamadı" });
  });
  test("add member exact response, duplicate and missing member errors", async () => {
    const token = await mod(); const r = await api("POST", "/projects/2/members", { token, json: { member_id: 2, role: "Tester" } }); expect(r.status).toBe(201); expect(r.body).toEqual({ id: 7, project_id: 2, member_id: 2, role: "Tester", contribution_count: 1, message: "Member başarıyla projeye eklendi" });
    for (const [member_id, status, detail] of [[1, 400, "Bu member zaten projeye ekli"], [999, 404, "Member ID 999 bulunamadı"]] as const) { const fail = await api("POST", "/projects/2/members", { token, json: { member_id } }); expect(fail.status).toBe(status); expect(fail.body).toEqual({ detail }); }
    const missing = await api("POST", "/projects/4/members", { token, json: { member_id: 2 } }); expect(missing.status).toBe(404); expect(missing.body).toEqual({ detail: "Proje bulunamadı" });
  });
  test("update member preserves omitted/null fields, changes role and contribution", async () => {
    const token = await mod(); const r = await api("PUT", "/projects/1/members/1", { token, json: { role: null, contribution_count: "100.0" } }); expect(r.status).toBe(200); expect(r.body).toEqual({ id: 1, project_id: 1, member_id: 1, role: "Lead", contribution_count: 100, message: "Member bilgileri güncellendi" });
    const updated = await api("PUT", "/projects/1/members/1", { token, json: { role: "Senior", contribution_count: null } }); expect(updated.status).toBe(200); expect(updated.body).toMatchObject({ role: "Senior", contribution_count: 100 });
    const missing = await api("PUT", "/projects/1/members/4", { token, json: {} }); expect(missing.status).toBe(404); expect(missing.body).toEqual({ detail: "Bu member bu projede bulunamadı" });
  });
  test("remove member and missing relation error", async () => {
    const token = await mod(); const r = await api("DELETE", "/projects/1/members/1", { token }); expect(r.status).toBe(204); expect(r.text).toBe("");
    const missing = await api("DELETE", "/projects/1/members/1", { token }); expect(missing.status).toBe(404); expect(missing.body).toEqual({ detail: "Bu member bu projede bulunamadı" });
  });
  test("member HTTP deletion cascades to project members (F06)", async () => {
    expect((await api("DELETE", "/members/1", { token: await mod() })).status).toBe(204);
    const r = await api("GET", "/projects/1/members"); expect(r.status).toBe(200); expect((r.body as { member_id: number }[]).map(row => row.member_id)).toEqual([2]);
    expect((await api("GET", "/projects/1")).body).toMatchObject({ members: [{ id: 2 }] });
  });
  test("categories CRUD, duplicate name and used category deletion parity (F07)", async () => {
    const token = await mod(); const listed = await api("GET", "/projects/categories"); expect(listed.status).toBe(200); expect((listed.body as { id: number }[]).map(row => row.id)).toEqual([1, 2]);
    const dup = await api("POST", "/projects/categories", { token, json: { name: "Web" } }); expect(dup.status).toBe(400); expect(dup.body).toEqual({ detail: "Bu isimde bir kategori zaten mevcut" });
    const created = await api("POST", "/projects/categories", { token, json: { name: "New", description: "d", icon: "i" } }); expect(created.status).toBe(201); expect(created.body).toMatchObject({ id: 3, description: "d", icon: "i", updated_at: null });
    const updated = await api("PUT", "/projects/categories/3", { token, json: { description: null, icon: "x" } }); expect(updated.status).toBe(200); expect(updated.body).toMatchObject({ name: "New", description: null, icon: "x" });
    for (const id of [1, 3]) { const deleted = await api("DELETE", `/projects/categories/${String(id)}`, { token }); expect(deleted.status).toBe(204); expect(deleted.text).toBe(""); }
    const project = await api("GET", "/projects/1"); expect(project.status).toBe(200); expect(project.body).toMatchObject({ category_id: null, category: null }); expect((project.body as { updated_at: string }).updated_at).toMatch(/Z$/);
    expect((await api("GET", "/projects/categories")).body).toMatchObject([{ id: 2 }]);
    for (const [method, json] of [["GET", undefined], ["PUT", {}], ["DELETE", undefined]] as const) { const r = await api(method, "/projects/categories/1", { token, ...(json ? { json } : {}) }); expect(r.status).toBe(404); expect(r.body).toEqual({ detail: "Kategori bulunamadı" }); }
  });
});
