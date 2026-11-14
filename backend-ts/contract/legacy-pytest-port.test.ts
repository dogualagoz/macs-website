import { beforeEach, describe, expect, test } from "bun:test";
import { api, isDomainEnabled, login, resetState, SEED, signedToken } from "./client";
import type { Domain } from "./client";
import { normalizeZip } from "./normalize";

const domain = (name: Domain, fn: () => void) => { (isDomainEnabled(name) ? describe : describe.skip)(name, fn); };

const event = { title: "Moderator Etkinliği", start_time: "2026-05-01T10:00:00" };
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 112, 97, 121, 108, 111, 97, 100]);
const file = (name = "gecerli.png", bytes = png, type = "image/png") => ({ name, bytes, type });
async function register(email: string) {
  const r = await api("POST", "/auth/register", { json: { email, full_name: "Yeni Kullanıcı", password: SEED.password } });
  expect(r.status).toBe(200);
  return r.body as { id: number; status: string; role: string };
}
async function archive() {
  const r = await api("GET", "/api/upload/download-all", { token: await login(SEED.admin) });
  if (r.status === 404) {
    expect(r.body).toEqual({ detail: "Yüklenecek dosya bulunamadı" });
    return [];
  }
  expect(r.status).toBe(200);
  expect(r.headers.get("content-type")).toBe("application/zip");
  expect(r.body).toBeInstanceOf(Uint8Array);
  return normalizeZip(r.body as Uint8Array);
}

