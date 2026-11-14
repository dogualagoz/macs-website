import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { z } from "zod";

const metricSchema = z.object({
  p50: z.number().nonnegative(), p95: z.number().nonnegative(), p99: z.number().nonnegative(),
  rps: z.number().positive(), successRate: z.number().min(0.999).max(1),
});
export type Metric = z.infer<typeof metricSchema>;
export type Results = Record<string, Metric>;
export interface GateRow {
  path: string; p95Old: number | null; p95New: number | null; rpsOld: number | null; rpsNew: number | null; ok: boolean; meetsTarget: boolean;
}
export function evaluateGate(baseline: Results, candidate: Results, multiplier: number): { pass: boolean; rows: GateRow[] } {
  if (!Number.isFinite(multiplier) || multiplier <= 0) throw new Error("Invalid target multiplier");
  const paths = [...new Set([...Object.keys(baseline), ...Object.keys(candidate)])];
  const rows = paths.map((path): GateRow => {
    const old = baseline[path]; const next = candidate[path];
    const valid = metricSchema.safeParse(old).success && metricSchema.safeParse(next).success;
    return { path, p95Old: old?.p95 ?? null, p95New: next?.p95 ?? null, rpsOld: old?.rps ?? null, rpsNew: next?.rps ?? null,
      ok: valid && !!old && !!next && next.p95 <= old.p95 && next.rps >= old.rps,
      meetsTarget: valid && !!old && !!next && next.rps >= old.rps * multiplier };
  });
  return { pass: rows.length > 0 && rows.every(row => row.ok), rows };
}
async function main(): Promise<void> {
  const { values } = parseArgs({ options: { baseline: { type: "string" }, candidate: { type: "string" }, "target-multiplier": { type: "string", default: "2" }, informational: { type: "boolean", default: false } }, strict: true, allowPositionals: false });
  if (!values.baseline || !values.candidate) throw new Error("Usage: bun bench/compare.ts --baseline <f> --candidate <f> [--target-multiplier 2] [--informational]");
  const envelope = z.object({ results: z.record(z.string(), metricSchema) });
  const baseline = envelope.parse(JSON.parse(await readFile(values.baseline, "utf8")));
  const candidateSource: unknown = JSON.parse(await readFile(values.candidate, "utf8"));
  const candidate = envelope.parse(candidateSource);
  const observedCacheOff = z.object({ meta: z.object({ cacheObserved: z.literal(false) }) }).safeParse(candidateSource).success;
  if (!values.informational && !observedCacheOff) throw new Error("GATE FAIL: candidate meta.cacheObserved must be false; cached or unverified candidates are informational only");
  const gate = evaluateGate(baseline.results, candidate.results, Number(values["target-multiplier"]));
  console.log("Endpoint\tp95 old (ms)\tp95 new (ms)\tRPS old\tRPS new\tgate");
  for (const row of gate.rows) {
    console.log([row.path, row.p95Old?.toFixed(3) ?? "missing", row.p95New?.toFixed(3) ?? "missing", row.rpsOld?.toFixed(2) ?? "missing", row.rpsNew?.toFixed(2) ?? "missing", row.ok ? "PASS" : "FAIL"].join("\t"));
    if (!row.meetsTarget) console.log(`TARGET MISS: ${row.path} x${row.rpsOld && row.rpsNew !== null ? (row.rpsNew / row.rpsOld).toFixed(2) : "missing"}`);
  }
  if (values.informational) {
    console.log("INFORMATIONAL ONLY: comparison cannot satisfy the cache-off gate");
    process.exitCode = 1;
    return;
  }
  console.log(`GATE ${gate.pass ? "PASS" : "FAIL"} (${gate.rows.filter(row => row.ok).length.toString()}/${gate.rows.length.toString()})`);
  process.exitCode = gate.pass ? 0 : 1;
}
if (import.meta.main) main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
