import { classifyLogPath } from "./security/security-log";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { Hook } from "@hono/zod-openapi";
import type { Logger } from "pino";
import type { Db, Sql, QueryCounter } from "./db/client";
import type { Env } from "./config/env";
import type { ResponseCache } from "./lib/cache";
import type { Storage } from "./lib/storage";
import type { AuthUser, LoadUserByEmail } from "./middleware/auth";
import { errorHandler } from "./middleware/error-handler";
import { DEFAULT_SECURITY_CONFIG } from "./security/config";
import type { SecurityConfig } from "./security/config";
import type { LoginShield } from "./security/login-shield";
import { createLoginShield } from "./security/login-shield";
import { resolveClientIp } from "./security/ip";
import { applySecurityHeaders } from "./security/headers";
import { validateRequestHead, withHandlerTimeout } from "./security/request-guards";
import { createTokenBucketLimiter } from "./security/rate-limit";
import { HttpError } from "./lib/http-error";
import { toFastApi422, validationError } from "./lib/validation";
import { registerDocs } from "./security/docs";
import { createCors } from "./middleware/cors";
import { notFound } from "./middleware/not-found";
import { readFile, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { registerAuthRoutes } from "./modules/auth/routes";
import type { FetchImpl } from "./modules/sponsors/service";
import { registerProjectRoutes } from "./modules/projects/routes";
import { registerMemberRoutes } from "./modules/members/routes";
import { registerSponsorRoutes } from "./modules/sponsors/routes";
import { registerEventRoutes } from "./modules/events/routes";
import { registerUserRoutes } from "./modules/users/routes";
import { registerSystemRoutes } from "./modules/system/routes";
import { registerUploadRoutes } from "./modules/uploads/routes";

export interface AppDeps {
  security?: Partial<SecurityConfig>;
  getClientIp?: (req: Request) => string | undefined;
  loginShield?: LoginShield;
  cache: ResponseCache;
  storage: Storage;
  env: Env;
  db: Db;
  sql: Sql;
  counter: QueryCounter;
  logger: Logger;
  loadUser: LoadUserByEmail;
  now?: () => Date;
  fetchImpl?: FetchImpl;
}


export type AppEnv = { Bindings: { socketIp?: string | undefined }; Variables: { clientIp?: string; requestId: string; bodyInvalid?: HttpError; user: AuthUser | null } };
export type AppRouter = OpenAPIHono<AppEnv>;
export const fastApiDefaultHook: Hook<unknown, AppEnv, string, Promise<Response | undefined>> = async (result, c) => {
  if (result.success) return;
  const source = result.target === "param" ? "path" : result.target === "query" ? "query" : "body";
  const raw: unknown = result.target === "param" ? c.req.param()
    : result.target === "query" ? Object.fromEntries(Object.entries(c.req.queries()).map(([key, values]) => [key, values.length === 1 ? values[0] : values]))
    : result.target === "json" ? c.req.header("Content-Type")?.toLowerCase().includes("json") ? await c.req.json() as unknown : {} : await c.req.parseBody({ all: true });
  const items = toFastApi422(result.error, source, raw);
  if (result.target === "form") for (const item of items) if (item.type === "missing") item.input = null;
  throw c.get("bodyInvalid") ?? validationError(items);
};
export function isGlobalRateLimitExempt(path: string): boolean {
  return path === "/uploads" || path.startsWith("/uploads/")
    || path === "/static" || path.startsWith("/static/")
    || path === "/health" || path === "/health/ready";
}
export function canonicalizeApiPath(req: Request): string {
  const path = new URL(req.url).pathname;
  if (path === "/docs" || path.startsWith("/docs/") || path === "/") return path;
  const normalized = path.replace(/\/+$/, "");
  return normalized === "/sponsors" ? "/sponsors/" : normalized;
}
export function createApp(deps: AppDeps, registerRoutes?: (router: AppRouter, deps: AppDeps) => void): AppRouter {
  const security = { ...DEFAULT_SECURITY_CONFIG, ...deps.security };
  const app = new OpenAPIHono<AppEnv>({ defaultHook: fastApiDefaultHook, getPath: canonicalizeApiPath });
  const now = () => deps.now?.().getTime() ?? Date.now();
  const global = createTokenBucketLimiter({ ...security.globalRateLimit, maxIps: security.maxTrackedIps, now, label: `${String(security.globalRateLimit.ratePerMin)} per 1 minute` });
  const writes = createTokenBucketLimiter({ ...security.writeRateLimit, maxIps: security.maxTrackedIps, now, label: `${String(security.writeRateLimit.ratePerMin)} per 1 minute` });
  deps = { ...deps, loginShield: deps.loginShield ?? createLoginShield({ ...security.loginIpLimit, maxIps: security.maxTrackedIps, now }) };
  app.onError(errorHandler(deps.logger));
  app.use("*", async (c, next) => {
    const id = c.req.header("X-Request-ID");
    c.set("requestId", id && /^[A-Za-z0-9_.-]{1,64}$/.test(id) ? id : crypto.randomUUID());
    c.header("X-Request-ID", c.get("requestId"));
    const start = performance.now();
    await next();
    deps.logger.info({ reqId: c.get("requestId"), method: c.req.method, path: classifyLogPath(c.req.path), status: c.res.status, ms: performance.now() - start }, "Request completed");
  });
  app.use("*", async (c, next) => {
    await next();
    applySecurityHeaders(c.res.headers, { forwardedProto: c.req.header("X-Forwarded-Proto"), isDocs: c.req.path === "/docs" || c.req.path.startsWith("/docs/") });
  });
  app.use("*", createCors(deps.env, c => {
    const ip = resolveClientIp(c.req.raw.headers, deps.getClientIp?.(c.req.raw) ?? (c.env as AppEnv["Bindings"] | undefined)?.socketIp);
    c.set("clientIp", ip);
    if (deps.env.RATELIMIT_ENABLED && !isGlobalRateLimitExempt(c.req.path)) global.consume(ip);
    // Fetch parsers compare media types case sensitively; preserve boundary parameters.
    const contentType = c.req.header("Content-Type");
    if (contentType) {
      const separator = contentType.indexOf(";");
      const mediaType = separator < 0 ? contentType : contentType.slice(0, separator);
      const lower = mediaType.toLowerCase();
      if (lower !== mediaType) {
        const headers = new Headers(c.req.raw.headers);
        headers.set("Content-Type", lower + (separator < 0 ? "" : contentType.slice(separator)));
        const hasBody = c.req.raw.method !== "GET" && c.req.raw.method !== "HEAD" && c.req.raw.body !== null;
        c.req.raw = new Request(c.req.raw.url, {
          method: c.req.raw.method,
          headers,
          ...(hasBody ? { body: c.req.raw.body, duplex: "half" } : {}),
        });
      }
    }
    validateRequestHead(c.req.raw, c.req.raw.url.replace(/^[^:]+:\/\/[^/]+/, ""), security);
  }));
  app.use("*", async (c, next) => {
    if (deps.env.RATELIMIT_ENABLED && !["GET", "HEAD", "OPTIONS"].includes(c.req.method)) writes.consume(c.get("clientIp") ?? "unknown");
    // next() resolves when the response is ready; ZIP streaming itself is unbounded.
    const timeoutMs = c.req.method === "POST" && c.req.path === "/api/upload" ? security.uploadHandlerTimeoutMs : security.handlerTimeoutMs;
    try { await withHandlerTimeout(timeoutMs, next); }
    catch (error) { throw error instanceof Error ? error : new Error("Non-error request failure", { cause: error }); }
  });
  for (const [prefix, root] of [["/uploads", deps.env.UPLOAD_DIR], ["/static", deps.env.STATIC_DIR]] as const) {
    app.on(["GET", "HEAD"], `${prefix}/*`, async c => {
      const relative = decodeURIComponent(c.req.path.slice(prefix.length));
      if (relative === "" || relative === "/") throw new HttpError(404, "Not Found");
      if (relative.split("/").some(part => part.startsWith("."))) throw new HttpError(404, "Not Found");
      const resolvedRoot = resolve(root);
      const path = resolve(resolvedRoot, `.${relative}`);
      if (!path.startsWith(resolvedRoot + sep)) throw new HttpError(400, "Bad Request");
      const info = await stat(path).catch(() => null);
      if (!info?.isFile()) throw new HttpError(404, "Not Found");
      c.header("Cache-Control", "public, max-age=0");
      c.header("Content-Length", String(info.size));
      const extension = path.split(".").pop()?.toLowerCase();
      const types: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", css: "text/css", js: "application/javascript" };
      c.header("Content-Type", types[extension ?? ""] ?? "application/octet-stream");
      if (c.req.method === "HEAD") return c.body(null, 200);
      return c.body(await readFile(path));
    });
  }
  registerSystemRoutes(app, deps);
  registerAuthRoutes(app, deps);
  registerUserRoutes(app, deps);
  registerEventRoutes(app, deps);
  registerMemberRoutes(app, deps);
  registerSponsorRoutes(app, deps);
  registerProjectRoutes(app, deps);
  registerUploadRoutes(app, deps);
  registerRoutes?.(app, deps);
  registerDocs(app, deps);
  app.notFound(notFound(app));
  return app;
}