domain("auth", () => {
  beforeEach(resetState);
  test("test_register_creates_pending_account_without_privileges", async () => {
    const user = await register("yeni@example.com");
    expect(user.status).toBe("pending");
    expect(user.role).toBe("moderator");
    const r = await api("GET", `/users/${String(user.id)}`, { token: await login(SEED.admin) });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ email: "yeni@example.com", status: "pending", role: "moderator", is_active: true });
  });
  test("test_pending_account_cannot_log_in", async () => {
    await register("bekleyen@example.com");
    const r = await api("POST", "/auth/login", { form: { username: "bekleyen@example.com", password: SEED.password } });
    expect(r.status).toBe(403);
    expect(r.body).toEqual({ detail: "Hesabınız henüz onaylanmadı. Yönetici onayı bekleniyor." });
  });
});
domain("users", () => {
  beforeEach(resetState);
  test("test_approved_user_can_read_own_profile", async () => {
    const r = await api("GET", "/users/me", { token: await login(SEED.mod) });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ email: SEED.mod, status: "approved" });
  });
  test("test_rejected_user_is_denied", async () => {
    const r = await api("GET", "/users/me", { token: await signedToken(SEED.rejected) });
    expect(r.status).toBe(403);
    expect(r.body).toEqual({ detail: "Hesabınız henüz onaylanmadı" });
  });
  test("test_inactive_user_is_denied", async () => {
    const r = await api("GET", "/users/me", { token: await signedToken(SEED.inactive) });
    expect(r.status).toBe(401);
    expect(r.body).toEqual({ detail: "Hesap aktif değil" });
    expect(r.headers.get("www-authenticate")).toBe("Bearer");
  });
  test("test_missing_token_is_denied", async () => {
    const r = await api("GET", "/users/me");
    expect(r.status).toBe(401);
    expect(r.body).toEqual({ detail: "Not authenticated" });
    expect(r.headers.get("www-authenticate")).toBe("Bearer");
  });
  test("test_moderator_cannot_list_users", async () => {
    const r = await api("GET", "/users", { token: await login(SEED.mod) });
    expect(r.status).toBe(403);
    expect(r.body).toEqual({ detail: "Bu işlem için yetkiniz yok" });
  });
  test("test_admin_can_approve_pending_account", async () => {
    const user = await register("onay@example.com");
    const token = await login(SEED.admin);
    const r = await api("PATCH", `/users/${String(user.id)}/access`, { token, json: { status: "approved" } });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ id: user.id, status: "approved" });
    const stored = await api("GET", `/users/${String(user.id)}`, { token });
    expect(stored.status).toBe(200);
    expect(stored.body).toMatchObject({ status: "approved" });
    expect(await login("onay@example.com")).toBeString();
  });
  test("test_admin_cannot_change_own_access", async () => {
    const r = await api("PATCH", "/users/1/access", { token: await login(SEED.admin), json: { role: "moderator" } });
    expect(r.status).toBe(400);
    expect(r.body).toEqual({ detail: "Admin kendi erişim ayarlarını değiştiremez" });
  });
});
domain("events", () => {
  beforeEach(resetState);
  test("test_self_registered_account_cannot_create_events", async () => {
    await register("sizma@example.com");
    const r = await api("POST", "/events", { token: await signedToken("sizma@example.com"), json: event });
    expect(r.status).toBe(403);
    expect(r.body).toEqual({ detail: "Hesabınız henüz onaylanmadı" });
  });
  test("test_moderator_can_create_event", async () => {
    const r = await api("POST", "/events", { token: await login(SEED.mod), json: event });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ ...event, created_by: 2, is_active: true, is_deleted: false });
  });
  test("test_moderator_cannot_hard_delete_event", async () => {
    const created = await api("POST", "/events", { token: await login(SEED.admin), json: event });
    expect(created.status).toBe(201);
    const id = (created.body as { id: number }).id;
    const r = await api("DELETE", `/events/${String(id)}/hard`, { token: await login(SEED.mod) });
    expect(r.status).toBe(403);
    expect((await api("GET", `/events/${String(id)}`)).status).toBe(200);
  });
  test("test_admin_can_hard_delete_event", async () => {
    const token = await login(SEED.admin);
    const created = await api("POST", "/events", { token, json: event });
    expect(created.status).toBe(201);
    const id = (created.body as { id: number }).id;
    const r = await api("DELETE", `/events/${String(id)}/hard`, { token });
    expect(r.status).toBe(204);
    expect(r.text).toBe("");
    expect((await api("GET", `/events/${String(id)}`)).status).toBe(404);
  });
  test("test_anonymous_cannot_create_event", async () => {
    const r = await api("POST", "/events", { json: event });
    expect(r.status).toBe(401);
    expect(r.headers.get("www-authenticate")).toBe("Bearer");
  });
  test("test_unknown_sort_field_is_rejected", async () => {
    expect((await api("GET", "/events?sort_by=hashed_password")).status).toBe(400);
  });
  test("test_allowed_sort_field_works", async () => {
    const r = await api("GET", "/events?sort_by=title");
    expect(r.status).toBe(200);
    expect((r.body as { title: string }[]).map(x => x.title)).toEqual(["Bahar Şenliği", "Çağrı: Ödüllü Yarışma", "Geçmiş Atölye", "Yakın Etkinlik"]);
  });
  test("test_limit_above_cap_is_rejected[/events]", async () => {
    expect((await api("GET", "/events?limit=1000000")).status).toBe(422);
  });
  test("test_negative_skip_is_rejected", async () => {
    expect((await api("GET", "/events?skip=-1")).status).toBe(422);
  });
});
domain("sponsors", () => {
  beforeEach(resetState);
  test("test_limit_above_cap_is_rejected[/sponsors/]", async () => {
    expect((await api("GET", "/sponsors/?limit=1000000")).status).toBe(422);
  });
});
domain("uploads", () => {
  beforeEach(resetState);
  test("test_upload_requires_authentication", async () => {
    expect((await api("POST", "/api/upload/", { file: file() })).status).toBe(401);
  });
  test("test_upload_rejects_non_image_extension", async () => {
    const r = await api("POST", "/api/upload/", { token: await login(SEED.mod), file: file("script.sh", new TextEncoder().encode("#!/bin/sh\n"), "text/plain") });
    expect(r.status).toBe(400);
  });
  test("test_upload_rejects_content_that_is_not_really_an_image", async () => {
    const r = await api("POST", "/api/upload/", { token: await login(SEED.mod), file: file("sahte.png", new TextEncoder().encode("MZ\u0090\u0000 not a png")) });
    expect(r.status).toBe(400);
    expect(r.body).toEqual({ detail: "Dosya içeriği geçerli bir resim değil" });
  });
  test("test_upload_rejects_oversized_file", async () => {
    const before = await archive();
    const bytes = new Uint8Array(5 * 1024 * 1024 + 1);
    bytes.set(png.subarray(0, 8));
    const r = await api("POST", "/api/upload/", { token: await login(SEED.mod), file: file("buyuk.png", bytes) });
    expect(r.status).toBe(413);
    expect(r.body).toEqual({ detail: "Dosya çok büyük. Sınır: 5 MB" });
    expect(await archive()).toEqual(before);
  });
  test("test_upload_accepts_valid_png", async () => {
    const before = await archive();
    const r = await api("POST", "/api/upload/", { token: await login(SEED.mod), file: file() });
    expect(r.status).toBe(200);
    const { url } = r.body as { url: string };
    expect(url).toMatch(/^\/uploads\/[\da-f-]{36}\.png$/);
    const downloaded = await api("GET", url);
    expect(downloaded.status).toBe(200);
    expect(downloaded.body).toEqual(png);
    const after = await archive();
    expect(after.length).toBe(before.length + 1);
    expect(after.filter(entry => !before.some(previous => previous.name === entry.name))).toEqual([{ name: url.slice("/uploads/".length), data: Buffer.from(png).toString("base64") }]);
  });
  test("test_rejected_upload_leaves_no_file_behind", async () => {
    const before = await archive();
    const r = await api("POST", "/api/upload/", { token: await login(SEED.mod), file: file("sahte.png", new TextEncoder().encode("not a png at all")) });
    expect(r.status).toBe(400);
    expect(await archive()).toEqual(before);
  });
});

domain("projects", () => {
  beforeEach(resetState);
  test("used_project_category_delete_is_204_parity", async () => {
    const before = await api("GET", "/projects/1");
    expect(before.status).toBe(200);
    expect(before.body).toMatchObject({ id: 1, category_id: 1 });
    const removed = await api("DELETE", "/projects/categories/1", { token: await login(SEED.admin) });
    expect(removed.status).toBe(204);
    expect(removed.text).toBe("");
    const category = await api("GET", "/projects/categories/1");
    expect(category.status).toBe(404);
    expect(category.body).toEqual({ detail: "Kategori bulunamadı" });
    const project = await api("GET", "/projects/1");
    expect(project.status).toBe(200);
    expect(project.body).toMatchObject({ id: 1, title: "MACS Web Sitesi", category_id: null, category: null });
  });
});
