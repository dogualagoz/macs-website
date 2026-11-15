import { expect, test } from "bun:test";
test("buffered logger drains every completion and security record on normal exit", async () => {
  const child = Bun.spawn(["bun", "--no-env-file", "-e", `
    import { createLogger } from "./src/lib/logger";
    const logger = createLogger("info");
    for (let i = 0; i < 2000; i++) logger.info({ reqId: String(i), method: "GET", path: "/members", status: 200, ms: 0.1 }, "Request completed");
    logger.warn({ event: "security", kind: "rate_limit", ip: "127.0.0.1", path: "/members", status: 429 });
    logger.flush();
  `], { cwd: new URL("../../", import.meta.url).pathname, stdout: "pipe", stderr: "pipe" });
  const output = await new Response(child.stdout).text();
  expect(await child.exited).toBe(0);
  expect(await new Response(child.stderr).text()).toBe("");
  const rows = output.trim().split("\n").map(line => JSON.parse(line) as Record<string, unknown>);
  expect(rows).toHaveLength(2001);
  for (let i = 0; i < 2000; i++) expect(rows[i]).toMatchObject({ reqId: String(i), method: "GET", path: "/members", status: 200, ms: 0.1, msg: "Request completed" });
  expect(rows[2000]).toMatchObject({ event: "security", kind: "rate_limit", status: 429 });
});

test("actual server SIGTERM flushes a sub-4096-byte security record and exits zero", async () => {
  const { createServer } = await import("node:net");
  const listener = createServer();
  await new Promise<void>(resolve => listener.listen(0, "127.0.0.1", resolve));
  const address = listener.address();
  if (!address || typeof address === "string") throw new Error("Missing ephemeral port");
  const port = address.port;
  await new Promise<void>((resolve, reject) => listener.close(error => { if (error) reject(error); else resolve(); }));
  const child = Bun.spawn([process.execPath, "--no-env-file", "src/server.ts"], {
    cwd: new URL("../../", import.meta.url).pathname,
    env: { ...process.env, DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:1/unavailable",
      JWT_SECRET_KEY: "test-only-secret-at-least-32-characters", PORT: String(port),
      NODE_ENV: "production", RESPONSE_CACHE: "false", RATELIMIT_ENABLED: "false", LOG_LEVEL: "info" },
    stdout: "pipe", stderr: "pipe",
  });
  const stdout = new Response(child.stdout).text(), stderr = new Response(child.stderr).text();
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try { if ((await fetch(`http://127.0.0.1:${String(port)}/health`)).ok) { ready = true; break; } } catch { /* Startup race. */ }
      await Bun.sleep(20);
    }
    expect(ready).toBe(true);
    expect((await fetch(`http://127.0.0.1:${String(port)}/static/%00`)).status).toBe(400);
    // A 414 generates one small buffered security record without touching the DB.
    expect((await fetch(`http://127.0.0.1:${String(port)}/${"x".repeat(2050)}`)).status).toBe(414);
    child.kill("SIGTERM");
    expect(await child.exited).toBe(0);
    const output = await stdout;
    expect(Buffer.byteLength(output)).toBeLessThan(4096);
    expect(output).toContain('"event":"security"');
    expect(output).toContain('"kind":"url_too_long"');
    expect(output).toContain('"signal":"SIGTERM"');
    expect(await stderr).toBe("");
  } finally { if (child.exitCode === null) { child.kill("SIGKILL"); await child.exited; } }
}, 15000);
