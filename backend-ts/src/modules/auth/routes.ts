import type { Router } from "express";
import type { AppDeps } from "../../app";
import { HttpError } from "../../lib/http-error";
import { route } from "../../lib/route";
import { perMinute } from "../../middleware/rate-limit";
import { userResponseSchema } from "../users/schemas";
import { createUser } from "../users/service";
import { adminRegisterSchema, loginSchema, registerSchema, tokenSchema } from "./schemas";
import { login, validAdminSecret } from "./service";

export function registerAuthRoutes(router: Router, deps: AppDeps): void {
  const base = { method: "post", domain: "auth", tag: "authentication" } as const;
  route(router, deps, { ...base, path: "/auth/register", summary: "Kullanıcı kaydı", body: registerSchema,
    response: userResponseSchema, rateLimit: perMinute(5), handler: ({ body }) => createUser(deps.db, deps.env, body) });
  route(router, deps, { ...base, path: "/auth/register/admin", summary: "Admin kaydı", body: adminRegisterSchema,
    response: userResponseSchema, rateLimit: perMinute(3), handler: ({ body }) => {
      if (!validAdminSecret(deps.env.ADMIN_SECRET_KEY, body.admin_secret)) throw new HttpError(403, "Admin kaydı için geçerli güvenlik anahtarı gerekli");
      return createUser(deps.db, deps.env, { ...body, role: "admin", status: "approved" });
    } });
  route(router, deps, { ...base, path: "/auth/login", summary: "Kullanıcı girişi", bodyKind: "form", body: loginSchema,
    response: tokenSchema, rateLimit: perMinute(10), handler: ({ body }) => login(deps.db, deps.env, deps.now?.() ?? new Date(), body.username, body.password) });
}
