import type { Request, Response, Router } from "express";
import type { z } from "zod";
import type { AppDeps } from "../app";
import { authenticate, requireRoles } from "../middleware/auth";
import type { AuthUser } from "../middleware/auth";
import { sendJson } from "../middleware/cache-headers";
import { createLimiter } from "../middleware/rate-limit";
import type { HttpError } from "./http-error";
import { toFastApi422, validationError } from "./validation";

export type Role = "admin" | "moderator";
export type Domain = "auth" | "users" | "events" | "projects" | "members" | "sponsors" | "uploads" | "system";
export interface RateLimitSpec { limit: number; windowMs: number; label: string }
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
export const STREAMED: unique symbol = Symbol("STREAMED");

export interface RouteCtx<P, Q, B> {
  params: P;
  query: Q;
  body: B;
  user: AuthUser | null;
  file: UploadedFile | null;
  req: Request;
  res: Response;
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
}
export interface RouteDef<P, Q, B, R> extends RouteMeta {
  params?: z.ZodType<P>;
  query?: z.ZodType<Q>;
  body?: z.ZodType<B>;
  rateLimit?: RateLimitSpec;
  bodyInvalid?: HttpError;
  handler: (ctx: RouteCtx<P, Q, B>) => Promise<R | typeof STREAMED>;
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

export function route<P, Q, B, R>(router: Router, deps: AppDeps, def: RouteDef<P, Q, B, R>): void {
  if (def.auth !== undefined && deps.loadUser === undefined) throw new Error("Protected routes require loadUser");
  const { handler, rateLimit, bodyInvalid, ...metadata } = def;
  deps.routeRegistry.push(metadata);
  const handlers = rateLimit ? [createLimiter(rateLimit, deps.env.RATELIMIT_ENABLED)] : [];
  router[def.method](def.path, ...handlers, async (req, res, next) => {
    try {
      let user: AuthUser | null = null;
      if (def.auth !== undefined) {
        if (!deps.loadUser) throw new Error("Protected routes require loadUser");
        user = await authenticate(req, deps.env, deps.loadUser, deps.now?.() ?? new Date());
        if (def.auth !== "user") requireRoles(user, def.auth);
      }
      if (req.bodyParseError !== undefined) throw bodyInvalid ?? validationError([
        { type: "json_invalid", loc: ["body"], msg: "JSON decode error", input: {} },
      ]);
      const params = parse(def.params, "path", req.params);
      const query = parse(def.query, "query", req.query);
      const body = parse(def.body, "body", def.bodyKind === "form" && !req.is("application/x-www-form-urlencoded") ? {} : req.body ?? {}, bodyInvalid, def.bodyKind === "form");
      const result = await handler({ params, query, body, user, file: (req as Request & { file?: UploadedFile }).file ?? null, req, res });
      if (result === STREAMED) return;
      const status = def.status ?? 200;
      const eligible = def.public === true && req.method === "GET" && def.auth === undefined && !req.get("Authorization") && status >= 200 && status < 300;
      if (status === 204) { sendJson(req, res, status, "", { public: false }); return; }
      sendJson(req, res, status, JSON.stringify(result), { public: eligible });
    } catch (error: unknown) { next(error); }
  });
}
