import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import request from "supertest";
import { z } from "zod";
import { createApp } from "../../src/app";
import { userResponseSchema } from "../../src/modules/users/schemas";
import { testDeps, TEST_DATABASE_URL, TEST_JWT_SECRET } from "../helpers/app";
import { seedDb } from "../helpers/db";
import { tokenFor } from "../helpers/auth";

const deps = testDeps();
const seed = await readFile(new URL("../../contract/seed.sql", import.meta.url), "utf8");
beforeEach(async () => { await seedDb(deps.sql, seed); });
afterAll(async () => { await deps.sql.end({ timeout: 1 }); });
async function cli(script: string, args: string[] = [], password = "", env: Record<string, string | undefined> = {}) {
  const child = Bun.spawn([process.execPath, "--no-env-file", `scripts/${script}.ts`, ...args], {
    cwd: new URL("../..", import.meta.url).pathname,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL, JWT_SECRET_KEY: TEST_JWT_SECRET, NODE_ENV: "test", ...env },
    stdin: new TextEncoder().encode(password), stdout: "pipe", stderr: "pipe",
  });
  const [code, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]);
  expect(stdout + stderr).not.toContain("secret-password");
  return { code, stdout, stderr };
}
async function login(email: string, password: string) {
  return request(createApp(deps)).post("/auth/login").type("form").send({ username: email, password });
}
describe("admin CLI subprocesses", () => {
  test("create-admin creates approved admin that can log in using only first stdin line", async () => {
    expect(await cli("create-admin", ["--email", "yeni-admin@example.com", "--full-name", "Yeni Admin"], "parola123\nignored\n"))
      .toEqual({ code: 0, stdout: "created admin id=8 email=yeni-admin@example.com\n", stderr: "" });
    expect((await login("yeni-admin@example.com", "parola123")).status).toBe(200);
    const user = await request(createApp(deps)).get("/users/8").auth(await tokenFor("admin@example.com", "admin"), { type: "bearer" });
    expect(user.status).toBe(200);
    expect(user.body).toMatchObject({ full_name: "Yeni Admin", role: "admin", status: "approved", is_active: true });
  });
  test("create-admin normalizes mixed-case domains and rejects the normalized duplicate", async () => {
    const args = ["--email", "CliLocal@Example.COM", "--full-name", "CLI Admin"];
    expect(await cli("create-admin", args, "parola123\n"))
      .toEqual({ code: 0, stdout: "created admin id=8 email=CliLocal@example.com\n", stderr: "" });
    const rows = await deps.sql`SELECT email, role, status FROM users WHERE id = 8`;
    expect([...rows]).toEqual([{ email: "CliLocal@example.com", role: "admin", status: "approved" }]);
    expect((await login("CliLocal@example.com", "parola123")).status).toBe(200);
    expect(await cli("create-admin", ["--email", "CliLocal@EXAMPLE.com", "--full-name", "Duplicate"], "parola123\n"))
      .toEqual({ code: 1, stdout: "", stderr: "Bu email adresi zaten kullanımda\n" });
    const [count] = await deps.sql`SELECT count(*)::int AS total FROM users`;
    expect(count?.total).toBe(8);
  });
  test("reset-password normalizes the mixed-case domain of an API-registered user", async () => {
    const registered = await request(createApp(deps)).post("/auth/register").send({
      email: "ResetLocal@Example.COM", full_name: "Reset User", password: "parola123",
    });
    expect(registered.status).toBe(200);
    expect(registered.body).toMatchObject({ email: "ResetLocal@example.com" });
    await deps.sql`UPDATE users SET status = 'approved' WHERE email = 'ResetLocal@example.com'`;
    expect(await cli("reset-password", ["--email", "ResetLocal@EXAMPLE.com"], "secret-password\n"))
      .toEqual({ code: 0, stdout: "password reset for ResetLocal@example.com\n", stderr: "" });
    expect((await login("ResetLocal@example.com", "secret-password")).status).toBe(200);
    expect((await login("ResetLocal@example.com", "parola123")).status).toBe(401);
  });
  test("set-user-access normalizes the mixed-case domain of an API-registered user", async () => {
    const registered = await request(createApp(deps)).post("/auth/register").send({
      email: "AccessLocal@Example.COM", full_name: "Access User", password: "parola123",
    });
    expect(registered.status).toBe(200);
    expect(registered.body).toMatchObject({ email: "AccessLocal@example.com", status: "pending" });
    expect(await cli("set-user-access", ["--email", "AccessLocal@EXAMPLE.com", "--status", "approved", "--role", "admin"]))
      .toEqual({ code: 0, stdout: "updated AccessLocal@example.com: status=approved role=admin is_active=true\n", stderr: "" });
    const [row] = await deps.sql`SELECT email, status, role FROM users WHERE email = 'AccessLocal@example.com'`;
    expect(row).toEqual({ email: "AccessLocal@example.com", status: "approved", role: "admin" });
    expect((await login("AccessLocal@example.com", "parola123")).status).toBe(200);
  });
  test("duplicate email exits 1", async () => {
    expect(await cli("create-admin", ["--email", "admin@example.com", "--full-name", "Duplicate"], "parola123\n"))
      .toEqual({ code: 1, stdout: "", stderr: "Bu email adresi zaten kullanımda\n" });
  });
  for (const flag of ["--password", "--password=secret-password", "--new-password", "--hashed-password"]) {
    test(`rejects password-bearing flag ${flag.split("=")[0] ?? flag}`, async () => {
      expect(await cli("create-admin", [flag, "secret-password"]))
        .toEqual({ code: 1, stdout: "", stderr: "password must be provided via stdin\n" });
    });
  }
  test("configured minimum uses exact Turkish error", async () => {
    expect(await cli("create-admin", ["--email", "new@example.com", "--full-name", "New"], "parola123\n", { MIN_PASSWORD_LENGTH: "12" }))
      .toEqual({ code: 1, stdout: "", stderr: "Şifre en az 12 karakter olmalıdır\n" });
  });
  test("reset-password clears lockout and rotates password timestamp", async () => {
    expect(await cli("reset-password", ["--email", "locked@example.com"], "secret-password\n"))
      .toEqual({ code: 0, stdout: "password reset for locked@example.com\n", stderr: "" });
    const [row] = await deps.sql`SELECT failed_login_attempts, last_failed_login, password_changed_at > now() - interval '1 minute' AS recent FROM users WHERE id = 6`;
    expect(row).toEqual({ failed_login_attempts: 0, last_failed_login: null, recent: true });
    expect((await login("locked@example.com", "secret-password")).status).toBe(200);
    expect((await login("locked@example.com", "parola123")).status).toBe(401);
  });
  test("reset-password unknown email exits 2", async () => {
    expect(await cli("reset-password", ["--email", "missing@example.com"], "parola123\n"))
      .toEqual({ code: 2, stdout: "", stderr: "Kullanıcı bulunamadı\n" });
  });
  test("reset-password validates minimum before changing credentials", async () => {
    expect(await cli("reset-password", ["--email", "mod@example.com"], "short\n", { MIN_PASSWORD_LENGTH: "10" }))
      .toEqual({ code: 1, stdout: "", stderr: "Şifre en az 10 karakter olmalıdır\n" });
    expect((await login("mod@example.com", "parola123")).status).toBe(200);
  });
  test("set-user-access approves pending user", async () => {
    expect(await cli("set-user-access", ["--email", "pending@example.com", "--status", "approved"]))
      .toEqual({ code: 0, stdout: "updated pending@example.com: status=approved role=moderator is_active=true\n", stderr: "" });
    expect((await login("pending@example.com", "parola123")).status).toBe(200);
  });
  test("set-user-access maps both active values and updates role", async () => {
    for (const active of ["false", "true"]) {
      expect(await cli("set-user-access", ["--email", "mod@example.com", "--active", active, "--role", "admin"]))
        .toEqual({ code: 0, stdout: `updated mod@example.com: status=approved role=admin is_active=${active}\n`, stderr: "" });
      const [row] = await deps.sql`SELECT is_active, role FROM users WHERE id = 2`;
      expect(row).toEqual({ is_active: active === "true", role: "admin" });
    }
  });
  test("set-user-access unknown email exits 2", async () => {
    expect(await cli("set-user-access", ["--email", "missing@example.com", "--status", "rejected"]))
      .toEqual({ code: 2, stdout: "", stderr: "Kullanıcı bulunamadı\n" });
  });
  test("set-user-access rejects absent change flags and invalid values", async () => {
    for (const args of [[], ["--active", "yes"], ["--status", "invalid"], ["--role", "user"]]) {
      const r = await cli("set-user-access", ["--email", "mod@example.com", ...args]);
      expect(r.code).toBe(1); expect(r.stdout).toBe(""); expect(r.stderr.length).toBeGreaterThan(0);
    }
  });
  test("list-users --json returns seven public UserResponses", async () => {
    const r = await cli("list-users", ["--json"]);
    expect(r.code).toBe(0); expect(r.stderr).toBe("");
    const rows = z.array(userResponseSchema).parse(JSON.parse(r.stdout));
    expect(rows).toHaveLength(7); expect(rows.map(row => row.id).sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(r.stdout).not.toContain("hashed_password"); expect(r.stdout).not.toContain("$2b$");
  });
  test("list-users renders table and empty result", async () => {
    const r = await cli("list-users");
    expect(r.code).toBe(0); expect(r.stderr).toBe("");
    expect(r.stdout).toMatch(/^id\s+email\s+role\s+status\s+active\s+last_login\n/);
    expect(r.stdout).toContain("admin@example.com"); expect(r.stdout).not.toContain("hashed_password");
    await deps.sql`SET client_min_messages = warning`;
    await deps.sql`TRUNCATE users CASCADE`;
    expect(await cli("list-users", ["--json"])).toEqual({ code: 0, stdout: "[]\n", stderr: "" });
  });
  test("list-users includes users beyond its first service page", async () => {
    await deps.sql`INSERT INTO users (email, full_name, hashed_password, role, status, is_active, failed_login_attempts)
      SELECT 'page' || n || '@example.com', 'Page ' || n, u.hashed_password, 'moderator', 'approved', true, 0
      FROM generate_series(1, 101) AS n CROSS JOIN users u WHERE u.id = 1`;
    const r = await cli("list-users", ["--json"]);
    expect(r.code).toBe(0); expect(r.stderr).toBe("");
    const rows = z.array(userResponseSchema).parse(JSON.parse(r.stdout));
    expect(rows).toHaveLength(108); expect(new Set(rows.map(row => row.id)).size).toBe(108);
    expect(rows.some(row => row.email === "admin@example.com")).toBe(true);
    expect(rows.some(row => row.email === "page101@example.com")).toBe(true);
    expect(r.stdout).not.toContain("hashed_password");
  });
  test("pipe passwords preserve spaces and support CRLF or EOF without newline", async () => {
    for (const input of ["  parola123  \r\n", "  parola123  "]) {
      const r = await cli("reset-password", ["--email", "mod@example.com"], input);
      expect(r).toEqual({ code: 0, stdout: "password reset for mod@example.com\n", stderr: "" });
      expect((await login("mod@example.com", "  parola123  ")).status).toBe(200);
      expect((await login("mod@example.com", "parola123")).status).toBe(401);
    }
  });
  test("invalid and missing email report field name", async () => {
    for (const args of [["--email", "invalid"], ["--email"], []]) {
      const r = await cli("reset-password", args, "parola123\n");
      expect(r.code).toBe(1); expect(r.stderr).toContain("email"); expect(r.stdout).toBe("");
    }
  });
  test("rejects unknown, positional and duplicate arguments without leaking values", async () => {
    for (const args of [["--wat", "secret-password"], ["secret-password"], ["--json", "--json"], ["--json", "false"]]) {
      const r = await cli("list-users", args);
      expect(r.code).toBe(1); expect(r.stdout).toBe(""); expect(r.stderr.length).toBeGreaterThan(0);
    }
  });
  test("password input requires a nonempty first line", async () => {
    for (const input of ["", "\nparola123\n"]) {
      const r = await cli("reset-password", ["--email", "mod@example.com"], input);
      expect(r.code).toBe(1); expect(r.stdout).toBe(""); expect(r.stderr.length).toBeGreaterThan(0);
    }
  });
  test("every script refuses missing DATABASE_URL", async () => {
    for (const script of ["create-admin", "reset-password", "set-user-access", "list-users"]) {
      const r = await cli(script, [], "", { DATABASE_URL: undefined });
      expect(r.code).toBe(1); expect(r.stdout).toBe(""); expect(r.stderr).toContain("DATABASE_URL");
    }
  });
  test("database failures have clear safe stderr and exit 1", async () => {
    const r = await cli("list-users", [], "", { DATABASE_URL: "postgresql://secret-password@127.0.0.1:1/missing" });
    expect(r.code).toBe(1); expect(r.stdout).toBe(""); expect(r.stderr).toContain("database operation failed");
  });
  for (const mode of ["match", "mismatch", "interrupt", "eof"]) {
    test(`TTY password input disables echo and handles ${mode}`, async () => {
      const driver = String.raw`
import os, pty, select, subprocess, sys, termios, time, json
master, slave = pty.openpty()
p = subprocess.Popen([sys.argv[1], "--no-env-file", "scripts/reset-password.ts", "--email", "mod@example.com"], stdin=slave, stdout=subprocess.PIPE, stderr=slave)
os.close(slave)
transcript = b""
echo = []
def prompt(marker):
    global transcript
    deadline = time.monotonic() + 5
    while marker not in transcript:
        if time.monotonic() > deadline:
            p.kill()
            raise RuntimeError("TTY prompt timeout")
        if select.select([master], [], [], 0.1)[0]:
            transcript += os.read(master, 4096)
    echo.append(bool(termios.tcgetattr(master)[3] & termios.ECHO))
prompt(b"Password: ")
mode = sys.argv[2]
if mode == "interrupt": os.write(master, b"\x03")
elif mode == "eof": os.write(master, b"\x04")
else:
    os.write(master, b"secret-password\n")
    prompt(b"Confirm password: ")
    os.write(master, b"secret-password\n" if mode == "match" else b"different-password\n")
deadline = time.monotonic() + 5
while p.poll() is None and time.monotonic() < deadline:
    if select.select([master], [], [], 0.05)[0]:
        try:
            chunk = os.read(master, 4096)
            if chunk: transcript += chunk
        except OSError: pass
if p.poll() is None:
    p.kill()
    p.communicate()
    raise RuntimeError("TTY subprocess timeout")
stdout, _ = p.communicate()
while select.select([master], [], [], 0.1)[0]:
    try: chunk = os.read(master, 4096)
    except OSError: break
    if not chunk: break
    transcript += chunk
os.close(master)
print(json.dumps({"code": p.returncode, "stdout": stdout.decode(), "stderr": transcript.decode(), "echo": echo}))
`;
      const child = Bun.spawn(["python3", "-c", driver, process.execPath, mode], {
        cwd: new URL("../..", import.meta.url).pathname,
        env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL, JWT_SECRET_KEY: TEST_JWT_SECRET },
        stdout: "pipe", stderr: "pipe",
      });
      const [code, out, err] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]);
      expect(err).toBe(""); expect(code).toBe(0);
      const result = z.object({ code: z.number(), stdout: z.string(), stderr: z.string(), echo: z.array(z.boolean()) }).parse(JSON.parse(out));
      expect(result.echo.every(value => !value)).toBe(true);
      expect(result.stderr).not.toContain("secret-password"); expect(result.stderr).not.toContain("different-password");
      if (mode === "match") {
        expect(result.code).toBe(0); expect(result.stdout).toBe("password reset for mod@example.com\n");
        expect((await login("mod@example.com", "secret-password")).status).toBe(200);
      } else {
        expect(result.code).toBe(1); expect(result.stdout).toBe("");
        expect(result.stderr).toContain(mode === "mismatch" ? "confirmation does not match" : "password: input cancelled");
        expect((await login("mod@example.com", "parola123")).status).toBe(200);
      }
    }, 15000);
  }

});
