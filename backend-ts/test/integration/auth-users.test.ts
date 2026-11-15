import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import request from "../helpers/http";
import { createApp } from "../../src/app";
import { testDeps } from "../helpers/app";
import { seedDb } from "../helpers/db";
import { tokenFor } from "../helpers/auth";

const deps = testDeps();
async function expectFailure(action: Promise<unknown>, expected: { status: number; detail?: string }): Promise<void> {
  try { await action; } catch (error: unknown) { expect(error).toMatchObject(expected); return; }
  throw new Error("Expected service to reject");
}
const seed = await readFile(new URL("../../contract/seed.sql", import.meta.url), "utf8");
afterAll(async () => { await deps.sql.end({ timeout: 1 }); });
beforeEach(async () => { await seedDb(deps.sql, seed); });
describe("auth/users database integration", () => {
  test("unconfigured admin registration returns exact 500 before querying users", async () => {
    const app = createApp({ ...deps, env: { ...deps.env, ADMIN_SECRET_KEY: null, RATELIMIT_ENABLED: false } });
    deps.counter.reset();
    const r = await request(app).post("/auth/register/admin").send({
      email: "admin@example.com", full_name: "Admin", password: "parola123", admin_secret: "supplied-secret",
    });
    expect(r.status).toBe(500);
    expect(r.body).toEqual({ detail: "Admin kaydı devre dışı: ADMIN_SECRET_KEY yapılandırılmamış" });
    expect(deps.counter.count()).toBe(0);
  });
  test("unconfigured admin registration preserves validation and rate limit precedence", async () => {
    const app = createApp({ ...deps, env: { ...deps.env, ADMIN_SECRET_KEY: null, RATELIMIT_ENABLED: true } });
    const invalid = await request(app).post("/auth/register/admin").send({});
    expect(invalid.status).toBe(422);
    expect(invalid.body).toMatchObject({ detail: [
      { type: "missing", loc: ["body", "email"] }, { type: "missing", loc: ["body", "full_name"] },
      { type: "missing", loc: ["body", "password"] }, { type: "missing", loc: ["body", "admin_secret"] },
    ] });
    for (let i = 0; i < 2; i++) {
      const r = await request(app).post("/auth/register/admin").send({
        email: "admin@example.com", full_name: "Admin", password: "parola123", admin_secret: "supplied-secret",
      });
      expect(r.status).toBe(500);
      expect(r.body).toEqual({ detail: "Admin kaydı devre dışı: ADMIN_SECRET_KEY yapılandırılmamış" });
    }
    const limited = await request(app).post("/auth/register/admin").send({});
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ error: "Rate limit exceeded: 3 per 1 minute" });
  });
  test("11th login in a minute returns exact 429", async () => {
    const app = createApp({ ...deps, env: { ...deps.env, RATELIMIT_ENABLED: true } });
    for (let i = 0; i < 10; i++) {
      const r = await request(app).post("/auth/login").type("form").send({ username: "missing@example.com", password: "wrong" });
      expect(r.status).toBe(401);
    }
    const r = await request(app).post("/auth/login").type("form").send({ username: "missing@example.com", password: "wrong" });
    expect(r.status).toBe(429); expect(r.body).toEqual({ error: "Rate limit exceeded: 10 per 1 minute" });
  });
  test("user list uses two public-only SQL queries including authentication", async () => {
    const app = createApp(deps); const token = await tokenFor("admin@example.com", "admin"); deps.counter.reset();
    const r = await request(app).get("/users").auth(token, { type: "bearer" });
    expect(r.status).toBe(200); expect(r.body).toMatchObject({ total: 7 }); expect(deps.counter.count()).toBe(2);
    expect(deps.counter.queries().every(query => !query.includes("hashed_password"))).toBe(true);
  });
  test("expired lockout unlocks with SQL clock even with skewed token clock", async () => {
    await deps.sql`UPDATE users SET last_failed_login = now() - interval '16 minutes' WHERE id = 6`;
    const app = createApp({ ...deps, now: () => new Date("2000-01-01T00:00:00Z") });
    const r = await request(app).post("/auth/login").type("form").send({ username: "locked@example.com", password: "parola123" });
    expect(r.status).toBe(200);
    const [row] = await deps.sql`SELECT failed_login_attempts, last_login, updated_at FROM users WHERE id = 6`;
    expect(row?.failed_login_attempts).toBe(0); expect(row?.last_login).not.toBeNull(); expect(row?.updated_at).not.toBeNull();
  });
  test("concurrent failed logins do not lose increments or bypass lockout", async () => {
    const app = createApp({ ...deps, env: { ...deps.env, RATELIMIT_ENABLED: false } });
    const results = await Promise.all(Array.from({ length: 7 }, () => request(app).post("/auth/login").type("form").send({ username: "mod@example.com", password: "wrong" })));
    expect(results.every(r => r.status === 401)).toBe(true);
    const [row] = await deps.sql`SELECT failed_login_attempts FROM users WHERE id = 2`; expect(row?.failed_login_attempts).toBe(5);
    expect(results.filter(r => (r.body as { detail: string }).detail.startsWith("Çok fazla")).length).toBe(2);
  });
});

