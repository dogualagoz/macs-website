import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { seedDb } from "../test/helpers/db";

const oldDbUrl = process.env.CONTRACT_DB_URL_OLD ?? "postgresql://postgres:postgres@127.0.0.1:5435/macs_test";
const newDbUrl = process.env.CONTRACT_DB_URL_NEW ?? "postgresql://postgres:postgres@127.0.0.1:5436/macs_test";
const sqlOld = postgres(oldDbUrl, { max: 1, connect_timeout: 5, onnotice: () => undefined });
const sqlNew = postgres(newDbUrl, { max: 1, connect_timeout: 5, onnotice: () => undefined });
const seed = await readFile(new URL("./seed.sql", import.meta.url), "utf8");

async function resetBoth(): Promise<void> {
  await seedDb(sqlOld, seed);
  await seedDb(sqlNew, seed);
}

async function runCli(args: string[] = [], env: Record<string, string | undefined> = {}) {
  const child = Bun.spawn([process.execPath, "--no-env-file", "contract/shadow-diff.ts", ...args], {
    cwd: new URL("..", import.meta.url).pathname,
    env: { ...process.env, OLD_URL: ":8001", NEW_URL: ":8011", ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [code, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  return { code, stdout, stderr };
}

beforeEach(resetBoth);
afterEach(resetBoth);
afterAll(async () => {
  await sqlOld.end({ timeout: 1 });
  await sqlNew.end({ timeout: 1 });
});

describe("shadow-diff production parity script", () => {
  test("reports 0 diffs on contract compose with OLD_URL=:8001 NEW_URL=:8011 and honors --max-ids", async () => {
    const full = await runCli(["--max-ids", "200"]);
    expect(full.stderr).toBe("");
    expect(full.code).toBe(0);
    const fullMatch = /^shadow-diff: (\d+) requests, 0 diffs\n$/.exec(full.stdout);
    expect(fullMatch).not.toBeNull();
    const fullCount = Number(fullMatch?.[1] ?? 0);
    expect(fullCount).toBe(48);

    const capped = await runCli(["--max-ids=1"]);
    expect(capped.stderr).toBe("");
    expect(capped.code).toBe(0);
    const cappedMatch = /^shadow-diff: (\d+) requests, 0 diffs\n$/.exec(capped.stdout);
    expect(cappedMatch).not.toBeNull();
    expect(Number(cappedMatch?.[1] ?? 0)).toBe(23);
  });

  test("exits 1 and reports /events/1 and title field path when event title changes in new DB", async () => {
    await sqlNew`UPDATE public.events SET title = 'Degistirilmis Etkinlik Basligi' WHERE id = 1`;
    const result = await runCli();
    expect(result.code).toBe(1);
    const combined = result.stdout + result.stderr;
    expect(combined).toContain("/events/1");
    expect(combined).toContain("title");
    expect(combined).toMatch(/shadow-diff: \d+ requests, [1-9]\d* diffs/);
    expect(combined).not.toContain("Degistirilmis Etkinlik Basligi");
    expect(combined).not.toContain("Bahar Şenliği");
    expect(combined).not.toContain("@example.com");
  });

  test("never logs creator email values when nested creator field differs", async () => {
    await sqlNew`UPDATE public.users SET email = 'gizli-kisisel-veri@example.com' WHERE id = 2`;
    const result = await runCli();
    expect(result.code).toBe(1);
    const combined = result.stdout + result.stderr;
    expect(combined).toContain("/events/1");
    expect(combined).toContain("creator.email");
    expect(combined).not.toContain("gizli-kisisel-veri@example.com");
    expect(combined).not.toContain("mod@example.com");
  });

  test("rejects missing or identical target URLs and invalid CLI flags", async () => {
    for (const bad of [
      await runCli([], { OLD_URL: undefined }),
      await runCli([], { NEW_URL: undefined }),
      await runCli([], { OLD_URL: "http://127.0.0.1:8001", NEW_URL: "http://127.0.0.1:8001" }),
      await runCli(["--max-ids", "0"]),
      await runCli(["--unknown"]),
    ]) {
      expect(bad.code).toBe(1);
      expect(bad.stderr.length).toBeGreaterThan(0);
    }
  });
});
