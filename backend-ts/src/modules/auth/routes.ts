import { createRoute } from "@hono/zod-openapi";
import type { Context, Next } from "hono";
import type { AppEnv } from "../../app";
import type { AppRouter, AppDeps } from "../../app";
import { HttpError } from "../../lib/http-error";
import { sendJsonResponse } from "../../lib/public-cache";
import { perMinute, routeRateLimit } from "../../security/rate-limit";
import { limitBodySize, requireJsonBody } from "../../security/request-guards";
import { userResponseSchema } from "../users/schemas";
import { createUser } from "../users/service";
import { adminRegisterSchema, loginSchema, registerSchema, tokenSchema } from "./schemas";
import { login, validAdminSecret } from "./service";

export function registerAuthRoutes(app: AppRouter, deps: AppDeps): void {
  const registration = createRoute({ method: "post", path: "/auth/register", tags: ["authentication"], summary: "Kullanıcı kaydı",
    middleware: [routeRateLimit(deps, perMinute(5)), limitBodySize(deps.security?.maxBodyBytes), requireJsonBody],
    request: { body: { required: true, content: { "application/json": { schema: registerSchema } } } },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: userResponseSchema } } } },
  });
  app.openapi(registration, async c => {
    const result = await createUser(deps.db, deps.env, c.req.valid("json"));
    deps.cache.invalidate("auth");
    return sendJsonResponse(c, JSON.stringify(result));
  });
  const admin = createRoute({ method: "post", path: "/auth/register/admin", tags: ["authentication"], summary: "Admin kaydı",
    middleware: [routeRateLimit(deps, perMinute(3)), limitBodySize(deps.security?.maxBodyBytes), requireJsonBody],
    request: { body: { required: true, content: { "application/json": { schema: adminRegisterSchema } } } },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: userResponseSchema } } } },
  });
  app.openapi(admin, async c => {
    const body = c.req.valid("json");
    if (deps.env.ADMIN_SECRET_KEY === null) throw new HttpError(500, "Admin kaydı devre dışı: ADMIN_SECRET_KEY yapılandırılmamış");
    if (!validAdminSecret(deps.env.ADMIN_SECRET_KEY, body.admin_secret)) throw new HttpError(403, "Admin kaydı için geçerli güvenlik anahtarı gerekli");
    const result = await createUser(deps.db, deps.env, { ...body, role: "admin", status: "approved" });
    deps.cache.invalidate("auth");
    return sendJsonResponse(c, JSON.stringify(result));
  });
  const signin = createRoute({ method: "post", path: "/auth/login", tags: ["authentication"], summary: "Kullanıcı girişi",
    middleware: [routeRateLimit(deps, perMinute(10)), async (c: Context<AppEnv>, next: Next) => {
      if (deps.env.RATELIMIT_ENABLED) deps.loginShield?.check(c.get("clientIp") ?? "unknown");
      await next();
    }, limitBodySize(deps.security?.maxBodyBytes)],
    request: { body: { required: true, content: { "application/x-www-form-urlencoded": { schema: loginSchema } } } },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: tokenSchema } } } },
  });
  app.openapi(signin, async c => {
    const body = c.req.valid("form");
    try {
      const result = await login(deps.db, deps.env, deps.now?.() ?? new Date(), body.username, body.password, () => { deps.cache.invalidate("auth"); });
      deps.cache.invalidate("auth");
      return sendJsonResponse(c, JSON.stringify(result));
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) {
        if (deps.env.RATELIMIT_ENABLED) deps.loginShield?.recordFailure(c.get("clientIp") ?? "unknown");
      }
      throw error;
    }
  });
}
