import { compareResponses, records } from "./compare";
import type { HttpResponseInput } from "./compare";
import type { RequestIdentity } from "./deviations";
import { stableJson } from "./normalize";

export const SHADOW_SEED_PATHS = [
  "/events?limit=100",
  "/events/featured",
  "/projects?limit=100",
  "/projects/featured",
  "/members/leaderboard",
  "/members",
  "/sponsors/",
  "/events?limit=100&status=upcoming",
  "/events?limit=100&status=past",
  "/events/categories",
  "/projects/categories",
  "/sponsors/categories",
  "/sponsors/?is_active=false",
  "/members?limit=200",
] as const;

export function resolveTargetOrigin(raw: string | undefined, name: string): string {
  if (!raw) throw new Error(`${name} is required`);
  const normalized = raw.startsWith(":") ? `http://127.0.0.1${raw}` : raw;
  const url = new URL(normalized);
  if (!["http:", "https:"].includes(url.protocol) || url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
    throw new Error(`${name} must be an HTTP(S) origin or :port`);
  }
  return url.origin;
}

export function parseMaxIds(argv: readonly string[]): number {
  let maxIds = 200;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;
    let rawValue: string | undefined;
    if (arg === "--max-ids") {
      rawValue = argv[++i];
    } else if (arg.startsWith("--max-ids=")) {
      rawValue = arg.slice("--max-ids=".length);
    } else {
      throw new Error(`Usage: bun contract/shadow-diff.ts [--max-ids 200] (unknown argument: ${arg})`);
    }
    if (!rawValue || !/^[1-9]\d*$/.test(rawValue)) {
      throw new Error("--max-ids must be a positive integer");
    }
    maxIds = Number(rawValue);
  }
  return maxIds;
}

export function diffPaths(oldValue: unknown, newValue: unknown, prefix = ""): string[] {
  if (stableJson(oldValue) === stableJson(newValue)) return [];
  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    const paths: string[] = [];
    const maxLen = Math.max(oldValue.length, newValue.length);
    for (let i = 0; i < maxLen; i++) {
      const itemPrefix = prefix ? `${prefix}[${String(i)}]` : `[${String(i)}]`;
      if (i >= oldValue.length || i >= newValue.length) paths.push(itemPrefix);
      else paths.push(...diffPaths(oldValue[i], newValue[i], itemPrefix));
    }
    return paths;
  }
  if (
    oldValue !== null &&
    newValue !== null &&
    typeof oldValue === "object" &&
    typeof newValue === "object" &&
    !Array.isArray(oldValue) &&
    !Array.isArray(newValue)
  ) {
    const oldObj = oldValue as Record<string, unknown>;
    const newObj = newValue as Record<string, unknown>;
    const keys = [...new Set([...Object.keys(oldObj), ...Object.keys(newObj)])].sort();
    const paths: string[] = [];
    for (const key of keys) {
      const keyPrefix = prefix ? `${prefix}.${key}` : key;
      if (!Object.hasOwn(oldObj, key) || !Object.hasOwn(newObj, key)) paths.push(keyPrefix);
      else paths.push(...diffPaths(oldObj[key], newObj[key], keyPrefix));
    }
    return paths;
  }
  return [prefix || "$"];
}

async function fetchGet(origin: string, path: string): Promise<HttpResponseInput> {
  const response = await fetch(new URL(path, origin), {
    method: "GET",
    headers: { Origin: "https://macsclub.com.tr" },
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  const body: unknown = text && contentType.includes("application/json") ? JSON.parse(text) : text || null;
  return { status: response.status, headers: response.headers, body };
}

export async function runShadowDiff(
  argv: readonly string[] = process.argv.slice(2),
  env: Record<string, string | undefined> = process.env,
): Promise<number> {
  const maxIds = parseMaxIds(argv);
  const oldOrigin = resolveTargetOrigin(env.OLD_URL, "OLD_URL");
  const newOrigin = resolveTargetOrigin(env.NEW_URL, "NEW_URL");
  if (oldOrigin === newOrigin) throw new Error("OLD_URL and NEW_URL must be distinct targets");

  const queue: string[] = [...SHADOW_SEED_PATHS];
  const seen = new Set<string>();
  const eventIds = new Set<number>();
  const eventSlugs = new Set<string>();
  const projectIds = new Set<number>();
  const projectSlugs = new Set<string>();
  const memberIds = new Set<number>();
  const sponsorIds = new Set<number>();

  let count = 0;
  let diffs = 0;

  for (const path of queue) {
    if (seen.has(path)) continue;
    seen.add(path);

    const [oldResp, newResp] = await Promise.all([fetchGet(oldOrigin, path), fetchGet(newOrigin, path)]);
    const parsedUrl = new URL(path, oldOrigin);
    const identity: RequestIdentity = { method: "GET", path: parsedUrl.pathname, query: parsedUrl.searchParams };
    const comparison = compareResponses(identity, oldResp, newResp);

    count++;
    if (!comparison.equal && comparison.deviation === null) {
      diffs++;
      const fields = [
        ...(oldResp.status !== newResp.status ? ["status"] : []),
        ...diffPaths(comparison.old, comparison.new),
      ];
      console.log(stableJson({ path, oldStatus: oldResp.status, newStatus: newResp.status, fields }));
    }

    if (oldResp.status === 200 && newResp.status === 200) {
      const route = parsedUrl.pathname;
      if (route === "/events") {
        for (const row of [...records(oldResp.body), ...records(newResp.body)]) {
          if (typeof row.id === "number" && (eventIds.has(row.id) || eventIds.size < maxIds)) {
            eventIds.add(row.id);
            queue.push(`/events/${String(row.id)}`);
          }
          if (typeof row.slug === "string" && row.slug.length > 0 && (eventSlugs.has(row.slug) || eventSlugs.size < maxIds)) {
            eventSlugs.add(row.slug);
            queue.push(`/events/by-slug/${encodeURIComponent(row.slug)}`);
          }
        }
      } else if (route === "/projects") {
        for (const row of [...records(oldResp.body, "projects"), ...records(newResp.body, "projects")]) {
          if (typeof row.id === "number" && (projectIds.has(row.id) || projectIds.size < maxIds)) {
            projectIds.add(row.id);
            queue.push(`/projects/${String(row.id)}`, `/projects/${String(row.id)}/members`);
          }
          if (typeof row.slug === "string" && row.slug.length > 0 && (projectSlugs.has(row.slug) || projectSlugs.size < maxIds)) {
            projectSlugs.add(row.slug);
            queue.push(`/projects/by-slug/${encodeURIComponent(row.slug)}`);
          }
        }
      } else if (route === "/members" || route === "/members/leaderboard") {
        for (const row of [...records(oldResp.body), ...records(newResp.body)]) {
          if (typeof row.id === "number" && (memberIds.has(row.id) || memberIds.size < maxIds)) {
            memberIds.add(row.id);
            const id = String(row.id);
            queue.push(`/members/${id}`, `/members/${id}/stats`, `/members/${id}/projects`);
          }
        }
      } else if (route === "/sponsors/") {
        for (const row of [...records(oldResp.body), ...records(newResp.body)]) {
          if (typeof row.id === "number" && (sponsorIds.has(row.id) || sponsorIds.size < maxIds)) {
            sponsorIds.add(row.id);
            queue.push(`/sponsors/${String(row.id)}`);
          }
        }
      }
    }
  }

  console.log(`shadow-diff: ${String(count)} requests, ${String(diffs)} diffs`);
  return diffs > 0 ? 1 : 0;
}

if (import.meta.main) {
  try {
    process.exitCode = await runShadowDiff();
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