test("concurrent createUser calls map the unique violation to duplicate-email 400", async () => {
  const { createUser } = await import("../../src/modules/users/service");
  const { HttpError } = await import("../../src/lib/http-error");
  const input = { email: "race@example.com", full_name: "Race", password: "parola123" };
  const results = await Promise.allSettled([createUser(deps.db, deps.env, input), createUser(deps.db, deps.env, input)]);
  expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
  const failure = results.find(result => result.status === "rejected");
  expect(failure?.status).toBe("rejected");
  if (failure?.status !== "rejected") throw new Error("Expected duplicate-email failure");
  const reason: unknown = failure.reason;
  expect(reason).toBeInstanceOf(HttpError);
  expect(reason).toMatchObject({ status: 400, detail: "Bu email adresi zaten kullanımda" });
  const [stored] = await deps.sql`SELECT count(*)::int AS total FROM users WHERE email = 'race@example.com'`;
  expect(stored?.total).toBe(1);
});

test("serializeUser coerces NULL counter, preserves microseconds, and excludes credentials", async () => {
  const { findUserByEmail, findUserCredentialsByEmail } = await import("../../src/modules/users/queries");
  const { serializeUser } = await import("../../src/modules/users/queries");
  await deps.sql`UPDATE users SET failed_login_attempts = NULL, last_login = '2026-05-01 11:00:00.123456+03', password_changed_at = '2026-05-02 11:00:00+00' WHERE id = 2`;
  const row = await findUserByEmail(deps.db, "mod@example.com");
  expect(row).not.toBeNull();
  if (!row) throw new Error("Missing seeded moderator");
  expect(serializeUser(row)).toEqual({ id: 2, email: "mod@example.com", full_name: "Test Kullanıcı 2", role: "moderator", status: "approved", is_active: true,
    failed_login_attempts: 0, last_login: "2026-05-01T08:00:00.123456Z", password_changed_at: "2026-05-02T11:00:00Z" });
  expect(row).not.toHaveProperty("hashed_password");
  const credentials = await findUserCredentialsByEmail(deps.db, "mod@example.com");
  expect(credentials?.hashed_password).toStartWith("$2b$12$");
  if (!credentials) throw new Error("Missing credentials");
  expect(serializeUser(credentials)).not.toHaveProperty("hashed_password");
  const r = await request(createApp(deps)).get("/users/me").auth(await tokenFor("mod@example.com", "moderator"), { type: "bearer" });
  expect(r.status).toBe(200); expect(r.body).toMatchObject({ failed_login_attempts: 0, last_login: "2026-05-01T08:00:00.123456Z" });
});

test("every user UPDATE refreshes updated_at including CLI services and auth mutations", async () => {
  const { setPassword, setAccess, updateProfile } = await import("../../src/modules/users/service");
  const { login } = await import("../../src/modules/auth/service");
  await deps.sql`UPDATE users SET last_failed_login = now() - interval '16 minutes', updated_at = '2000-01-01' WHERE id = 6`;
  deps.counter.reset();
  await setPassword(deps.db, deps.env, "broken@example.com", "reset123");
  await setAccess(deps.db, 3, { role: "admin", status: "approved", is_active: false });
  await updateProfile(deps.db, 2, "Updated");
  await expectFailure(login(deps.db, deps.env, new Date(), "locked@example.com", "wrong"), { status: 401 });
  await login(deps.db, deps.env, new Date(), "locked@example.com", "parola123");
  const updates = deps.counter.queries().filter(query => /^update "users"/i.test(query));
  expect(updates).toHaveLength(6);
  expect(updates.every(query => query.includes('"updated_at" = now()'))).toBe(true);
  const rows = await deps.sql`SELECT id, updated_at FROM users WHERE id IN (2, 3, 6, 7)`;
  expect(rows).toHaveLength(4); expect(rows.every(row => typeof row.updated_at === "string" && row.updated_at > "2000-01-01")).toBe(true);
  const access = await deps.sql`SELECT role, status, is_active FROM users WHERE id = 3`;
  expect(access[0]).toMatchObject({ role: "admin", status: "approved", is_active: false });
  expect(await login(deps.db, deps.env, new Date(), "broken@example.com", "reset123")).toMatchObject({ token_type: "bearer" });
});

