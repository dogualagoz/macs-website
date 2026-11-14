import { existsSync } from "node:fs";
import { join } from "node:path";
import { selectedDomains } from "./client";

const args = process.argv.slice(2);
if (args.length > 1 || args.some(arg => !arg.startsWith("--domains="))) throw new Error("Usage: bun contract/run.ts [--domains=system,auth,users,...]");
const domains = selectedDomains(args[0]?.slice("--domains=".length) ?? process.env.CONTRACT_DOMAINS);
const legacy = ["auth", "users", "events", "sponsors", "uploads", "projects"];
const files: string[] = [];
for (const name of domains) {
  const file = join(import.meta.dir, `${name}.test.ts`);
  if (existsSync(file)) files.push(file);
  else if ((args.length > 0 || process.env.CONTRACT_DOMAINS !== undefined) && !legacy.includes(name)) throw new Error(`No contract suite exists for selected domain: ${name}`);
}
if (domains.some(name => legacy.includes(name))) files.push(join(import.meta.dir, "legacy-pytest-port.test.ts"));
const child = Bun.spawn([process.execPath, "test", ...files], {
  env: { ...process.env, CONTRACT_DOMAINS: domains.join(",") }, stdin: "inherit", stdout: "inherit", stderr: "inherit",
});
process.exitCode = await child.exited;
