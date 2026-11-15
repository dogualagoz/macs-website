import { beforeEach, describe, expect, test } from "bun:test";
import { SignJWT } from "jose";
import { api, resetState, SEED, signedToken, TARGET_KIND, TARGET_URL } from "./client";

interface EventBody { id: number; title: string; slug: string; creator: { id: number; email: string } | null }
const input = { title: "Moderator Etkinliği", start_time: "2026-05-01T10:00:00" };
const eventKeys = ["title", "description", "content", "image_url", "location", "registration_link", "directions_link", "start_time", "end_time", "category_id", "is_active", "is_featured", "id", "slug", "created_by", "creator", "is_deleted", "created_at", "updated_at", "category"].sort();
const mod = () => signedToken(SEED.mod);
const ids = (body: unknown) => (body as EventBody[]).map(row => row.id);

describe("events contract", () => {
  beforeEach(resetState);
  test("default list orders active undeleted events and exposes exact response shape", async () => {
    const r = await api("GET", "/events"); expect(r.status).toBe(200); expect(ids(r.body)).toEqual([2, 6, 5, 1]);
    const rows = r.body as EventBody[]; const row = rows.find(row => row.id === 1);
    expect(Object.keys(row ?? {}).sort()).toEqual(eventKeys);
    expect(row).toMatchObject({ start_time: "2099-05-01T11:00:00", created_at: "2026-01-01T12:00:00.123456Z", updated_at: null,
      category: { id: 1, name: "Workshop", description: null, created_at: "2026-01-01T12:00:00.123456Z", updated_at: null }, creator: { email: SEED.mod } });
    expect(row?.creator).not.toHaveProperty("hashed_password");
    expect(rows.find(row => row.id === 5)).toMatchObject({ category: null, category_id: null, end_time: "2099-04-01T17:00:00" });
  });
  test.each([["status=upcoming", [6, 5, 1]], ["status=past", [2]], ["search=BAHAR", [1]], ["category_id=1", [2, 1]], ["category_id=0", [2, 6, 5, 1]], ["skip=1&limit=2", [6, 5]], ["sort_by=title&sort_desc=true", [6, 2, 5, 1]]] as const)("list query %s", async (query, expected) => {
    const r = await api("GET", `/events?${query}`); expect(r.status).toBe(200); expect(ids(r.body)).toEqual([...expected]);
  });
  test("invalid status returns FastAPI enum error", async () => {
    const r = await api("GET", "/events?status=x"); expect(r.status).toBe(422);
    expect(r.body).toMatchObject({ detail: [{ type: "enum", loc: ["query", "status"], msg: "Input should be 'all', 'upcoming' or 'past'", input: "x" }] });
  });
  test("unknown sort rejected", async () => {
    const r = await api("GET", "/events?sort_by=hashed_password"); expect(r.status).toBe(400);
    expect(r.body).toEqual({ detail: "Geçersiz sıralama alanı. İzin verilenler: start_time, title, created_at" });
  });
  test.each([["limit=1000000", "less_than_equal", "limit"], ["skip=-1", "greater_than_equal", "skip"]])("pagination validation %s", async (query, type, field) => {
    const r = await api("GET", `/events?${query}`); expect(r.status).toBe(422); expect(r.body).toMatchObject({ detail: [{ type, loc: ["query", field] }] });
  });
  test("every public GET ignores garbage and expired Authorization", async () => {
    const expired = await new SignJWT({ sub: SEED.mod, role: "moderator" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime(1)
      .sign(new TextEncoder().encode("contract-secret-key-that-is-long-enough"));
    for (const token of ["abc", expired]) for (const path of ["/events", "/events/featured", "/events/1", "/events/by-slug/bahar-senligi", "/events/categories", "/events/categories/1"]) {
      const r = await api("GET", path, { token }); expect(r.status).toBe(200);
    }
  });
  test("admin list requires staff and includes inactive events", async () => {
    const denied = await api("GET", "/events/admin"); expect(denied.status).toBe(401); expect(denied.body).toEqual({ detail: "Not authenticated" });
    const r = await api("GET", "/events/admin", { token: await mod() }); expect(r.status).toBe(200); expect(ids(r.body)).toEqual([2, 6, 5, 1, 3]);
  });
  test("featured uses flagged event then nearest future event then null", async () => {
    const token = await mod(); const flagged = await api("GET", "/events/featured"); expect(flagged.status).toBe(200); expect(flagged.body).toMatchObject({ id: 1 });
    expect((await api("PUT", "/events/1", { token, json: { is_featured: false } })).status).toBe(200);
    expect((await api("GET", "/events/featured")).body).toMatchObject({ id: 6 });
    for (const id of [1, 5, 6]) expect((await api("DELETE", `/events/${String(id)}`, { token })).status).toBe(200);
    const empty = await api("GET", "/events/featured"); expect(empty.status).toBe(200); expect(empty.body).toBeNull();
  });
  test.each([["/events/by-slug/bahar-senligi", 200], ["/events/by-slug/yok", 404], ["/events/by-slug/pasif-etkinlik", 404], ["/events/3", 404], ["/events/4", 404], ["/events/999", 404]] as const)("detail %s", async (path, status) => {
    const r = await api("GET", path); expect(r.status).toBe(status); if (status === 404) expect(r.body).toEqual({ detail: "Event bulunamadı" });
  });
  test("create requires staff", async () => {
    const anonymous = await api("POST", "/events", { json: input }); expect(anonymous.status).toBe(401); expect(anonymous.body).toEqual({ detail: "Not authenticated" });
    const pending = await api("POST", "/events", { token: await signedToken(SEED.pending), json: input }); expect(pending.status).toBe(403); expect(pending.body).toEqual({ detail: "Hesabınız henüz onaylanmadı" });
  });
  test("create minimal uses defaults and embedded creator", async () => {
    const r = await api("POST", "/events", { token: await mod(), json: input }); expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ ...input, slug: "moderator-etkinligi", created_by: 2, is_active: true, is_featured: false, is_deleted: false, end_time: null, category: null, creator: { id: 2 } });
    expect(Object.keys(r.body as object).sort()).toEqual(eventKeys);
  });
  test.each([["2026-05-01T10:00", "2026-05-01T10:00:00"], ["2026-05-01T10:00:00Z", "2026-05-01T10:00:00"], ["2026-05-01T10:00:00+03:00", "2026-05-01T07:00:00"]])("create datetime %s", async (start_time, expected) => {
    const r = await api("POST", "/events", { token: await mod(), json: { ...input, start_time } }); expect(r.status).toBe(201); expect(r.body).toMatchObject({ start_time: expected });
  });
  test("create invalid schema and malformed JSON return 400", async () => {
    const token = await mod();
    for (const json of [{ title: "x" }, { ...input, start_time: "bad" }]) { const r = await api("POST", "/events", { token, json }); expect(r.status).toBe(400); expect(r.body).toEqual({ detail: "Geçersiz istek gövdesi" }); }
    const malformed = await fetch(`${TARGET_URL}/events`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: "{" });
    expect(malformed.status).toBe(400); expect(await malformed.json()).toEqual({ detail: "Geçersiz istek gövdesi" });
  });
  test("create unknown category and duplicate title", async () => {
    const token = await mod(); const missing = await api("POST", "/events", { token, json: { ...input, category_id: 999 } });
    expect(missing.status).toBe(404); expect(missing.body).toEqual({ detail: "Belirtilen kategori bulunamadı" });
    const r = await api("POST", "/events", { token, json: { ...input, title: "Bahar Şenliği", category_id: "1" } }); expect(r.status).toBe(201);
    expect((r.body as EventBody).slug).toMatch(/^bahar-senligi-\d{8}-\d{6}$/); expect(r.body).toMatchObject({ category_id: 1, category: { id: 1 }, creator: { id: 2 } });
  });
  (TARGET_KIND === "new" ? test : test.skip)("empty slug base uses distinct timestamps (P3)", async () => {
    const token = await mod(); const first = await api("POST", "/events", { token, json: { ...input, title: "!!!" } });
    await new Promise(resolve => setTimeout(resolve, 1100));
    const second = await api("POST", "/events", { token, json: { ...input, title: "!!!" } });
    expect(first.status).toBe(201); expect(second.status).toBe(201);
    for (const r of [first, second]) expect((r.body as EventBody).slug).toMatch(/^\d{8}-\d{6}(-\d{8}-\d{6})?$/);
    expect((first.body as EventBody).slug).not.toBe((second.body as EventBody).slug);
  });
  test("create and update featured unset others", async () => {
    const token = await mod(); const r = await api("POST", "/events", { token, json: { ...input, is_featured: true } }); expect(r.status).toBe(201);
    expect((await api("GET", "/events/1")).body).toMatchObject({ is_featured: false });
    expect((await api("PUT", "/events/6", { token, json: { is_featured: true } })).status).toBe(200);
    expect((await api("GET", `/events/${String((r.body as EventBody).id)}`)).body).toMatchObject({ is_featured: false });
  });
  test("partial update preserves slug, updates timestamp, regenerates title slug, clears category", async () => {
    const token = await mod(); const r = await api("PUT", "/events/1", { token, json: { location: "B201" } }); expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ location: "B201", slug: "bahar-senligi" }); expect((r.body as { updated_at: string }).updated_at).toMatch(/Z$/);
    const same = await api("PUT", "/events/1", { token, json: { title: "Bahar Şenliği" } }); expect(same.status).toBe(200); expect(same.body).toMatchObject({ slug: "bahar-senligi" });
    const title = await api("PUT", "/events/1", { token, json: { title: "Yeni Ad" } }); expect(title.status).toBe(200); expect(title.body).toMatchObject({ slug: "yeni-ad" });
    const taken = await api("PUT", "/events/2", { token, json: { title: "Yeni Ad" } }); expect(taken.status).toBe(200); expect((taken.body as EventBody).slug).toMatch(/^yeni-ad-\d{8}-\d{6}$/);
    const clear = await api("PUT", "/events/1", { token, json: { category_id: null } }); expect(clear.status).toBe(200); expect(clear.body).toMatchObject({ category_id: null, category: null });
    const restore = await api("PUT", "/events/1", { token, json: { category_id: "1" } }); expect(restore.status).toBe(200); expect(restore.body).toMatchObject({ category_id: 1, category: { id: 1 } });
  });
  test("update supports inactive events and rejects deleted or missing category", async () => {
    const token = await mod(); expect((await api("PUT", "/events/3", { token, json: { location: "B201" } })).status).toBe(200);
    const deleted = await api("PUT", "/events/4", { token, json: {} }); expect(deleted.status).toBe(404); expect(deleted.body).toEqual({ detail: "Event bulunamadı" });
    const missing = await api("PUT", "/events/1", { token, json: { category_id: 999 } }); expect(missing.status).toBe(404); expect(missing.body).toEqual({ detail: "Belirtilen kategori bulunamadı" });
  });
  test("soft delete hides event and cannot be repeated", async () => {
    const token = await mod(); const r = await api("DELETE", "/events/1", { token }); expect(r.status).toBe(200); expect(r.body).toEqual({ message: "Event başarıyla silindi" });
    for (const method of ["GET", "DELETE"]) { const missing = await api(method, "/events/1", { token }); expect(missing.status).toBe(404); expect(missing.body).toEqual({ detail: "Event bulunamadı" }); }
  });
  test("hard delete requires admin and finds soft-deleted events", async () => {
    const denied = await api("DELETE", "/events/4/hard", { token: await mod() }); expect(denied.status).toBe(403); expect(denied.body).toEqual({ detail: "Bu işlem için yetkiniz yok" });
    const token = await signedToken(SEED.admin, "admin"); const r = await api("DELETE", "/events/4/hard", { token }); expect(r.status).toBe(204); expect(r.text).toBe("");
    const missing = await api("DELETE", "/events/4/hard", { token }); expect(missing.status).toBe(404); expect(missing.body).toEqual({ detail: "Event bulunamadı" });
  });
  test("categories CRUD preserves description on update and nulls associated events on delete", async () => {
    const token = await mod(); const listed = await api("GET", "/events/categories"); expect(listed.status).toBe(200); expect(ids(listed.body)).toEqual([1, 2]);
    const created = await api("POST", "/events/categories", { token, json: { name: "Yeni" } }); expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ id: 3, name: "Yeni", description: null, updated_at: null }); expect((created.body as { created_at: string }).created_at).toMatch(/Z$/);
    const updated = await api("PUT", "/events/categories/3", { token, json: { name: "X", description: "yok sayılır" } }); expect(updated.status).toBe(200); expect(updated.body).toMatchObject({ name: "X", description: null });
    for (const [method, json] of [["GET", undefined], ["PUT", { name: "X" }], ["DELETE", undefined]] as const) {
      const missing = await api(method, "/events/categories/999", { token, ...(json ? { json } : {}) });
      expect(missing.status).toBe(404); expect(missing.body).toEqual({ detail: "Kategori bulunamadı" });
    }
    const removed = await api("DELETE", "/events/categories/1", { token }); expect(removed.status).toBe(204); expect(removed.text).toBe("");
    expect((await api("GET", "/events/1")).body).toMatchObject({ category_id: null, category: null });
  });
});
