import type { Domain } from "./client";
import { compareResponses, records } from "./compare";
import type { Comparison } from "./compare";
import { stableJson } from "./normalize";

export { compareResponses, records };
export type { Comparison };

export interface CatalogueRequest { domain: Domain; path: string; protected?: boolean; binary?: boolean }
// Shared read catalogue for Tasks 6–10. Each domain can extend its own filters as
// contracts are added; discovered IDs/slugs cover list/detail serialization too.
export const GET_CATALOGUE: readonly CatalogueRequest[] = [
  ...["/", "/health", "/nope", "/redoc"].map(path => ({ domain: "system" as const, path })),
  ...["/users/me", "/users", "/users?skip=1&limit=2", "/users?skip=-1", "/users?limit=-1", "/users?limit=0", "/users?limit=100000", "/users/999999", "/users/not-an-id"].map(path => ({ domain: "users" as const, path, protected: true })),
  ...["/events", "/events?limit=100", "/events?skip=1&limit=2", "/events?search=Çağrı", "/events?category_id=1", "/events?status=upcoming", "/events?status=past", "/events?status=X", "/events?sort_by=title", "/events?sort_by=created_at&sort_desc=true", "/events?sort_by=hashed_password", "/events?skip=-1", "/events?limit=101", "/events?limit=0", "/events?skip=X", "/events/categories", "/events/categories/999999", "/events/featured", "/events/by-slug/missing", "/events/999999", "/events/3", "/events/4", "/events/not-an-id"].map(path => ({ domain: "events" as const, path })),
  { domain: "events", path: "/events/admin", protected: true },
  ...["/members", "/members?skip=1&limit=2", "/members?search=Ayşe", "/members?is_active=false", "/members?is_active=true", "/members?is_active=X", "/members?limit=201", "/members?skip=-1", "/members/leaderboard", "/members/leaderboard?limit=1", "/members/999999", "/members/999999/stats", "/members/999999/projects", "/members/not-an-id"].map(path => ({ domain: "members" as const, path })),
  ...["/sponsors/", "/sponsors", "/sponsors/?category=Kafe", "/sponsors/?is_active=false", "/sponsors/?skip=1&limit=2", "/sponsors/?limit=201", "/sponsors/?skip=-1", "/sponsors/categories", "/sponsors/999999", "/sponsors/not-an-id"].map(path => ({ domain: "sponsors" as const, path })),
  ...["/projects", "/projects?limit=100", "/projects?skip=1&limit=2", "/projects?search=MACS", "/projects?category_id=1", "/projects?status=COMPLETED", "/projects?status=X", "/projects?limit=101", "/projects?skip=-1", "/projects/categories", "/projects/categories/999999", "/projects/featured", "/projects/by-slug/missing", "/projects/999999", "/projects/3", "/projects/4", "/projects/999999/members", "/projects/not-an-id"].map(path => ({ domain: "projects" as const, path })),
  { domain: "projects", path: "/projects/admin", protected: true },
  { domain: "projects", path: "/projects/admin?status=X", protected: true },
  { domain: "uploads", path: "/api/upload/download-all", protected: true, binary: true },
  { domain: "uploads", path: "/uploads/missing.png" },
  { domain: "uploads", path: "/static/uploads/missing.png" },
];
export async function runDifferential(): Promise<number> {
  const oldUrl = process.env.OLD_URL, newUrl = process.env.NEW_URL;
  if (!oldUrl || !newUrl) throw new Error("OLD_URL and NEW_URL are required");
  if (new URL(oldUrl).origin === new URL(newUrl).origin) throw new Error("OLD_URL and NEW_URL must be distinct targets");
  // The reusable client requires a single-target configuration at import. The
  // differential explicitly selects old, then addresses both origins directly.
  process.env.TARGET_KIND = "old";
  process.env.TARGET_URL = oldUrl;
  const { loginAt, requestApi, resetTarget, selectedDomains, targetUrl } = await import("./client");
  targetUrl(newUrl);
  const domains = selectedDomains();
  // Both resets finish before either login or catalogue request is sent.
  await resetTarget("old");
  await resetTarget("new");
  const tokens = { old: await loginAt(oldUrl, "admin@example.com"), new: await loginAt(newUrl, "admin@example.com") };
  const catalogue = [...GET_CATALOGUE.filter(r => domains.includes(r.domain))];
  const seen = new Set<string>();
  let count = 0, unexpected = 0, expected = 0;
  for (const item of catalogue) {
    if (seen.has(item.path)) continue;
    seen.add(item.path);
    const options = (kind: "old" | "new") => ({ headers: { Origin: "https://macsclub.com.tr" }, ...(item.protected ? { token: tokens[kind] } : {}) });
    const old = await requestApi(oldUrl, "GET", item.path, options("old"));
    const next = await requestApi(newUrl, "GET", item.path, options("new"));
    const url = new URL(item.path, oldUrl);
    const identity = { method: "GET", path: url.pathname, query: url.searchParams };
    let result = compareResponses(identity, old, next);
    // P1 permits the redirect only. Its destination's actual body must still
    // match new, so a 200 with the wrong sponsor data cannot be waived.
    if (result.deviation === "P1") {
      const location = new URL(old.headers.get("location") ?? "", oldUrl);
      if (location.origin !== new URL(oldUrl).origin) throw new Error("Unsafe redirect origin");
      const followed = await requestApi(oldUrl, "GET", location.pathname + location.search, options("old"));
      const canonical = compareResponses({ method: "GET", path: location.pathname, query: location.searchParams }, followed, next);
      if (!canonical.equal) result = { ...canonical, deviation: null };
    }
    count++;
    if (!result.equal) {
      if (result.deviation) { expected++; console.log(`approved ${result.deviation}: GET ${item.path} (${String(old.status)} → ${String(next.status)})`); }
      else {
        unexpected++;
        console.error(stableJson({ method: "GET", path: item.path, oldStatus: old.status, newStatus: next.status, old: result.old, new: result.new }));
      }
    }
    // Discover from both targets so extra/missing records cannot shrink coverage.
    if (old.status === 200 && next.status === 200) {
      const route = url.pathname;
      const collection = ["/events", "/events/admin", "/events/categories", "/members", "/sponsors/", "/projects", "/projects/admin", "/projects/categories", "/users"].includes(route);
      if (collection) {
        const key = route === "/users" ? "users" : ["/projects", "/projects/admin"].includes(route) ? "projects" : undefined;
        for (const row of [...records(old.body, key), ...records(next.body, key)]) {
          const base = route.replace(/\/admin$/, "").replace(/\/$/, "");
          const id = String(row.id);
          catalogue.push({ domain: item.domain, path: `${base}/${id}`, ...(item.protected ? { protected: true } : {}) });
          if (base === "/members") {
            catalogue.push({ domain: "members", path: `/members/${id}/stats` }, { domain: "members", path: `/members/${id}/projects` });
          }
          if (base === "/projects") catalogue.push({ domain: "projects", path: `/projects/${id}/members` });
          if (["/projects", "/events"].includes(base) && typeof row.slug === "string") catalogue.push({ domain: item.domain, path: `${base}/by-slug/${encodeURIComponent(row.slug)}` });
        }
      }
    }
  }
  console.log(`differential: ${String(count)} requests, ${String(unexpected)} diffs (${String(expected)} approved deviations)`);
  return unexpected ? 1 : 0;
}
if (import.meta.main) {
  try { process.exitCode = await runDifferential(); }
  catch (error: unknown) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
