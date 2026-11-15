import type { Logger } from "pino";

export type SecurityEventKind = "rate_limit" | "lockout" | "login_ip_limit" | "body_too_large" | "url_too_long" | "handler_timeout";
// Only public route literals are retained; dynamic path values can contain credentials/PII.
const publicSegments = new Set([
  "access", "admin", "api", "auth", "by-slug", "categories", "change-password",
  "download-all", "events", "featured", "geocode", "hard", "health", "leaderboard",
  "login", "me", "members", "projects", "ready", "register", "sponsors", "stats", "upload", "users",
  // App-level documentation and static mounts, outside modules/*/routes.ts.
  "docs", "openapi.json", "uploads", "static",
]);
export function logSecurityEvent(logger: Logger, event: { kind: SecurityEventKind; ip: string; path: string; method?: string | undefined; status?: number | undefined }): void {
  const path = (event.path.split(/[?#]/)[0] ?? "").split("/").map((segment) => segment === "" || publicSegments.has(segment) ? segment : ":redacted").join("/");
  logger.warn({ event: "security", kind: event.kind, ip: event.ip, path,
    ...(event.method === undefined ? {} : { method: event.method }),
    ...(event.status === undefined ? {} : { status: event.status }),
  });
}
