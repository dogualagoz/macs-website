import { beforeEach, describe, expect, test } from "bun:test";
import { api, login, resetState, SEED, signedToken, TARGET_KIND } from "./client";
import { deviation } from "./deviations";
import fixtures from "../test/fixtures/python-fixtures.json";
const change = { current_password: "parola123", new_password: "yeni123", confirm_password: "yeni123" };
describe("users contract", () => {
  beforeEach(resetState);
  test.each([[undefined, "Not authenticated"], ["abc", "Token geçersiz veya süresi dolmuş: "]] as const)("me rejects token %s", async (token, detail) => {
    const r = await api("GET", "/users/me", token ? { token } : {}); expect(r.status).toBe(401); expect((r.body as { detail: string }).detail).toStartWith(detail); expect(r.headers.get("www-authenticate")).toBe("Bearer");
  });
  test.each([[SEED.rejected, 403, "Hesabınız henüz onaylanmadı"], [SEED.inactive, 401, "Hesap aktif değil"]] as const)("me eligibility %s", async (email, status, detail) => {
    const r = await api("GET", "/users/me", { token: await signedToken(email) }); expect(r.status).toBe(status); expect(r.body).toEqual({ detail });
  });
  test("deleted user token is rejected", async () => {
    const token = await signedToken(SEED.pending); const admin = await login(SEED.admin);
    expect((await api("DELETE", "/users/3", { token: admin })).status).toBe(200);
    const r = await api("GET", "/users/me", { token }); expect(r.status).toBe(401); expect(r.body).toEqual({ detail: "Kimlik doğrulanamadı" }); expect(r.headers.get("www-authenticate")).toBe("Bearer");
  });
  test("access changes apply immediately to existing token", async () => {
    const token = await login(SEED.mod); const r = await api("PATCH", "/users/2/access", { token: await login(SEED.admin), json: { is_active: false } });
    expect(r.status).toBe(200); expect(r.body).toMatchObject({ is_active: false });
    const me = await api("GET", "/users/me", { token }); expect(me.status).toBe(401); expect(me.body).toEqual({ detail: "Hesap aktif değil" });
  });
  test("put me uses query name and ignores missing or empty name", async () => {
    const token = await login(SEED.mod);
    const updated = await api("PUT", "/users/me?full_name=Yeni%20Ad", { token }); expect(updated.status).toBe(200); expect(updated.body).toMatchObject({ full_name: "Yeni Ad" });
    for (const path of ["/users/me", "/users/me?full_name="]) { const r = await api("PUT", path, { token, json: { full_name: "Ignored" } }); expect(r.status).toBe(200); expect(r.body).toMatchObject({ full_name: "Yeni Ad" }); }
  });
  test.each([[{ ...change, current_password: "yanlis" }, "Mevcut şifre yanlış"], [{ ...change, new_password: "parola123", confirm_password: "parola123" }, "Yeni şifre eski şifre ile aynı olamaz"]])("password rejects invalid change %j", async (json, detail) => {
    const r = await api("POST", "/users/me/change-password", { token: await login(SEED.mod), json }); expect(r.status).toBe(400); expect(r.body).toEqual({ detail });
  });
  test("password confirmation mismatch is field validation", async () => {
    const r = await api("POST", "/users/me/change-password", { token: await login(SEED.mod), json: { ...change, confirm_password: "other" } });
    expect(r.status).toBe(422); expect(r.body).toMatchObject({ detail: [{ type: "value_error", loc: ["body", "confirm_password"], msg: "Value error, Şifreler eşleşmiyor" }] });
  });
  test("short new password does not add a spurious confirmation error", async () => {
    const r = await api("POST", "/users/me/change-password", { token: await login(SEED.mod), json: { ...change, new_password: "123", confirm_password: "other" } });
    expect(r.status).toBe(422);
    const body = r.body as { detail: { type: string; loc: string[]; msg: string }[] };
    expect(body.detail).toHaveLength(1);
    expect(body.detail[0]).toMatchObject({ type: "value_error", loc: ["body", "new_password"], msg: "Value error, Şifre en az 6 karakter olmalıdır" });
  });
  test("password change persists timestamp and changes login", async () => {
    const r = await api("POST", "/users/me/change-password", { token: await login(SEED.mod), json: change }); expect(r.status).toBe(200); expect((r.body as { password_changed_at: string }).password_changed_at).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d{6})?Z$/);
    const old = await api("POST", "/auth/login", { form: { username: SEED.mod, password: SEED.password } }); expect(old.status).toBe(401); expect(old.body).toEqual({ detail: "Email veya şifre hatalı" }); expect(await login(SEED.mod, change.new_password)).toBeString();
  });
  test("list requires admin", async () => { const r = await api("GET", "/users", { token: await login(SEED.mod) }); expect(r.status).toBe(403); expect(r.body).toEqual({ detail: "Bu işlem için yetkiniz yok" }); });
  test("list default uses public fields and newest-first order", async () => {
    const r = await api("GET", "/users", { token: await login(SEED.admin) }); expect(r.status).toBe(200);
    const body = r.body as { users: { id: number }[]; total: number }; expect(body.total).toBe(7); expect(body.users.map(u => u.id)).toEqual([7, 6, 5, 4, 3, 2, 1]); for (const user of body.users) expect(user).not.toHaveProperty("hashed_password");
  });
  test.each([["limit=0", 200], ["limit=101", 200], ["skip=-1", 500]] as const)("list bounds %s", async (query, old) => {
    const r = await api("GET", `/users?${query}`, { token: await login(SEED.admin) }); expect(r.status).toBe(deviation("h", { old, new: 422 }));
    if (TARGET_KIND === "new") expect(r.body).toMatchObject({ detail: [{ loc: ["query", query.split("=")[0]] }] });
  });
  test("get missing user", async () => { const r = await api("GET", "/users/999", { token: await login(SEED.admin) }); expect(r.status).toBe(404); expect(r.body).toEqual({ detail: "Kullanıcı bulunamadı" }); });
  test("get noninteger user", async () => { const r = await api("GET", "/users/abc", { token: await login(SEED.admin) }); expect(r.status).toBe(422); expect(r.body).toMatchObject({ detail: [{ type: "int_parsing", loc: ["path", "user_id"] }] }); });
  test("access invalid enum", async () => { const r = await api("PATCH", "/users/2/access", { token: await login(SEED.admin), json: { status: "x" } }); expect(r.status).toBe(422); expect(r.body).toMatchObject({ detail: [{ loc: ["body", "status"] }] }); });
  test("admin cannot change own access", async () => { const r = await api("PATCH", "/users/1/access", { token: await login(SEED.admin), json: {} }); expect(r.status).toBe(400); expect(r.body).toEqual({ detail: "Admin kendi erişim ayarlarını değiştiremez" }); });
  test("admin cannot delete self", async () => { const r = await api("DELETE", "/users/1", { token: await login(SEED.admin) }); expect(r.status).toBe(400); expect(r.body).toEqual({ detail: "Admin kendi hesabını bu endpoint üzerinden silemez" }); });
  test("delete user", async () => { const r = await api("DELETE", "/users/3", { token: await login(SEED.admin) }); expect(r.status).toBe(200); expect(r.body).toEqual({ message: "pending@example.com kullanıcısı başarıyla silindi" }); });
  test("delete me", async () => { const r = await api("DELETE", "/users/me", { token: await signedToken(SEED.broken) }); expect(r.status).toBe(200); expect(r.body).toEqual({ message: "Hesabınız başarıyla silindi" }); });
  test("delete user with events applies FK deviation e", async () => { const r = await api("DELETE", "/users/2", { token: await login(SEED.admin) }); expect(r.status).toBe(deviation("e", { old: 500, new: 409 })); if (TARGET_KIND === "new") expect(r.body).toEqual({ detail: "Kayıt başka kayıtlar tarafından kullanıldığı için işlem tamamlanamadı" }); });
  (TARGET_KIND === "new" ? test : test.skip)("old python-jose token accepted", async () => {
    const r = await api("GET", "/users/me", { token: fixtures.task6_legacy_token }); expect(r.status).toBe(200); expect(r.body).toMatchObject({ id: 1, email: SEED.admin });
  });
});
