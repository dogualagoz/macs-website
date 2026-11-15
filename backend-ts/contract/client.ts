import { readFile } from "node:fs/promises";
import { SignJWT } from "jose";
import postgres from "postgres";
import { seedDb } from "../test/helpers/db";

export type TargetKind = "old" | "new";
export const SEED = {
  admin: "admin@example.com", mod: "mod@example.com", pending: "pending@example.com",
  rejected: "rejected@example.com", inactive: "inactive@example.com", locked: "locked@example.com",
  broken: "broken@example.com", password: "parola123",
} as const;
export const DOMAINS = ["system", "auth", "users", "events", "members", "sponsors", "projects", "uploads"] as const;
export type Domain = typeof DOMAINS[number];
export function selectedDomains(raw = process.env.CONTRACT_DOMAINS): readonly Domain[] {
  if (raw === undefined) return DOMAINS;
  const names = raw.split(",");
  if (!names.length || names.some(name => !DOMAINS.includes(name as Domain))) throw new Error(`Invalid CONTRACT_DOMAINS: ${raw}`);
  return [...new Set(names)] as Domain[];
}
export function isDomainEnabled(name: Domain): boolean { return selectedDomains().includes(name); }

export function targetKind(raw = process.env.TARGET_KIND): TargetKind {
  if (raw !== "old" && raw !== "new") throw new Error("TARGET_KIND must be old or new");
  return raw;
}
export function targetUrl(raw = process.env.TARGET_URL): string {
  if (!raw) throw new Error("TARGET_URL is required");
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol) || url.pathname !== "/" || url.search || url.hash || url.username || url.password) throw new Error("TARGET_URL must be an HTTP(S) origin");
  return url.origin;
}
export const TARGET_URL: string = targetUrl();
export const TARGET_KIND: TargetKind = targetKind();
export interface ApiOptions {
  token?: string;
  json?: unknown;
  form?: Record<string, string>;
  headers?: Record<string, string>;
  file?: { name: string; bytes: Uint8Array; type: string };
}
export interface ApiResponse { status: number; headers: Headers; body: unknown; text: string }
export async function requestApi(base: string, method: string, path: string, o: ApiOptions = {}): Promise<ApiResponse> {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("API path must be origin-relative");
  if ([o.json !== undefined, o.form !== undefined, o.file !== undefined].filter(Boolean).length > 1) throw new Error("Choose one request body encoding");
  const headers = new Headers(o.headers);
  if (o.token !== undefined) headers.set("Authorization", `Bearer ${o.token}`);
  let body: BodyInit | undefined;
  if (o.file) {
    const data = new FormData();
    data.set("file", new Blob([new Uint8Array(o.file.bytes)], { type: o.file.type }), o.file.name);
    body = data;
  } else if (o.form) {
    body = new URLSearchParams(o.form);
  } else if (o.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(o.json);
  }
  const response = await fetch(new URL(path, base), { method, headers, ...(body === undefined ? {} : { body }), redirect: "manual", signal: AbortSignal.timeout(15000) });
  const type = response.headers.get("content-type") ?? "";
  const binary = type.includes("application/zip") || type.startsWith("image/") || type.includes("application/octet-stream");
  if (binary) return { status: response.status, headers: response.headers, body: new Uint8Array(await response.arrayBuffer()), text: "" };
  const text = await response.text();
  const parsed: unknown = text && type.includes("application/json") ? JSON.parse(text) : text || null;
  return { status: response.status, headers: response.headers, body: parsed, text };
}
export async function api(method: string, path: string, o?: ApiOptions): Promise<ApiResponse> {
  targetKind();
  return requestApi(targetUrl(), method, path, o);
}
export async function loginAt(base: string, email: string, password: string = SEED.password): Promise<string> {
  const r = await requestApi(base, "POST", "/auth/login", { form: { username: email, password } });
  if (r.status !== 200 || r.body === null || typeof r.body !== "object" || !("access_token" in r.body) || typeof r.body.access_token !== "string" || !r.body.access_token) throw new Error(`Login failed for ${email}: ${String(r.status)} ${r.text}`);
  return r.body.access_token;
}
export async function login(email: string, password: string = SEED.password): Promise<string> {
  targetKind();
  return loginAt(targetUrl(), email, password);
}
// Signed credentials test authorization independently of login eligibility.
export function signedToken(email: string, role = "moderator"): Promise<string> {
  return new SignJWT({ sub: email, role }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("5m")
    .sign(new TextEncoder().encode("contract-secret-key-that-is-long-enough"));
}
export function contractDbUrl(kind: TargetKind): string {
  const key = kind === "old" ? "CONTRACT_DB_URL_OLD" : "CONTRACT_DB_URL_NEW";
  const raw = process.env[key];
  if (!raw) throw new Error(`${key} is required`);
  const url = new URL(raw);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["127.0.0.1", "localhost"].includes(url.hostname) || url.port !== (kind === "old" ? "5435" : "5436") || url.pathname !== "/macs_test") throw new Error(`${key} must address the isolated localhost:${kind === "old" ? "5435" : "5436"}/macs_test database`);
  return raw;
}
export async function resetTarget(kind: TargetKind): Promise<void> {
  const sql = postgres(contractDbUrl(kind), { max: 1, connect_timeout: 5, onnotice: () => undefined });
  try { await seedDb(sql, await readFile(new URL("./seed.sql", import.meta.url), "utf8")); }
  finally { await sql.end(); }
}
export async function resetState(): Promise<void> { targetUrl(); await resetTarget(targetKind()); }
