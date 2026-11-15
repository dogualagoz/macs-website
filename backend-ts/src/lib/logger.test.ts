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

test("D5: forced shutdown timeout flushes buffered logs before exit(1) and calls cache.stop before cache.drain", async () => {
  const cwd = new URL("../../", import.meta.url).pathname;
  const child = Bun.spawn([process.execPath, "--no-env-file", "-e", `
    import { createLogger } from "./src/lib/logger";
    import { createShutdownHandler } from "./src/shutdown";
    const logger = createLogger("info");
    const shutdown = createShutdownHandler({
      logger,
      server: { stop: () => new Promise<void>(() => undefined) },
      cache: { stop() {}, drain: () => Promise.resolve() },
      sql: { end: () => Promise.resolve() },
      timeoutMs: 30,
    });
    process.once("SIGTERM", () => { shutdown("SIGTERM"); });
    const keepAlive = setInterval(() => undefined, 1000);
    void keepAlive;
    process.stdout.write("READY\\n");
  `], { cwd, stdout: "pipe", stderr: "pipe" });
  const stdoutPromise = new Response(child.stdout).text();
  const stderrPromise = new Response(child.stderr).text();
  try {
    await Bun.sleep(100);
    child.kill("SIGTERM");
    expect(await child.exited).toBe(1);
    const out = await stdoutPromise;
    expect(out).toContain('"signal":"SIGTERM"');
    expect(out).toContain("Graceful shutdown timed out");
    expect(await stderrPromise).toBe("");
  } finally { if (child.exitCode === null) { child.kill("SIGKILL"); await child.exited; } }

  // Verify cache.stop() runs strictly before cache.drain() in a spawned shutdown sequence
  const orderChild = Bun.spawn([process.execPath, "--no-env-file", "-e", `
    import { createResponseCache } from "./src/lib/cache";
    import { createShutdownHandler } from "./src/shutdown";
    const events: string[] = [];
    const baseCache = createResponseCache({ max: 10, ttlMs: 1000, now: Date.now, enabled: true });
    let resolveQueued!: () => void;
    const activeStarted = new Promise<void>(r => { resolveQueued = r; });
    baseCache.registerWarmup("k1", "projects", async () => { resolveQueued(); await Bun.sleep(25); return { status: 200, body: "a", headers: {}, cacheable: true }; });
    baseCache.registerWarmup("k2", "projects", async () => { await Bun.sleep(25); return { status: 200, body: "b", headers: {}, cacheable: true }; });
    baseCache.registerWarmup("k3", "projects", async () => { events.push("k3-ran"); return { status: 200, body: "c", headers: {}, cacheable: true }; });
    const warmupPromise = baseCache.warmupStartup();
    await activeStarted;
    const shutdown = createShutdownHandler({
      logger: { info() {}, error() {}, flush() {} },
      server: { stop: async () => { events.push("server.stop"); } },
      cache: {
        stop: () => { events.push("cache.stop"); baseCache.stop(); },
        drain: async () => { events.push("cache.drain:start"); await baseCache.drain(); events.push("cache.drain:end"); },
      },
      sql: { end: async () => { events.push("sql.end"); } },
      timeoutMs: 2000,
    });
    shutdown("SIGTERM");
    await Promise.all([warmupPromise, Bun.sleep(60)]);
    console.log(JSON.stringify(events));
  `], { cwd, stdout: "pipe", stderr: "pipe" });
  expect(await orderChild.exited).toBe(0);
  const events = JSON.parse(await new Response(orderChild.stdout).text()) as string[];
  expect(events.indexOf("cache.stop")).toBeGreaterThan(-1);
  expect(events.indexOf("cache.stop")).toBeLessThan(events.indexOf("cache.drain:start"));
  expect(events).not.toContain("k3-ran");
}, 15000);
