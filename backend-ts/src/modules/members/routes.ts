import { createRoute, z } from "@hono/zod-openapi";
import type { MiddlewareHandler } from "hono";
import type { AppRouter, AppDeps, AppEnv } from "../../app";
import { publicCachedJson, sendJsonResponse } from "../../lib/public-cache";
import { authenticate, requireRoles } from "../../middleware/auth";
import { limitBodySize } from "../../security/request-guards";
import * as schema from "./schemas";
import * as queries from "./queries";

export function registerMemberRoutes(app: AppRouter, deps: AppDeps): void {
  const staff: MiddlewareHandler<AppEnv> = async (c, next) => {
    const user = await authenticate(c.req.raw, deps.env, deps.loadUser, deps.now?.() ?? new Date());
    requireRoles(user, ["admin", "moderator"]);
    c.set("user", user);
    await next();
  };
  const list = createRoute({ method: "get", path: "/members", tags: ["members"], summary: "Üye listesi",
    request: { query: schema.memberQuerySchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: z.array(schema.memberResponseSchema) } } } },
  });
  app.openapi(list, async c => {
    const query = c.req.valid("query");
    return publicCachedJson(c, deps, { domain: "members", canonicalPath: "/members", query, load: () => queries.listMembersJson(deps.db, query) });
  });
  deps.routeRegistry.push({ method: "get", path: "/members", domain: "members", tag: "members", summary: "Üye listesi", public: true, response: z.array(schema.memberResponseSchema), query: schema.memberQuerySchema });
  const leaderboard = createRoute({ method: "get", path: "/members/leaderboard", tags: ["members"], summary: "Üye sıralaması",
    request: { query: schema.leaderboardQuerySchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: z.array(schema.memberWithStatsSchema) } } } },
  });
  app.openapi(leaderboard, async c => {
    const query = c.req.valid("query");
    return publicCachedJson(c, deps, { domain: "members", canonicalPath: "/members/leaderboard", query, load: () => queries.listLeaderboardJson(deps.db, query.limit ?? 10) });
  });
  deps.routeRegistry.push({ method: "get", path: "/members/leaderboard", domain: "members", tag: "members", summary: "Üye sıralaması", public: true, response: z.array(schema.memberWithStatsSchema), query: schema.leaderboardQuerySchema });
  const detail = createRoute({ method: "get", path: "/members/{member_id}", tags: ["members"], summary: "Üye detayı",
    request: { params: schema.memberParamsSchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: schema.memberResponseSchema } } } },
  });
  app.openapi(detail, async c => {
    const id = c.req.valid("param").member_id;
    return publicCachedJson(c, deps, { domain: "members", canonicalPath: `/members/${String(id)}`, query: {}, load: async () => queries.requiredMemberJson(await queries.getMemberJson(deps.db, id)) });
  });
  deps.routeRegistry.push({ method: "get", path: "/members/:member_id", domain: "members", tag: "members", summary: "Üye detayı", public: true, response: schema.memberResponseSchema, params: schema.memberParamsSchema });
  const stats = createRoute({ method: "get", path: "/members/{member_id}/stats", tags: ["members"], summary: "Üye istatistikleri",
    request: { params: schema.memberParamsSchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: schema.memberWithStatsSchema } } } },
  });
  app.openapi(stats, async c => {
    const id = c.req.valid("param").member_id;
    return publicCachedJson(c, deps, { domain: "members", canonicalPath: `/members/${String(id)}/stats`, query: {}, load: async () => queries.requiredMemberJson(await queries.getMemberStatsJson(deps.db, id)) });
  });
  deps.routeRegistry.push({ method: "get", path: "/members/:member_id/stats", domain: "members", tag: "members", summary: "Üye istatistikleri", public: true, response: schema.memberWithStatsSchema, params: schema.memberParamsSchema });
  const projects = createRoute({ method: "get", path: "/members/{member_id}/projects", tags: ["members"], summary: "Üyenin proje üyelikleri",
    request: { params: schema.memberParamsSchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: z.array(schema.projectMemberResponseSchema) } } } },
  });
  app.openapi(projects, async c => {
    const id = c.req.valid("param").member_id;
    return publicCachedJson(c, deps, { domain: "members", canonicalPath: `/members/${String(id)}/projects`, query: {}, load: async () => queries.requiredMemberJson(await queries.listMemberProjectsJson(deps.db, id)) });
  });
  deps.routeRegistry.push({ method: "get", path: "/members/:member_id/projects", domain: "members", tag: "members", summary: "Üyenin proje üyelikleri", public: true, response: z.array(schema.projectMemberResponseSchema), params: schema.memberParamsSchema });
  const create = createRoute({ method: "post", path: "/members", tags: ["members"], summary: "Üye oluştur",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [staff, limitBodySize(deps.security?.maxBodyBytes)],
    request: { body: { content: { "application/json": { schema: schema.memberCreateSchema } } } },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 201: { description: "Success", content: { "application/json": { schema: schema.memberResponseSchema } } } },
  });
  app.openapi(create, async c => {
    const result = await queries.createMember(deps.db, c.req.valid("json"));
    deps.cache.invalidate("members");
    return sendJsonResponse(c, result, { status: 201 });
  });
  deps.routeRegistry.push({ method: "post", path: "/members", domain: "members", tag: "members", summary: "Üye oluştur", auth: ["admin", "moderator"], response: schema.memberResponseSchema, body: schema.memberCreateSchema, status: 201 });
  const update = createRoute({ method: "put", path: "/members/{member_id}", tags: ["members"], summary: "Üye güncelle",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [staff, limitBodySize(deps.security?.maxBodyBytes)],
    request: { params: schema.memberParamsSchema, body: { content: { "application/json": { schema: schema.memberUpdateSchema } } } },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: schema.memberResponseSchema } } } },
  });
  app.openapi(update, async c => {
    const result = await queries.updateMember(deps.db, c.req.valid("param").member_id, c.req.valid("json"));
    deps.cache.invalidate("members");
    return sendJsonResponse(c, result);
  });
  deps.routeRegistry.push({ method: "put", path: "/members/:member_id", domain: "members", tag: "members", summary: "Üye güncelle", auth: ["admin", "moderator"], response: schema.memberResponseSchema, params: schema.memberParamsSchema, body: schema.memberUpdateSchema });
  const remove = createRoute({ method: "delete", path: "/members/{member_id}", tags: ["members"], summary: "Üye sil",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [staff, limitBodySize(deps.security?.maxBodyBytes)],
    request: { params: schema.memberParamsSchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 204: { description: "Success" } },
  });
  app.openapi(remove, async c => {
    await queries.deleteMember(deps.db, c.req.valid("param").member_id);
    deps.cache.invalidate("members");
    c.header("Cache-Control", "no-store");
    return c.body(null, 204);
  });
  deps.routeRegistry.push({ method: "delete", path: "/members/:member_id", domain: "members", tag: "members", summary: "Üye sil", auth: ["admin", "moderator"], params: schema.memberParamsSchema, status: 204 });
}
