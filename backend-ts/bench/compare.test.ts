import { expect, test } from "bun:test";
import { evaluateGate } from "./compare";

const path = "/events?limit=100";
const metric = { p50: 10, p95: 20, p99: 30, rps: 1000, successRate: 1 };
const baseline = { [path]: metric };
const candidate = (patch: Partial<typeof metric>) => ({ [path]: { ...metric, ...patch } });
test("passes when p95 and RPS equal the baseline", () => {
  expect(evaluateGate(baseline, candidate({}), 2)).toEqual({ pass: true, rows: [{ path, p95Old: 20, p95New: 20, rpsOld: 1000, rpsNew: 1000, ok: true, meetsTarget: false }] });
});
test("fails on slower p95 even with high RPS", () => { expect(evaluateGate(baseline, candidate({ p95: 20.1, rps: 5000 }), 2).pass).toBe(false); });
test("fails on lower RPS even with low p95", () => { expect(evaluateGate(baseline, candidate({ p95: 10, rps: 999 }), 2).pass).toBe(false); });
test("fails on missing endpoint", () => { expect(evaluateGate(baseline, {}, 2).rows[0]?.ok).toBe(false); expect(evaluateGate(baseline, {}, 2).pass).toBe(false); });
test("fails when successRate is below 0.999", () => { expect(evaluateGate(baseline, candidate({ successRate: 0.9989 }), 2).pass).toBe(false); });
test("accepts successRate of exactly 0.999", () => { expect(evaluateGate(baseline, candidate({ successRate: 0.999 }), 2).pass).toBe(true); });
test("2x target does not affect gate and respects custom multiplier", () => {
  const result = evaluateGate(baseline, candidate({ p95: 10, rps: 1500 }), 2);
  expect(result.pass).toBe(true); expect(result.rows[0]?.meetsTarget).toBe(false);
  expect(evaluateGate(baseline, candidate({ rps: 2000 }), 2).rows[0]?.meetsTarget).toBe(true);
  expect(evaluateGate(baseline, candidate({ rps: 1500 }), 1.5).rows[0]?.meetsTarget).toBe(true);
});
test("every endpoint must pass", () => {
  const result = evaluateGate({ ...baseline, "/members": metric }, { ...candidate({ rps: 3000 }), "/members": { ...metric, p95: 21 } }, 2);
  expect(result.pass).toBe(false); expect(result.rows.map(row => row.ok)).toEqual([true, false]);
});
test("empty baseline, extra endpoint, invalid numbers and invalid multiplier fail closed", () => {
  expect(evaluateGate({}, {}, 2).pass).toBe(false);
  expect(evaluateGate(baseline, { ...candidate({}), "/extra": metric }, 2).pass).toBe(false);
  for (const value of [NaN, Infinity, -1]) {
    expect(evaluateGate(baseline, candidate({ p95: value }), 2).pass).toBe(false);
    expect(evaluateGate(baseline, candidate({ rps: value }), 2).pass).toBe(false);
  }
  expect(evaluateGate(baseline, candidate({ successRate: 1.1 }), 2).pass).toBe(false);
  expect(evaluateGate({ [path]: { ...metric, rps: 0 } }, candidate({}), 2).pass).toBe(false);
  expect(() => evaluateGate(baseline, candidate({}), 0)).toThrow("multiplier");
});
test("CLI reads benchmark envelopes and reports pass, target miss and fail exit codes", () => {
  const dir = `${import.meta.dirname}/../node_modules/.cache/compare-${crypto.randomUUID()}`;
  const run = () => Bun.spawnSync(["bun", "bench/compare.ts", "--baseline", `${dir}/old.json`, "--candidate", `${dir}/new.json`]);
  return (async () => {
    const { mkdir, rm, writeFile } = await import("node:fs/promises");
    await mkdir(dir, { recursive: true });
    try {
      await writeFile(`${dir}/old.json`, JSON.stringify({ results: baseline }));
      await writeFile(`${dir}/new.json`, JSON.stringify({ results: candidate({ rps: 1500 }) }));
      const pass = run(); expect(pass.exitCode).toBe(0);
      expect(pass.stdout.toString()).toContain("GATE PASS (1/1)"); expect(pass.stdout.toString()).toContain(`TARGET MISS: ${path} x1.50`);
      await writeFile(`${dir}/new.json`, JSON.stringify({ results: candidate({ rps: 999 }) }));
      const fail = run(); expect(fail.exitCode).toBe(1); expect(fail.stdout.toString()).toContain("GATE FAIL (0/1)");
    } finally { await rm(dir, { recursive: true, force: true }); }
  })();
});
