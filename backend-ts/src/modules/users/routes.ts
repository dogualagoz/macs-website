import { createRoute, z } from "@hono/zod-openapi";
import type { MiddlewareHandler } from "hono";
import type { AppRouter, AppDeps, AppEnv } from "../../app";
import { HttpError } from "../../lib/http-error";
import { sendJsonResponse } from "../../lib/public-cache";
import { authenticate, requireRoles } from "../../middleware/auth";
import type { AuthUser } from "../../middleware/auth";
import { perMinute, routeRateLimit } from "../../security/rate-limit";
import { limitBodySize, requireJsonBody } from "../../security/request-guards";
import { accessSchema, listQuerySchema, passwordChangeSchema, profileQuerySchema, userParamsSchema, userResponseSchema } from "./schemas";
import { getUserJson, listUsersJson } from "./queries";
import * as service from "./service";

function current(user: AuthUser | null): AuthUser {
  if (!user) throw new Error("Protected handler requires authenticated user");
  return user;
}
export function registerUserRoutes(app: AppRouter, deps: AppDeps): void {
  const auth = (admin: boolean): MiddlewareHandler<AppEnv> => async (c, next) => {
    const user = await authenticate(c.req.raw, deps.env, deps.loadUser, deps.now?.() ?? new Date());
    if (admin) requireRoles(user, ["admin"]);
    c.set("user", user);
    await next();
  };
  const message = z.object({ message: z.string() });
  const profile = createRoute({ method: "get", path: "/users/me", tags: ["users"], summary: "Profil",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [routeRateLimit(deps, perMinute(10)), auth(false)],
    request: {},
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: userResponseSchema } } } },
  });
  app.openapi(profile, c => {
    return sendJsonResponse(c, JSON.stringify(current(c.get("user"))));
  });
  deps.routeRegistry.push({ method: "get", path: "/users/me", domain: "users", tag: "users", summary: "Profil", auth: "user", response: userResponseSchema });
  const updateProfile = createRoute({ method: "put", path: "/users/me", tags: ["users"], summary: "Profil güncelle",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [routeRateLimit(deps, perMinute(5)), auth(false), limitBodySize(deps.security?.maxBodyBytes)],
    request: { query: profileQuerySchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: userResponseSchema } } } },
  });
  app.openapi(updateProfile, async c => {
    const result = await service.updateProfile(deps.db, current(c.get("user")).id, c.req.valid("query").full_name);
    deps.cache.invalidate("users");
    return sendJsonResponse(c, JSON.stringify(result));
  });
  deps.routeRegistry.push({ method: "put", path: "/users/me", domain: "users", tag: "users", summary: "Profil güncelle", auth: "user", response: userResponseSchema, query: profileQuerySchema });
  const changePassword = createRoute({ method: "post", path: "/users/me/change-password", tags: ["users"], summary: "Şifre değiştir",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [routeRateLimit(deps, perMinute(3)), auth(false), limitBodySize(deps.security?.maxBodyBytes), requireJsonBody],
    request: { body: { required: true, content: { "application/json": { schema: passwordChangeSchema } } } },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: userResponseSchema } } } },
  });
  app.openapi(changePassword, async c => {
    const body = c.req.valid("json");
    const result = await service.changePassword(deps.db, deps.env, current(c.get("user")).email, body.current_password, body.new_password);
    deps.cache.invalidate("users");
    return sendJsonResponse(c, JSON.stringify(result));
  });
  deps.routeRegistry.push({ method: "post", path: "/users/me/change-password", domain: "users", tag: "users", summary: "Şifre değiştir", auth: "user", response: userResponseSchema, body: passwordChangeSchema });
  const deleteProfile = createRoute({ method: "delete", path: "/users/me", tags: ["users"], summary: "Hesabımı sil",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [routeRateLimit(deps, perMinute(3)), auth(false), limitBodySize(deps.security?.maxBodyBytes)],
    request: {},
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: message } } } },
  });
  app.openapi(deleteProfile, async c => {
    await service.removeUser(deps.db, current(c.get("user")).id);
    const result = { message: "Hesabınız başarıyla silindi" };
    deps.cache.invalidate("users");
    return sendJsonResponse(c, JSON.stringify(result));
  });
  deps.routeRegistry.push({ method: "delete", path: "/users/me", domain: "users", tag: "users", summary: "Hesabımı sil", auth: "user", response: message });
  const list = createRoute({ method: "get", path: "/users", tags: ["users"], summary: "Kullanıcı listesi",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [routeRateLimit(deps, perMinute(30)), auth(true)],
    request: { query: listQuerySchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: z.object({ users: z.array(userResponseSchema), total: z.number().int() }) } } } },
  });
  app.openapi(list, async c => {
    const query = c.req.valid("query");
    return sendJsonResponse(c, await listUsersJson(deps.db, query.skip ?? 0, query.limit ?? 10), { status: 200, isPublic: false });
  });
  deps.routeRegistry.push({ method: "get", path: "/users", domain: "users", tag: "users", summary: "Kullanıcı listesi", auth: ["admin"], response: z.object({ users: z.array(userResponseSchema), total: z.number().int() }), query: listQuerySchema });
  const detail = createRoute({ method: "get", path: "/users/{user_id}", tags: ["users"], summary: "Kullanıcı detayı",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [routeRateLimit(deps, perMinute(30)), auth(true)],
    request: { params: userParamsSchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: userResponseSchema } } } },
  });
  app.openapi(detail, async c => {
    const json = await getUserJson(deps.db, c.req.valid("param").user_id);
    if (json === null) throw new HttpError(404, "Kullanıcı bulunamadı");
    return sendJsonResponse(c, json, { status: 200, isPublic: false });
  });
  deps.routeRegistry.push({ method: "get", path: "/users/:user_id", domain: "users", tag: "users", summary: "Kullanıcı detayı", auth: ["admin"], response: userResponseSchema, params: userParamsSchema });
  const setAccess = createRoute({ method: "patch", path: "/users/{user_id}/access", tags: ["users"], summary: "Erişim ayarları",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [routeRateLimit(deps, perMinute(20)), auth(true), limitBodySize(deps.security?.maxBodyBytes), requireJsonBody],
    request: { params: userParamsSchema, body: { required: true, content: { "application/json": { schema: accessSchema } } } },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: userResponseSchema } } } },
  });
  app.openapi(setAccess, async c => {
    const id = c.req.valid("param").user_id;
    if (id === current(c.get("user")).id) throw new HttpError(400, "Admin kendi erişim ayarlarını değiştiremez");
    const result = await service.setAccess(deps.db, id, c.req.valid("json"));
    deps.cache.invalidate("users");
    return sendJsonResponse(c, JSON.stringify(result));
  });
  deps.routeRegistry.push({ method: "patch", path: "/users/:user_id/access", domain: "users", tag: "users", summary: "Erişim ayarları", auth: ["admin"], response: userResponseSchema, params: userParamsSchema, body: accessSchema });
  const remove = createRoute({ method: "delete", path: "/users/{user_id}", tags: ["users"], summary: "Kullanıcı sil",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [routeRateLimit(deps, perMinute(10)), auth(true), limitBodySize(deps.security?.maxBodyBytes)],
    request: { params: userParamsSchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: message } } } },
  });
  app.openapi(remove, async c => {
    const id = c.req.valid("param").user_id;
    if (id === current(c.get("user")).id) throw new HttpError(400, "Admin kendi hesabını bu endpoint üzerinden silemez");
    const removed = await service.removeUser(deps.db, id);
    const result = { message: `${removed.email} kullanıcısı başarıyla silindi` };
    deps.cache.invalidate("users");
    return sendJsonResponse(c, JSON.stringify(result));
  });
  deps.routeRegistry.push({ method: "delete", path: "/users/:user_id", domain: "users", tag: "users", summary: "Kullanıcı sil", auth: ["admin"], response: message, params: userParamsSchema });
}
