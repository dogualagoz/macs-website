import type { TargetKind } from "./client";
import { stableJson } from "./normalize";

export interface Deviation { id: string; summary: string }
export const knownDeviations: readonly Deviation[] = [
  { id: "a", summary: "Lockout works: old 500, new 401 with remaining minutes" },
  { id: "b", summary: "Broken password hash: old 500, new incorrect-credentials 401" },
  { id: "c", summary: "Constant-time admin_secret comparison (not HTTP-observable)" },
  { id: "d", summary: "Unhandled error: old plain 500 without CORS, new JSON 500 with CORS" },
  { id: "e", summary: "Foreign key violation: old 500, new 409; excludes project-category deletion (204 parity)" },
  { id: "f", summary: "Invalid project status filter: old 500, new 422" },
  { id: "g", summary: "Previously unordered lists now ordered by id" },
  { id: "h", summary: "Users pagination: skip >= 0, limit 1..100, default 10" },
  { id: "j", summary: "Public event creator retained on both targets until Task 19" },
  { id: "k", summary: "Embedded project_role reflects its own project membership; old shared Member instances leak roles across projects" },
  { id: "l", summary: "invalid sponsor update rejected with 422 instead of committing a row that then fails response validation" },
  { id: "m", summary: "Production docs and OpenAPI are disabled by default; DOCS_ENABLED=true explicitly enables them" },
  { id: "n", summary: "Raw static traversal (encoded separators, null bytes, backslashes, double encoding) is 400; Bun-normalized dot segments retain normalized-path semantics" },
  { id: "P1", summary: "Slash redirect: old 307, new accepts both forms directly" },
  { id: "P2", summary: "Rate limits count before auth/validation in one process" },
  { id: "P3", summary: "Non-Latin slug letters removed; empty base uses UTC timestamp" },
  { id: "P4", summary: "Validation omits ctx/url; supported type/loc/msg/input retained" },
  { id: "P5", summary: "Redoc removed: old 200, new 404" },
  { id: "P6", summary: "Project and members atomic: missing member leaves no project, 404 on both" },
  { id: "P7", summary: "PUT title:null: old 500, new 422" },
  { id: "P8", summary: "Change-password below configured minimum >6: old 500, new 400" },
];
export function selectDeviation<T>(kind: TargetKind, id: string, expected: { old: T; new: T }): T {
  if (!knownDeviations.some(d => d.id === id)) throw new Error(`Unknown deviation: ${id}`);
  return expected[kind];
}
export function deviation<T>(id: string, expected: { old: T; new: T }): T {
  const kind = process.env.TARGET_KIND;
  if (kind !== "old" && kind !== "new") throw new Error("TARGET_KIND must be old or new");
  return selectDeviation(kind, id, expected);
}
export interface RequestIdentity { method: string; path: string; query: URLSearchParams }
export interface ComparableResponse { status: number; body: unknown; headers?: Headers }
function validationAt(body: unknown, field: string, input: string, type: string, msg: string): boolean {
  if (body === null || typeof body !== "object" || !("detail" in body) || !Array.isArray(body.detail) || body.detail.length !== 1) return false;
  const item: unknown = body.detail[0];
  return item !== null && typeof item === "object" && "type" in item && item.type === type && "loc" in item && stableJson(item.loc) === stableJson(["query", field]) && "msg" in item && item.msg === msg && "input" in item && item.input === input;
}
function compareMemberId(a: unknown, b: unknown): number {
  const idA = a !== null && typeof a === "object" && "id" in a ? a.id : undefined;
  const idB = b !== null && typeof b === "object" && "id" in b ? b.id : undefined;
  if (typeof idA === "number" && typeof idB === "number" && idA !== idB) return idA - idB;
  if (typeof idA === "string" && typeof idB === "string") {
    const cmp = idA.localeCompare(idB);
    if (cmp !== 0) return cmp;
  }
  return stableJson(a).localeCompare(stableJson(b));
}
// Align embedded members by member id before comparing/masking roles so SQL join
// order differences do not hide role-only diffs while keeping every other field strict.
function alignProjectMembers(body: unknown, maskRoles: boolean): unknown {
  if (body === null || typeof body !== "object") return body;
  if (Array.isArray(body)) return body.map(item => alignProjectMembers(item, maskRoles));
  if ("projects" in body && Array.isArray(body.projects)) return { ...body, projects: body.projects.map(item => alignProjectMembers(item, maskRoles)) };
  if (!("members" in body) || !Array.isArray(body.members)) return body;
  const mapped = body.members.map((member: unknown) => maskRoles && member !== null && typeof member === "object" && !Array.isArray(member) && Object.hasOwn(member, "project_role")
    ? { ...member, project_role: "<project-role>" } : member);
  return { ...body, members: [...mapped].sort(compareMemberId) };
}
function sponsorUpdateValidation(body: unknown): boolean {
  if (body === null || typeof body !== "object" || !("detail" in body) || !Array.isArray(body.detail) || body.detail.length === 0) return false;
  return body.detail.every((item: unknown) => {
    if (item === null || typeof item !== "object" || !("type" in item) || !("loc" in item) || !("msg" in item) || !("input" in item)) return false;
    if (stableJson(item.loc) === stableJson(["body", "discount_info"])) {
      return item.type === "string_too_long" && item.msg === "String should have at most 500 characters" && typeof item.input === "string" && item.input.length > 500;
    }
    if (stableJson(item.loc) === stableJson(["body", "is_active"]) || stableJson(item.loc) === stableJson(["body", "is_featured"])) {
      return item.type === "bool_type" && item.msg === "Input should be a valid boolean" && item.input === null;
    }
    return false;
  });
}
function rawStaticTraversal(path: string): boolean {
  if (/(?:^|\/)(?:\.|%2e){1,2}(?:\/|$)/i.test(path)) return false;
  if (!/^\/(?:uploads|static)\//.test(path) || !/(?:%2f|%5c|%00|%25|\\)/i.test(path)) return false;
  for (;;) {
    if (path.includes("..") || path.includes("\0") || path.includes("\\")) return true;
    try {
      const next = decodeURIComponent(path);
      if (next === path) return false;
      path = next;
    } catch { return false; }
  }
}
// Exceptions are deliberately narrow. Only explicitly matched GETs and PUT /sponsors/:id (l)
// are approved; other write-only deviations never authorize unrelated catalogue differences.
export function approvedDeviation(r: RequestIdentity, old: ComparableResponse, next: ComparableResponse): string | null {
  if (r.method === "PUT" && /^\/sponsors\/\d+$/.test(r.path) && !r.query.size
    && old.status === 500 && old.body === "Internal Server Error" && next.status === 422
    && sponsorUpdateValidation(next.body)) return "l";
  if (r.method !== "GET") return null;
  if (["/docs", "/docs/", "/openapi.json"].includes(r.path) && (old.status === 200 || old.status === 307) && next.status === 404) return "m";
  if (rawStaticTraversal(r.path) && !r.query.size
    && old.status === 404 && stableJson(old.body) === stableJson({ detail: "Not Found" })
    && next.status === 400 && stableJson(next.body) === stableJson({ detail: "Bad Request" })) return "n";
  const projectRead = ["/projects", "/projects/admin", "/projects/featured"].includes(r.path) || /^\/projects\/(?:\d+|by-slug\/[^/]+)$/.test(r.path);
  if (projectRead && old.status === next.status
    && stableJson(alignProjectMembers(old.body, false)) !== stableJson(alignProjectMembers(next.body, false))
    && stableJson(alignProjectMembers(old.body, true)) === stableJson(alignProjectMembers(next.body, true))) return "k";
  const status = r.query.get("status");
  const enumMessage = "Input should be 'PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD' or 'CANCELLED'";
  const projectFilter = ["/projects", "/projects/admin"].includes(r.path);
  const validStatuses = ["PLANNING", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "CANCELLED"];
  if (projectFilter && status && !validStatuses.includes(status)
    && old.status === 500 && old.body === "Internal Server Error" && next.status === 422
    && validationAt(next.body, "status", status, "enum", enumMessage)) return "f";
  if (r.path === "/users") {
    for (const field of ["skip", "limit"]) {
      const input = r.query.get(field);
      if (input === null || !/^[+-]?\d+$/.test(input)) continue;
      const n = Number(input);
      const lower = field === "skip" ? 0 : 1;
      const aboveCap = field === "limit" && n > 100;
      if (!Number.isSafeInteger(n) || n >= lower && !aboveCap) continue;
      const oldShape = n < 0
        ? old.status === 500 && old.body === "Internal Server Error"
        : old.status === 200 && old.body !== null && typeof old.body === "object"
          && "users" in old.body && Array.isArray(old.body.users)
          && "total" in old.body && typeof old.body.total === "number";
      const type = aboveCap ? "less_than_equal" : "greater_than_equal";
      const message = aboveCap ? "Input should be less than or equal to 100"
        : `Input should be greater than or equal to ${String(lower)}`;
      if (oldShape && next.status === 422 && validationAt(next.body, field, input, type, message)) return "h";
    }
  }
  if (r.path === "/redoc" && !r.query.size && old.status === 200 && next.status === 404 && stableJson(next.body) === stableJson({ detail: "Not Found" })) return "P5";
  if (r.path === "/sponsors" && old.status === 307 && next.status === 200 && Array.isArray(next.body) && old.headers?.get("location")?.endsWith(`/sponsors/${r.query.size ? `?${r.query}` : ""}`)) return "P1";
  // No catalogue GET opts into unhandled-500 deviation d. In particular,
  // f/h require 422; a new-side 500 must remain an unexpected difference.
  // g and P4 are applied by normalize, never by a generic error waiver.
  return null;
}
