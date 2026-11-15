// Synthetic routes exercise the same Hono validators and security middleware as production.
import { createRoute, z } from "@hono/zod-openapi";
import type { Context } from "hono";
import type { AppDeps, AppEnv, AppRouter } from "../../src/app";
import type { RouteMeta } from "../../src/lib/route-metadata";
import type { AuthUser } from "../../src/middleware/auth";
import { authenticate, requireRoles } from "../../src/middleware/auth";
import { routeRateLimit } from "../../src/security/rate-limit";
import type { RateLimitSpec } from "../../src/security/rate-limit";
import { limitBodySize } from "../../src/security/request-guards";
import { publicCachedJson, sendJsonResponse } from "../../src/lib/public-cache";
import type { HttpError } from "../../src/lib/http-error";
interface Definition<P, Q, B, R> extends RouteMeta {
  domain: import("../../src/lib/cache").Domain; public?: boolean; bodyKind?: "json" | "form";
  params?: z.ZodType<P>; query?: z.ZodType<Q>; body?: z.ZodType<B>;
  rateLimit?: RateLimitSpec; bodyInvalid?: HttpError;
  handler: (ctx: { params: P; query: Q; body: B; user: AuthUser | null; c: Context<AppEnv> }) => Promise<R | Response>;
}
export function route<P, Q, B, R>(app: AppRouter, deps: AppDeps, def: Definition<P, Q, B, R>): void {
  if (def.auth && typeof deps.loadUser !== "function") throw new Error("Protected routes require loadUser");
  const object = (value: z.ZodType | undefined) => value instanceof z.ZodObject ? value : undefined;
  const config = createRoute({ method: def.method, path: def.path.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, "{$1}"), summary: def.summary, tags: [def.tag],
    middleware: [routeRateLimit(deps, def.rateLimit ?? { limit: 100000, windowMs: 60000, label: "test" }), async (c: Context<AppEnv>, next: () => Promise<void>) => {
      let user: AuthUser | null = null;
      if (def.auth) { user = await authenticate(c.req.raw, deps.env, deps.loadUser, deps.now?.() ?? new Date()); if (def.auth !== "user") requireRoles(user, def.auth); }
      c.set("user", user);
      if (def.params) {
        const parsedParams = def.params.safeParse(c.req.param());
        if (!parsedParams.success) {
          const { toFastApi422, validationError } = await import("../../src/lib/validation");
          throw validationError(toFastApi422(parsedParams.error, "path", c.req.param()));
        }
      }
      if (def.bodyKind === "form" && !(c.req.header("Content-Type") ?? "").startsWith("application/x-www-form-urlencoded")) {
        const { validationError } = await import("../../src/lib/validation");
        throw validationError(Object.keys(object(def.body)?.shape ?? {}).map(field => ({ type: "missing", loc: ["body", field], msg: "Field required", input: null })));
      }
      if (def.bodyInvalid) c.set("bodyInvalid", def.bodyInvalid); await next();
    }, limitBodySize()],
    request: { params: object(def.params), query: object(def.query), ...(def.body ? { body: { required: true, content: { [def.bodyKind === "form" ? "application/x-www-form-urlencoded" : "application/json"]: { schema: def.body } } } } : {}) },
    responses: { [def.status ?? 200]: { description: "Test", ...(def.response ? { content: { "application/json": { schema: def.response } } } : {}) } },
  });
  app.openapi(config, async c => {
    const params = def.params?.parse(c.req.param()) as P;
    const query = def.query?.parse(c.req.query()) as Q;
    let body: unknown = {};
    if (def.body) body = def.body.parse(def.bodyKind === "form" ? await c.req.parseBody() : await c.req.json());
    else if (!["GET", "HEAD"].includes(c.req.method)) { const text = await c.req.text(); if (text) { try { body = JSON.parse(text) as unknown; } catch { const { validationError } = await import("../../src/lib/validation"); throw validationError([{ type: "json_invalid", loc: ["body"], msg: "JSON decode error", input: {} }]); } } }
    const invoke = () => def.handler({ params, query, body: body as B, user: c.get("user"), c });
    if (def.public && (def.status ?? 200) === 200) return publicCachedJson(c, deps, { domain: def.domain, canonicalPath: c.req.path.replace(/\/$/, ""), query: (query ?? {}), load: async () => JSON.stringify(await invoke()) });
    const result = await invoke(); if (result instanceof Response) return result;
    if (!["GET", "HEAD"].includes(c.req.method)) deps.cache.invalidate(def.domain);
    return sendJsonResponse(c, def.status === 204 ? "" : JSON.stringify(result), { status: def.status ?? 200 });
  });
}
