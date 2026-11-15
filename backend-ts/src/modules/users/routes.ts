import type { AppRouter as Router } from "../../app";
import { z } from "zod";
import type { AppDeps } from "../../app";
import { HttpError } from "../../lib/http-error";
import { route } from "../../lib/route";
import type { AuthUser } from "../../middleware/auth";
import { perMinute } from "../../middleware/rate-limit";
import { accessSchema, listQuerySchema, passwordChangeSchema, profileQuerySchema, userParamsSchema, userResponseSchema } from "./schemas";
import * as service from "./service";

function current(user: AuthUser | null): AuthUser {
  if (!user) throw new Error("Protected handler requires authenticated user");
  return user;
}
export function registerUserRoutes(router: Router, deps: AppDeps): void {
  const base = { domain: "users", tag: "users", response: userResponseSchema } as const;
  const me = { ...base, auth: "user" } as const;
  const admin = { ...base, auth: ["admin"] } as const;
  const message = z.object({ message: z.string() });
  route(router, deps, { ...me, method: "get", path: "/users/me", summary: "Profil", rateLimit: perMinute(10), handler: ({ user }) => Promise.resolve(current(user)) });
  route(router, deps, { ...me, method: "put", path: "/users/me", summary: "Profil güncelle", query: profileQuerySchema, rateLimit: perMinute(5),
    handler: ({ user, query }) => service.updateProfile(deps.db, current(user).id, query.full_name) });
  route(router, deps, { ...me, method: "post", path: "/users/me/change-password", summary: "Şifre değiştir", body: passwordChangeSchema, rateLimit: perMinute(3),
    handler: ({ user, body }) => service.changePassword(deps.db, deps.env, current(user).email, body.current_password, body.new_password) });
  route(router, deps, { ...me, method: "delete", path: "/users/me", summary: "Hesabımı sil", response: message, rateLimit: perMinute(3),
    handler: async ({ user }) => { await service.removeUser(deps.db, current(user).id); return { message: "Hesabınız başarıyla silindi" }; } });
  route(router, deps, { ...admin, method: "get", path: "/users", summary: "Kullanıcı listesi", query: listQuerySchema,
    response: z.object({ users: z.array(userResponseSchema), total: z.number().int() }), rateLimit: perMinute(30),
    handler: ({ query }) => service.listUsers(deps.db, query.skip ?? 0, query.limit ?? 10) });
  route(router, deps, { ...admin, method: "get", path: "/users/:user_id", summary: "Kullanıcı detayı", params: userParamsSchema, rateLimit: perMinute(30),
    handler: ({ params }) => service.getUser(deps.db, params.user_id) });
  route(router, deps, { ...admin, method: "patch", path: "/users/:user_id/access", summary: "Erişim ayarları", params: userParamsSchema, body: accessSchema, rateLimit: perMinute(20),
    handler: ({ user, params, body }) => {
      if (params.user_id === current(user).id) throw new HttpError(400, "Admin kendi erişim ayarlarını değiştiremez");
      return service.setAccess(deps.db, params.user_id, body);
    } });
  route(router, deps, { ...admin, method: "delete", path: "/users/:user_id", summary: "Kullanıcı sil", params: userParamsSchema, response: message, rateLimit: perMinute(10),
    handler: async ({ user, params }) => {
      if (params.user_id === current(user).id) throw new HttpError(400, "Admin kendi hesabını bu endpoint üzerinden silemez");
      const removed = await service.removeUser(deps.db, params.user_id);
      return { message: `${removed.email} kullanıcısı başarıyla silindi` };
    } });
}
