import type { Context } from "hono";
import type { z } from "zod";
import type { AppDeps, AppEnv, AppRouter } from "../app";
import type { AuthUser } from "../middleware/auth";
import { authenticate, requireRoles } from "../middleware/auth";
import { HttpError } from "./http-error";
import type { Domain } from "./cache";
import type { UploadedFile } from "./storage";
import { toFastApi422, validationError } from "./validation";
import { publicCachedJson, sendJsonResponse } from "./public-cache";
import { routeRateLimit } from "../security/rate-limit";
import { limitBodySize } from "../security/request-guards";
import { buildOpenApiDocument, toOpenApiPath } from "./openapi";

export type { Domain } from "./cache";
export type { UploadedFile } from "./storage";

export type { Role } from "../middleware/auth";
import type { Role } from "../middleware/auth";
export interface RateLimitSpec { limit: number; windowMs: number; label: string }

export interface RouteCtx<P, Q, B> {
  params: P;
  query: Q;
  body: B;
  user: AuthUser | null;
  file: UploadedFile | null;
  c: Context<AppEnv>;
}
export interface RouteMeta {
  method: "get" | "post" | "put" | "patch" | "delete";
  path: string;
  domain: Domain;
  tag: string;
  summary: string;
  auth?: "user" | readonly Role[];
  public?: boolean;
  params?: z.ZodType;
  query?: z.ZodType;
  body?: z.ZodType;
  bodyKind?: "json" | "form";
  upload?: { field: string; maxBytes: number };
  status?: number;
  response?: z.ZodType;
  responseMediaType?: string;
}
export interface RouteDef<P, Q, B, R> extends RouteMeta {
  params?: z.ZodType<P>;
  query?: z.ZodType<Q>;
  body?: z.ZodType<B>;
  rateLimit?: RateLimitSpec;
  bodyInvalid?: HttpError;
  handler: (ctx: RouteCtx<P, Q, B>) => Promise<R | Response>;
}

function parse<T>(schema: z.ZodType<T> | undefined, source: "body" | "query" | "path", raw: unknown, override?: HttpError, form = false): T {
  if (!schema) return raw as T;
  const result = schema.safeParse(raw);
  if (!result.success) {
    const items = toFastApi422(result.error, source, raw);
    if (form) for (const item of items) if (item.type === "missing") item.input = null;
    throw override ?? validationError(items);
  }
  return result.data;
}


export function registerRouteMetadata(router: AppRouter, deps: AppDeps, meta: RouteMeta): void {
  deps.routeRegistry.push(meta);
  // Use the same schema conversion for both registries during the migration.
  const document = buildOpenApiDocument([meta]);
  const operation = document.paths?.[toOpenApiPath(meta.path)]?.[meta.method];
  if (!operation) throw new Error("Missing OpenAPI operation");
  router.openAPIRegistry.registerPath({ ...operation, method: meta.method, path: toOpenApiPath(meta.path), responses: operation.responses ?? {} });
}
export function legacyRoute<P, Q, B, R>(router: AppRouter, deps: AppDeps, def: RouteDef<P, Q, B, R>): void {
  if (def.auth !== undefined && (deps as Partial<AppDeps>).loadUser === undefined) throw new Error("Protected routes require loadUser");
  const { handler, rateLimit, bodyInvalid, ...metadata } = def;
  registerRouteMetadata(router, deps, metadata);
  const path = def.path.replace(/\/$/, "") || "/";
  if (rateLimit) router.on(def.method.toUpperCase(), path, routeRateLimit(deps, rateLimit));
  router.on(def.method.toUpperCase(), path, async (c, next) => {
    let user: AuthUser | null = null;
    if (def.auth !== undefined) {
      user = await authenticate(c.req.raw, deps.env, deps.loadUser, deps.now?.() ?? new Date());
      if (def.auth !== "user") requireRoles(user, def.auth);
    }
    c.set("user", user);
    await next();
  });
  if (def.method !== "get") router.on(def.method.toUpperCase(), path, limitBodySize(deps.security?.maxBodyBytes));
  router.on(def.method.toUpperCase(), path, async c => {
    const user = c.get("user");
    const params = parse(def.params, "path", c.req.param());
    const rawQuery = Object.fromEntries(Object.entries(c.req.queries()).map(([key, values]) => [key, values.length === 1 ? values[0] : values]));
    const query = parse(def.query, "query", rawQuery);
    let raw: unknown = {};
    if (!["GET", "HEAD"].includes(c.req.method)) {
      const text = await c.req.raw.text();
      const type = c.req.header("Content-Type") ?? "";
      if (def.bodyKind === "form") {
        if (type.startsWith("application/x-www-form-urlencoded")) raw = Object.fromEntries(new URLSearchParams(text));
      } else if (type.startsWith("application/json") && text) {
        try { raw = JSON.parse(text) as unknown; }
        catch { throw bodyInvalid ?? validationError([{ type: "json_invalid", loc: ["body"], msg: "JSON decode error", input: {} }]); }
      } else if (text) raw = text;
    }
    const body = parse(def.body, "body", raw, bodyInvalid, def.bodyKind === "form");
    const invoke = () => handler({ params, query, body, user, file: null, c });
    const status = def.status ?? 200;
    if (def.public && !def.auth && status === 200 && def.domain !== "users" && def.domain !== "auth" && !/\/admin(?:\/|$)/.test(c.req.path)) {
      return publicCachedJson(c, deps, { domain: def.domain, canonicalPath: c.req.path.replace(/\/$/, ""), query: (query ?? {}), load: async () => JSON.stringify(await invoke()) });
    }
    const result = await invoke();
    if (result instanceof Response) return result;
    if (!["GET", "HEAD"].includes(c.req.method)) deps.cache.invalidate(def.domain);
    return sendJsonResponse(c, status === 204 ? "" : JSON.stringify(result), { status });
  });
}
export const route = legacyRoute;
