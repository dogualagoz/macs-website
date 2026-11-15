import { createRoute, z } from "@hono/zod-openapi";
import type { MiddlewareHandler } from "hono";
import type { AppRouter, AppDeps, AppEnv } from "../../app";
import { HttpError } from "../../lib/http-error";
import { publicCachedJson, sendJsonResponse } from "../../lib/public-cache";
import { authenticate, requireRoles } from "../../middleware/auth";
import { limitBodySize, requireJsonBody } from "../../security/request-guards";
import * as schema from "./schemas";
import * as queries from "./queries";
import * as service from "./service";

export function registerProjectRoutes(app: AppRouter, deps: AppDeps): void {
  const now = () => deps.now?.() ?? new Date();
  const auth = (roles: ("admin" | "moderator")[]): MiddlewareHandler<AppEnv> => async (c, next) => {
    const user = await authenticate(c.req.raw, deps.env, deps.loadUser, now());
    requireRoles(user, roles);
    c.set("user", user);
    await next();
  };
  const staff = auth(["admin", "moderator"]);
  const admin = auth(["admin"]);
  const categories = createRoute({ method: "get", path: "/projects/categories", tags: ["projects"], summary: "Proje kategorileri",
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: z.array(schema.categoryResponseSchema) } } } },
  });
  app.openapi(categories, async c => {
    return publicCachedJson(c, deps, { domain: "projects", canonicalPath: `/projects/categories`, query: {}, load: async () => queries.listProjectCategoriesJson(deps.db) });
  });
  deps.routeRegistry.push({ method: "get", path: "/projects/categories", domain: "projects", tag: "projects", summary: "Proje kategorileri", public: true, response: z.array(schema.categoryResponseSchema) });
  const createCategory = createRoute({ method: "post", path: "/projects/categories", tags: ["projects"], summary: "Kategori oluştur",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [staff, limitBodySize(deps.security?.maxBodyBytes), requireJsonBody],
    request: { body: { required: true, content: { "application/json": { schema: schema.categoryCreateSchema } } } },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 201: { description: "Success", content: { "application/json": { schema: schema.categoryResponseSchema } } } },
  });
  app.openapi(createCategory, async c => {
    const result = await service.createProjectCategory(deps.db, c.req.valid("json"));
    deps.cache.invalidate("projects");
    return sendJsonResponse(c, result, { status: 201 });
  });
  deps.routeRegistry.push({ method: "post", path: "/projects/categories", domain: "projects", tag: "projects", summary: "Kategori oluştur", auth: ["admin", "moderator"], response: schema.categoryResponseSchema, body: schema.categoryCreateSchema, status: 201 });
  const category = createRoute({ method: "get", path: "/projects/categories/{category_id}", tags: ["projects"], summary: "Kategori detayı",
    request: { params: schema.categoryParamsSchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: schema.categoryResponseSchema } } } },
  });
  app.openapi(category, async c => {
    const params = c.req.valid("param");
    return publicCachedJson(c, deps, { domain: "projects", canonicalPath: `/projects/categories/${String(params.category_id)}`, query: {}, load: async () => service.requiredProjectCategory(await queries.getProjectCategoryJson(deps.db, params.category_id)) });
  });
  deps.routeRegistry.push({ method: "get", path: "/projects/categories/:category_id", domain: "projects", tag: "projects", summary: "Kategori detayı", public: true, response: schema.categoryResponseSchema, params: schema.categoryParamsSchema });
  const updateCategory = createRoute({ method: "put", path: "/projects/categories/{category_id}", tags: ["projects"], summary: "Kategori güncelle",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [staff, limitBodySize(deps.security?.maxBodyBytes), requireJsonBody],
    request: { params: schema.categoryParamsSchema, body: { required: true, content: { "application/json": { schema: schema.categoryUpdateSchema } } } },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: schema.categoryResponseSchema } } } },
  });
  app.openapi(updateCategory, async c => {
    const params = c.req.valid("param");
    const result = await service.updateProjectCategory(deps.db, params.category_id, c.req.valid("json"));
    deps.cache.invalidate("projects");
    return sendJsonResponse(c, result, { status: 200 });
  });
  deps.routeRegistry.push({ method: "put", path: "/projects/categories/:category_id", domain: "projects", tag: "projects", summary: "Kategori güncelle", auth: ["admin", "moderator"], response: schema.categoryResponseSchema, params: schema.categoryParamsSchema, body: schema.categoryUpdateSchema });
  const deleteCategory = createRoute({ method: "delete", path: "/projects/categories/{category_id}", tags: ["projects"], summary: "Kategori sil",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [staff, limitBodySize(deps.security?.maxBodyBytes)],
    request: { params: schema.categoryParamsSchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 204: { description: "Success" } },
  });
  app.openapi(deleteCategory, async c => {
    const params = c.req.valid("param");
    await service.deleteProjectCategory(deps.db, params.category_id);
    deps.cache.invalidate("projects");
    c.header("Cache-Control", "no-store");
    return c.body(null, 204);
  });
  deps.routeRegistry.push({ method: "delete", path: "/projects/categories/:category_id", domain: "projects", tag: "projects", summary: "Kategori sil", auth: ["admin", "moderator"], params: schema.categoryParamsSchema, status: 204 });
  const list = createRoute({ method: "get", path: "/projects", tags: ["projects"], summary: "Proje listesi",
    request: { query: schema.projectQuerySchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: schema.projectListResponseSchema } } } },
  });
  app.openapi(list, async c => {
    const query = c.req.valid("query");
    return publicCachedJson(c, deps, { domain: "projects", canonicalPath: `/projects`, query: query, load: async () => queries.listProjectsJson(deps.db, query, false) });
  });
  deps.routeRegistry.push({ method: "get", path: "/projects", domain: "projects", tag: "projects", summary: "Proje listesi", public: true, response: schema.projectListResponseSchema, query: schema.projectQuerySchema });
  const adminList = createRoute({ method: "get", path: "/projects/admin", tags: ["projects"], summary: "Yönetici proje listesi",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [staff, limitBodySize(deps.security?.maxBodyBytes)],
    request: { query: schema.adminProjectQuerySchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: schema.projectListResponseSchema } } } },
  });
  app.openapi(adminList, async c => {
    const query = c.req.valid("query");
    return sendJsonResponse(c, await queries.listProjectsJson(deps.db, query, true), { status: 200, isPublic: false });
  });
  deps.routeRegistry.push({ method: "get", path: "/projects/admin", domain: "projects", tag: "projects", summary: "Yönetici proje listesi", auth: ["admin", "moderator"], response: schema.projectListResponseSchema, query: schema.adminProjectQuerySchema });
  const featured = createRoute({ method: "get", path: "/projects/featured", tags: ["projects"], summary: "Öne çıkan proje",
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: schema.projectResponseSchema } } } },
  });
  app.openapi(featured, async c => {
    return publicCachedJson(c, deps, { domain: "projects", canonicalPath: `/projects/featured`, query: {}, load: async () => requiredFeatured(await queries.getFeaturedProjectJson(deps.db)) });
  });
  deps.routeRegistry.push({ method: "get", path: "/projects/featured", domain: "projects", tag: "projects", summary: "Öne çıkan proje", public: true, response: schema.projectResponseSchema });
  const bySlug = createRoute({ method: "get", path: "/projects/by-slug/{slug}", tags: ["projects"], summary: "Slug ile proje",
    request: { params: schema.slugParamsSchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: schema.projectResponseSchema } } } },
  });
  app.openapi(bySlug, async c => {
    const params = c.req.valid("param");
    return publicCachedJson(c, deps, { domain: "projects", canonicalPath: `/projects/by-slug/${params.slug}`, query: {}, load: async () => service.requiredProject(await queries.getProjectBySlugJson(deps.db, params.slug)) });
  });
  deps.routeRegistry.push({ method: "get", path: "/projects/by-slug/:slug", domain: "projects", tag: "projects", summary: "Slug ile proje", public: true, response: schema.projectResponseSchema, params: schema.slugParamsSchema });
  const create = createRoute({ method: "post", path: "/projects", tags: ["projects"], summary: "Proje oluştur",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [staff, limitBodySize(deps.security?.maxBodyBytes), requireJsonBody],
    request: { body: { required: true, content: { "application/json": { schema: schema.projectCreateSchema } } } },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 201: { description: "Success", content: { "application/json": { schema: schema.projectResponseSchema } } } },
  });
  app.openapi(create, async c => {
    const user = c.get("user");
    if (!user) throw new Error("Protected handler requires authenticated user");
    const result = await service.createProject(deps.db, user.id, c.req.valid("json"), now());
    deps.cache.invalidate("projects");
    return sendJsonResponse(c, result, { status: 201 });
  });
  deps.routeRegistry.push({ method: "post", path: "/projects", domain: "projects", tag: "projects", summary: "Proje oluştur", auth: ["admin", "moderator"], response: schema.projectResponseSchema, body: schema.projectCreateSchema, status: 201 });
  const detail = createRoute({ method: "get", path: "/projects/{project_id}", tags: ["projects"], summary: "Proje detayı",
    request: { params: schema.projectParamsSchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: schema.projectResponseSchema } } } },
  });
  app.openapi(detail, async c => {
    const params = c.req.valid("param");
    return publicCachedJson(c, deps, { domain: "projects", canonicalPath: `/projects/${String(params.project_id)}`, query: {}, load: async () => service.requiredProject(await queries.getProjectJson(deps.db, params.project_id, { scope: "public", members: "embed" })) });
  });
  deps.routeRegistry.push({ method: "get", path: "/projects/:project_id", domain: "projects", tag: "projects", summary: "Proje detayı", public: true, response: schema.projectResponseSchema, params: schema.projectParamsSchema });
  const update = createRoute({ method: "put", path: "/projects/{project_id}", tags: ["projects"], summary: "Proje güncelle",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [staff, limitBodySize(deps.security?.maxBodyBytes), requireJsonBody],
    request: { params: schema.projectParamsSchema, body: { required: true, content: { "application/json": { schema: schema.projectUpdateSchema } } } },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: schema.projectResponseSchema } } } },
  });
  app.openapi(update, async c => {
    const params = c.req.valid("param");
    const result = await service.updateProject(deps.db, params.project_id, c.req.valid("json"), now());
    deps.cache.invalidate("projects");
    return sendJsonResponse(c, result, { status: 200 });
  });
  deps.routeRegistry.push({ method: "put", path: "/projects/:project_id", domain: "projects", tag: "projects", summary: "Proje güncelle", auth: ["admin", "moderator"], response: schema.projectResponseSchema, params: schema.projectParamsSchema, body: schema.projectUpdateSchema });
  const softDelete = createRoute({ method: "delete", path: "/projects/{project_id}", tags: ["projects"], summary: "Projeyi arşivle",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [staff, limitBodySize(deps.security?.maxBodyBytes)],
    request: { params: schema.projectParamsSchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 204: { description: "Success" } },
  });
  app.openapi(softDelete, async c => {
    const params = c.req.valid("param");
    await service.deleteProject(deps.db, params.project_id);
    deps.cache.invalidate("projects");
    c.header("Cache-Control", "no-store");
    return c.body(null, 204);
  });
  deps.routeRegistry.push({ method: "delete", path: "/projects/:project_id", domain: "projects", tag: "projects", summary: "Projeyi arşivle", auth: ["admin", "moderator"], params: schema.projectParamsSchema, status: 204 });
  const hardDelete = createRoute({ method: "delete", path: "/projects/{project_id}/hard", tags: ["projects"], summary: "Projeyi kalıcı sil",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [admin, limitBodySize(deps.security?.maxBodyBytes)],
    request: { params: schema.projectParamsSchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 204: { description: "Success" } },
  });
  app.openapi(hardDelete, async c => {
    const params = c.req.valid("param");
    await service.hardDeleteProject(deps.db, params.project_id);
    deps.cache.invalidate("projects");
    c.header("Cache-Control", "no-store");
    return c.body(null, 204);
  });
  deps.routeRegistry.push({ method: "delete", path: "/projects/:project_id/hard", domain: "projects", tag: "projects", summary: "Projeyi kalıcı sil", auth: ["admin"], params: schema.projectParamsSchema, status: 204 });
  const members = createRoute({ method: "get", path: "/projects/{project_id}/members", tags: ["projects"], summary: "Proje üyeleri",
    request: { params: schema.projectParamsSchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: z.array(schema.projectMemberResponseSchema) } } } },
  });
  app.openapi(members, async c => {
    const params = c.req.valid("param");
    return publicCachedJson(c, deps, { domain: "projects", canonicalPath: `/projects/${String(params.project_id)}/members`, query: {}, load: async () => service.requiredProject(await queries.listProjectMembersJson(deps.db, params.project_id)) });
  });
  deps.routeRegistry.push({ method: "get", path: "/projects/:project_id/members", domain: "projects", tag: "projects", summary: "Proje üyeleri", public: true, response: z.array(schema.projectMemberResponseSchema), params: schema.projectParamsSchema });
  const addMember = createRoute({ method: "post", path: "/projects/{project_id}/members", tags: ["projects"], summary: "Projeye üye ekle",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [staff, limitBodySize(deps.security?.maxBodyBytes), requireJsonBody],
    request: { params: schema.projectParamsSchema, body: { required: true, content: { "application/json": { schema: schema.projectMemberInputSchema } } } },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 201: { description: "Success", content: { "application/json": { schema: schema.membershipMutationResponseSchema } } } },
  });
  app.openapi(addMember, async c => {
    const params = c.req.valid("param");
    const result = await service.addProjectMember(deps.db, params.project_id, c.req.valid("json"));
    deps.cache.invalidate("projects");
    return sendJsonResponse(c, JSON.stringify(result), { status: 201 });
  });
  deps.routeRegistry.push({ method: "post", path: "/projects/:project_id/members", domain: "projects", tag: "projects", summary: "Projeye üye ekle", auth: ["admin", "moderator"], response: schema.membershipMutationResponseSchema, params: schema.projectParamsSchema, body: schema.projectMemberInputSchema, status: 201 });
  const updateMember = createRoute({ method: "put", path: "/projects/{project_id}/members/{member_id}", tags: ["projects"], summary: "Proje üyesini güncelle",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [staff, limitBodySize(deps.security?.maxBodyBytes), requireJsonBody],
    request: { params: schema.membershipParamsSchema, body: { required: true, content: { "application/json": { schema: schema.projectMemberUpdateSchema } } } },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: schema.membershipMutationResponseSchema } } } },
  });
  app.openapi(updateMember, async c => {
    const params = c.req.valid("param");
    const result = await service.updateProjectMember(deps.db, params.project_id, params.member_id, c.req.valid("json"));
    deps.cache.invalidate("projects");
    return sendJsonResponse(c, JSON.stringify(result), { status: 200 });
  });
  deps.routeRegistry.push({ method: "put", path: "/projects/:project_id/members/:member_id", domain: "projects", tag: "projects", summary: "Proje üyesini güncelle", auth: ["admin", "moderator"], response: schema.membershipMutationResponseSchema, params: schema.membershipParamsSchema, body: schema.projectMemberUpdateSchema });
  const removeMember = createRoute({ method: "delete", path: "/projects/{project_id}/members/{member_id}", tags: ["projects"], summary: "Proje üyesini çıkar",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [staff, limitBodySize(deps.security?.maxBodyBytes)],
    request: { params: schema.membershipParamsSchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 204: { description: "Success" } },
  });
  app.openapi(removeMember, async c => {
    const params = c.req.valid("param");
    await service.removeProjectMember(deps.db, params.project_id, params.member_id);
    deps.cache.invalidate("projects");
    c.header("Cache-Control", "no-store");
    return c.body(null, 204);
  });
  deps.routeRegistry.push({ method: "delete", path: "/projects/:project_id/members/:member_id", domain: "projects", tag: "projects", summary: "Proje üyesini çıkar", auth: ["admin", "moderator"], params: schema.membershipParamsSchema, status: 204 });
}

function requiredFeatured(body: string | null): string {
  if (body === null) throw new HttpError(404, "Öne çıkan proje bulunamadı");
  return body;
}
