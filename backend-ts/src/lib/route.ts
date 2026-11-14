import multer from "multer";
import type { Request, Response, Router } from "express";
import type { z } from "zod";
import type { AppDeps } from "../app";
import { authenticate, requireRoles } from "../middleware/auth";
import type { AuthUser } from "../middleware/auth";
import { sendJson } from "../middleware/cache-headers";
import { createLimiter } from "../middleware/rate-limit";
import { HttpError } from "./http-error";
import { cacheKey, weakEtag } from "./cache";
import type { UploadedFile } from "./storage";
import { toFastApi422, validationError } from "./validation";

export type { UploadedFile } from "./storage";

export type Role = "admin" | "moderator";
export type Domain = "auth" | "users" | "events" | "projects" | "members" | "sponsors" | "uploads" | "system";
export interface RateLimitSpec { limit: number; windowMs: number; label: string }
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
  if (def.auth !== undefined && (deps as Partial<AppDeps>).loadUser === undefined) throw new Error("Protected routes require loadUser");
  const { handler, rateLimit, bodyInvalid, ...metadata } = def;
  deps.routeRegistry.push(metadata);
  const handlers = rateLimit ? [createLimiter(rateLimit, deps.env.RATELIMIT_ENABLED)] : [];
  router[def.method](def.path, ...handlers, async (req, res, next) => {
    try {
      let user: AuthUser | null = null;
      if (def.auth !== undefined) {
        user = await authenticate(req, deps.env, deps.loadUser, deps.now?.() ?? new Date());
        if (def.auth !== "user") requireRoles(user, def.auth);
      }
      if (def.upload) {
        const { field, maxBytes } = def.upload;
        const missingFile = () => validationError([{ type: "missing", loc: ["body", field], msg: "Field required", input: null }]);
        await new Promise<void>((resolve, reject) => {
          multer({ storage: multer.memoryStorage(), limits: { fileSize: maxBytes, files: 1 } }).single(field)(req, res, (error: unknown) => {
            if (error instanceof multer.MulterError) {
              if (error.code === "LIMIT_FILE_SIZE") reject(new HttpError(413, `Dosya çok büyük. Sınır: ${String(Math.floor(maxBytes / 1048576))} MB`));
              else if (error.code === "LIMIT_UNEXPECTED_FILE" && !req.file) reject(missingFile());
              else reject(new HttpError(400, error.message));
            } else if (error) reject(new HttpError(400, "There was an error parsing the body"));
            else resolve();
          });
        });
        if (!req.file) throw missingFile();
      }
      if (req.bodyParseError !== undefined) throw bodyInvalid ?? validationError([
        { type: "json_invalid", loc: ["body"], msg: "JSON decode error", input: {} },
      ]);
      const params = parse(def.params, "path", req.params);
      const query = parse(def.query, "query", req.query);
      const body = parse(def.body, "body", def.bodyKind === "form" && !req.is("application/x-www-form-urlencoded") ? {} : req.body ?? {}, bodyInvalid, def.bodyKind === "form");
      const status = def.status ?? 200;
      const eligible = def.public === true && req.method === "GET" && def.auth === undefined && req.headers.authorization === undefined && status === 200
        && def.domain !== "users" && def.domain !== "auth" && !/\/admin(?:\/|$)/.test(req.path);
      const key = eligible ? cacheKey(req.path, req.query) : undefined;
      if (key !== undefined) {
        const cached = deps.cache.get(key);
        if (cached) {
          res.set("X-Cache", "HIT");
          sendJson(req, res, cached.status, cached.body, { public: true, etag: cached.etag }); return;
        }
      }
      const generation = deps.cache.generation(def.domain);
      res.set("Cache-Control", "no-store");
      const result = await handler({ params, query, body, user, file: req.file ?? null, req, res });
      if (result === STREAMED) return;
      if (req.method !== "GET" && req.method !== "HEAD" && status >= 200 && status < 300) deps.cache.invalidate(def.domain);
      if (status === 204) { sendJson(req, res, status, "", { public: false }); return; }
      const serialized = JSON.stringify(result);
      if (key !== undefined) {
        const etag = weakEtag(serialized);
        if (generation === deps.cache.generation(def.domain)) deps.cache.set(key, def.domain, { status, body: serialized, etag });
        res.set("X-Cache", "MISS");
        sendJson(req, res, status, serialized, { public: true, etag });
      } else sendJson(req, res, status, serialized, { public: false });
    } catch (error: unknown) { next(error); }
  });
}
