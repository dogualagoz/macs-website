import { beforeEach, describe, expect, test } from "bun:test";
import { decodeJwt } from "jose";
import { api, login, resetState, SEED, TARGET_KIND } from "./client";
import { deviation } from "./deviations";

const registration = { email: "yeni@example.com", full_name: "Yeni Kullanıcı", password: "parola123" };
const attempt = (email = SEED.admin as string, password = SEED.password as string) => api("POST", "/auth/login", { form: { username: email, password } });
describe("auth contract", () => {
  beforeEach(resetState);
  test("register creates pending moderator with exact public fields", async () => {
    const r = await api("POST", "/auth/register", { json: { ...registration, role: "admin", status: "approved" } });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ email: "yeni@example.com", full_name: "Yeni Kullanıcı", id: 8, status: "pending", role: "moderator", is_active: true, last_login: null, failed_login_attempts: 0, password_changed_at: null });
  });
  test.each(["/auth/register", "/auth/register/admin"])("%s normalizes only the email domain", async path => {
    const r = await api("POST", path, { json: { ...registration, email: "MixedLocal@Example.COM", admin_secret: "contract-admin-secret" } });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ email: "MixedLocal@example.com" });
    const duplicate = await api("POST", path, { json: { ...registration, email: "MixedLocal@EXAMPLE.com", admin_secret: "contract-admin-secret" } });
    expect(duplicate.status).toBe(400);
    expect(duplicate.body).toEqual({ detail: "Bu email adresi zaten kullanımda" });
  });
  test("login preserves the raw username and requires the exact stored email case", async () => {
    const r = await api("POST", "/auth/register/admin", { json: { ...registration, email: "MixedLocal@Example.COM", admin_secret: "contract-admin-secret" } });
    expect(r.status).toBe(200);
    for (const username of ["MixedLocal@Example.COM", "mixedlocal@example.com"]) {
      const rejected = await attempt(username);
      expect(rejected.status).toBe(401);
      expect(rejected.body).toEqual({ detail: "Email veya şifre hatalı" });
    }
    const accepted = await attempt("MixedLocal@example.com");
    expect(accepted.status).toBe(200);
    expect(decodeJwt((accepted.body as { access_token: string }).access_token).sub).toBe("MixedLocal@example.com");
  });
  test("register duplicate email", async () => {
    const r = await api("POST", "/auth/register", { json: { ...registration, email: SEED.admin } });
    expect(r.status).toBe(400); expect(r.body).toEqual({ detail: "Bu email adresi zaten kullanımda" });
  });
  test("register short password", async () => {
    const r = await api("POST", "/auth/register", { json: { ...registration, password: "123" } });
    expect(r.status).toBe(422); expect(r.body).toMatchObject({ detail: [{ type: "value_error", loc: ["body", "password"], msg: "Value error, Şifre en az 6 karakter olmalıdır" }] });
  });
  test("register invalid email", async () => {
    const r = await api("POST", "/auth/register", { json: { ...registration, email: "x" } });
    expect(r.status).toBe(422); expect(r.body).toMatchObject({ detail: [{ type: "value_error", loc: ["body", "email"] }] });
  });
  test("register missing fields", async () => {
    const r = await api("POST", "/auth/register", { json: {} });
    expect(r.status).toBe(422); expect(r.body).toMatchObject({ detail: [
      { type: "missing", loc: ["body", "email"] }, { type: "missing", loc: ["body", "full_name"] }, { type: "missing", loc: ["body", "password"] },
    ] });
  });
  test.each(["yanlis", "x".repeat(21)])("register/admin wrong secret %s", async admin_secret => {
    const r = await api("POST", "/auth/register/admin", { json: { ...registration, admin_secret } });
    expect(r.status).toBe(403); expect(r.body).toEqual({ detail: "Admin kaydı için geçerli güvenlik anahtarı gerekli" });
  });
  test("register/admin correct secret", async () => {
    const r = await api("POST", "/auth/register/admin", { json: { ...registration, admin_secret: "contract-admin-secret" } });
    expect(r.status).toBe(200); expect(r.body).toMatchObject({ email: registration.email, role: "admin", status: "approved", is_active: true });
  });
  test("login returns compatible claims and one-hour expiry", async () => {
    const r = await attempt(); expect(r.status).toBe(200);
    const body = r.body as { token_type: string; access_token: string };
    expect(body.token_type).toBe("bearer"); expect(body.access_token.split(".")).toHaveLength(3);
    const claims = decodeJwt(body.access_token); expect(claims.sub).toBe(SEED.admin); expect(claims.role).toBe("admin");
    const lifetime = (claims.exp ?? 0) - Date.now() / 1000; expect(lifetime).toBeGreaterThanOrEqual(3590); expect(lifetime).toBeLessThanOrEqual(3610);
  });
  test.each([
    [SEED.admin, "yanlis", 401, "Email veya şifre hatalı"],
    ["unknown@example.com", SEED.password, 401, "Email veya şifre hatalı"],
    [SEED.pending, SEED.password, 403, "Hesabınız henüz onaylanmadı. Yönetici onayı bekleniyor."],
    [SEED.inactive, SEED.password, 401, "Hesabınız aktif değil"],
  ] as const)("login eligibility %s", async (email, password, status, detail) => {
    const r = await attempt(email, password); expect(r.status).toBe(status); expect(r.body).toEqual({ detail }); expect(r.headers.get("www-authenticate")).toBeNull();
  });
  test("login rejects JSON as missing form fields", async () => {
    const r = await api("POST", "/auth/login", { json: { username: SEED.admin, password: SEED.password } });
    expect(r.status).toBe(422); expect(r.body).toMatchObject({ detail: [{ type: "missing", loc: ["body", "username"] }, { type: "missing", loc: ["body", "password"] }] });
  });
  test.each(["username", "password"] as const)("empty login form field %s is missing", async field => {
    const r = await api("POST", "/auth/login", { form: { username: SEED.admin, password: SEED.password, [field]: "" } });
    expect(r.status).toBe(422);
    expect(r.body).toMatchObject({ detail: [{ type: "missing", loc: ["body", field], msg: "Field required", input: null }] });
  });
  test("locked account applies deviation a", async () => {
    const r = await attempt(SEED.locked);
    expect(r.status).toBe(deviation("a", { old: 500, new: 401 }));
    if (TARGET_KIND === "old") expect(r.body).toEqual({ detail: "Giriş sırasında bir hata oluştu" });
    else { expect((r.body as { detail: string }).detail).toMatch(/^Çok fazla başarısız deneme\. Hesap 1[45] dakika kilitlendi\.$/); expect(r.headers.get("www-authenticate")).toBeNull(); }
  });
  test("corrupt hash applies deviation b", async () => {
    const r = await attempt(SEED.broken);
    expect(r.status).toBe(deviation("b", { old: 500, new: 401 }));
    expect(r.body).toEqual({ detail: deviation("b", { old: "Giriş sırasında bir hata oluştu", new: "Email veya şifre hatalı" }) }); expect(r.headers.get("www-authenticate")).toBeNull();
  });
  (TARGET_KIND === "new" ? test : test.skip)("five failures persist and lock sixth attempt", async () => {
    for (let i = 0; i < 5; i++) { const r = await attempt(SEED.mod, "yanlis"); expect(r.status).toBe(401); expect(r.body).toEqual({ detail: "Email veya şifre hatalı" }); }
    const r = await attempt(SEED.mod); expect(r.status).toBe(401); expect((r.body as { detail: string }).detail).toMatch(/^Çok fazla başarısız deneme\. Hesap 1[45] dakika kilitlendi\.$/);
    const stored = await api("GET", "/users/2", { token: await login(SEED.admin) }); expect(stored.status).toBe(200); expect(stored.body).toMatchObject({ failed_login_attempts: 5 });
  });
  test("successful login resets failed counter and stamps last_login", async () => {
    expect((await attempt(SEED.mod, "yanlis")).status).toBe(401); expect((await attempt(SEED.mod, "yanlis")).status).toBe(401); expect((await attempt(SEED.mod)).status).toBe(200);
    const r = await api("GET", "/users/2", { token: await login(SEED.admin) }); expect(r.status).toBe(200); expect(r.body).toMatchObject({ failed_login_attempts: 0 }); expect((r.body as { last_login: string }).last_login).toMatch(/Z$/);
  });
});
