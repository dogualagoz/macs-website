import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { cpus, platform } from "node:os";
import { dirname } from "node:path";
import { parseArgs } from "node:util";

const paths = [
  "/events?limit=100",
  "/events/featured",
  "/projects?limit=100",
  "/projects/featured",
  "/members/leaderboard",
  "/members",
  "/sponsors/",
] as const;

type Result = {
  p50: number;
  p95: number;
  p99: number;
  rps: number;
  successRate: number;
};

type OhaOutput = {
  summary?: { requestsPerSec?: number; successRate?: number };
  latencyPercentiles?: { p50?: number | null; p95?: number | null; p99?: number | null };
};

async function capture(command: string[]): Promise<string> {
  const child = Bun.spawn(command, { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(`${command[0] ?? "Command"} exited ${String(exitCode)}: ${stderr.trim()}`);
  }
  if (stderr.trim()) console.error(stderr.trim());
  return stdout;
}

function finite(value: number | null | undefined, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid oha field: ${name}`);
  }
  return value;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      target: { type: "string" },
      out: { type: "string" },
      label: { type: "string" },
    },
    strict: true,
    allowPositionals: false,
  });
  if (!values.target || !values.out) {
    throw new Error("Usage: bun bench/run.ts --target <url> --out <file> [--label <text>]");
  }
  const target = new URL(values.target);
  if (!["http:", "https:"].includes(target.protocol) || target.username || target.password) {
    throw new Error("--target must be an HTTP(S) URL without credentials");
  }
  if (target.pathname !== "/" || target.search || target.hash) {
    throw new Error("--target must be the server origin without a path, query or fragment");
  }

  const meta = {
    date: new Date().toISOString(),
    target: target.origin,
    concurrency: 50,
    durationSec: 20,
    ohaVersion: (await capture(["oha", "--version"])).trim(),
    host: platform() === "darwin"
      ? execFileSync("sysctl", ["-n", "machdep.cpu.brand_string"], { encoding: "utf8" }).trim()
      : cpus()[0]?.model ?? platform(),
    ...(values.label === undefined ? {} : { label: values.label }),
  };
  const results: Record<string, Result> = {};
  console.log("Endpoint\tp50 (ms)\tp95 (ms)\tp99 (ms)\tRPS\tsuccessRate");
  for (const path of paths) {
    const url = new URL(path, target).href;
    const args = ["oha", "-c", "50", "-z"];
    const outputArgs = ["--no-tui", "--output-format", "json", url];
    console.error(`Warming ${path} for 5s; measuring for 20s`);
    await capture([...args, "5s", ...outputArgs]);
    const raw = JSON.parse(await capture([...args, "20s", ...outputArgs])) as OhaOutput;
    const successRate = finite(raw.summary?.successRate, "summary.successRate");
    if (successRate > 1) throw new Error(`${path}: successRate is greater than 1`);
    // Check before latencies: oha emits null percentiles when every request fails.
    if (successRate < 0.999) {
      throw new Error(`${path}: successRate ${String(successRate)} < 0.999; refusing to save benchmark`);
    }
    const result: Result = {
      p50: finite(raw.latencyPercentiles?.p50, "latencyPercentiles.p50") * 1000,
      p95: finite(raw.latencyPercentiles?.p95, "latencyPercentiles.p95") * 1000,
      p99: finite(raw.latencyPercentiles?.p99, "latencyPercentiles.p99") * 1000,
      rps: finite(raw.summary?.requestsPerSec, "summary.requestsPerSec"),
      successRate,
    };
    results[path] = result;
    console.log([
      path, result.p50.toFixed(3), result.p95.toFixed(3), result.p99.toFixed(3),
      result.rps.toFixed(2), result.successRate.toFixed(3),
    ].join("\t"));
  }
  await mkdir(dirname(values.out), { recursive: true });
  await writeFile(values.out, `${JSON.stringify({ meta, results }, null, 2)}\n`);
  console.error(`Saved benchmark to ${values.out}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