test("SQL lockout includes a NULL timestamp reset and configured duration boundary", async () => {
  const { login } = await import("../../src/modules/auth/service");
  await deps.sql`UPDATE users SET last_failed_login = NULL WHERE id = 6`;
  await expectFailure(login(deps.db, deps.env, new Date(), "locked@example.com", "wrong"), { status: 401, detail: "Email veya şifre hatalı" });
  const [reset] = await deps.sql`SELECT failed_login_attempts, last_failed_login FROM users WHERE id = 6`;
  expect(reset?.failed_login_attempts).toBe(1); expect(reset?.last_failed_login).not.toBeNull();
  await deps.sql`UPDATE users SET failed_login_attempts = 5, last_failed_login = now() - interval '3 minutes' WHERE id = 6`;
  await expectFailure(login(deps.db, { ...deps.env, LOCKOUT_DURATION: 5 }, new Date(), "locked@example.com", "parola123"), { status: 401, detail: "Çok fazla başarısız deneme. Hesap 1 dakika kilitlendi." });
  expect(await login(deps.db, { ...deps.env, LOCKOUT_DURATION: 2 }, new Date(), "locked@example.com", "parola123")).toMatchObject({ token_type: "bearer" });
});

test("list ties use id descending and pagination returns the full total", async () => {
  const { listUsers } = await import("../../src/modules/users/service");
  await deps.sql`UPDATE users SET created_at = '2026-01-01'`;
  const result = await listUsers(deps.db, 2, 2);
  expect(result.total).toBe(7); expect(result.users.map(row => row.id)).toEqual([5, 4]);
});

test("login shield check and failures require enabled POST login", async () => {
  for (const enabled of [false, true]) {
    const calls: string[] = [];
    const app = createApp({ ...deps, env: { ...deps.env, RATELIMIT_ENABLED: enabled }, loginShield: {
      check: ip => { calls.push(`check:${ip}`); }, recordFailure: ip => { calls.push(`failure:${ip}`); }, size: () => 0,
    } });
    const options = { headers: { "X-Real-IP": "203.0.113.9" } };
    await app.request("/auth/login", options);
    expect(calls).toEqual([]);
    const response = await app.request("/auth/login", { ...options, method: "POST", body: new URLSearchParams({ username: "missing@example.com", password: "wrong" }) });
    expect(response.status).toBe(401);
    expect(calls).toEqual(enabled ? ["check:203.0.113.9", "failure:203.0.113.9"] : []);
  }
});

test("PG user JSON is one credential-free CTE with UTC precision and empty-page total", async () => {
  const { listUsersJson, getUserJson } = await import("../../src/modules/users/queries");
  await deps.sql`UPDATE users SET failed_login_attempts = NULL, is_active = NULL, last_login = '2026-05-01 11:00:00.123400+03', password_changed_at = '2026-05-02 11:00:00+00' WHERE id = 2`;
  deps.counter.reset();
  const text = await listUsersJson(deps.db, 0, 100);
  expect(typeof text).toBe("string");
  expect(deps.counter.count()).toBe(1);
  expect(deps.counter.queries()[0]).not.toContain("hashed_password");
  expect((JSON.parse(text) as { users: { id: number }[] }).users.find(row => row.id === 2)).toMatchObject({ is_active: false, failed_login_attempts: 0, last_login: "2026-05-01T08:00:00.123400Z", password_changed_at: "2026-05-02T11:00:00Z" });
  expect(JSON.parse(await listUsersJson(deps.db, 99, 10))).toEqual({ users: [], total: 7 });
  expect(await getUserJson(deps.db, 99999)).toBeNull();
});
test("login shield rejects before validation and DB and receives resolved IP", async () => {
  const { HttpError } = await import("../../src/lib/http-error");
  const calls: string[] = [];
  const app = createApp({ ...deps, env: { ...deps.env, RATELIMIT_ENABLED: true }, loginShield: {
    check: ip => { calls.push(ip); throw new HttpError(429, { error: "blocked" }); }, recordFailure: () => { throw new Error("Unexpected failure record"); }, size: () => 0,
  } });
  deps.counter.reset();
  const r = await app.request("/auth/login", { method: "POST", headers: { "X-Real-IP": "203.0.113.4" }, body: "malformed" });
  expect(r.status).toBe(429); expect(calls).toEqual(["203.0.113.4"]); expect(deps.counter.count()).toBe(0);
});

test("native JSON validation preserves original input with mixed-case content type", async () => {
  const r = await createApp(deps).request("/auth/register", { method: "POST", headers: { "Content-Type": "Application/JSON" }, body: '{"full_name":"Test","password":"parola123"}' });
  expect(r.status).toBe(422);
  expect(await r.json()).toMatchObject({ detail: [{ type: "missing", loc: ["body", "email"], input: { full_name: "Test", password: "parola123" } }] });
});

test("user aggregation explicitly orders equal timestamps by descending id", async () => {
  const { listUsersJson } = await import("../../src/modules/users/queries");
  await deps.sql`UPDATE users SET created_at = '2026-01-01'`;
  deps.counter.reset();
  const result = JSON.parse(await listUsersJson(deps.db, 0, 100)) as { users: { id: number }[] };
  expect(result.users.map(u => u.id)).toEqual([7, 6, 5, 4, 3, 2, 1]);
  expect(deps.counter.queries()[0]).toContain("json_agg(body ORDER BY created_at DESC, id DESC)");
});
