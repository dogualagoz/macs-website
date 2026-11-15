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
