import { createRoute, z } from "@hono/zod-openapi";
import type { MiddlewareHandler } from "hono";
import type { AppRouter, AppDeps, AppEnv } from "../../app";
import { HttpError } from "../../lib/http-error";
import { publicCachedJson, sendJsonResponse } from "../../lib/public-cache";
import { authenticate, requireRoles } from "../../middleware/auth";
import { limitBodySize } from "../../security/request-guards";
import * as schema from "./schemas";
import * as queries from "./queries";
import * as service from "./service";

export function registerEventRoutes(app: AppRouter, deps: AppDeps): void {
  const now = () => deps.now?.() ?? new Date();
  const auth = (roles: ("admin" | "moderator")[]): MiddlewareHandler<AppEnv> => async (c, next) => {
    const user = await authenticate(c.req.raw, deps.env, deps.loadUser, now());
    requireRoles(user, roles);
    c.set("user", user);
    await next();
  };
  const staff = auth(["admin", "moderator"]);
  const admin = auth(["admin"]);
  const bodyInvalid: MiddlewareHandler<AppEnv> = async (c, next) => {
    c.set("bodyInvalid", new HttpError(400, "Geçersiz istek gövdesi"));
    await next();
  };
  const checkSort = (query: schema.EventQuery) => {
    if (query.sort_by && !schema.EVENT_SORTABLE.some(field => field === query.sort_by)) {
      throw new HttpError(400, "Geçersiz sıralama alanı. İzin verilenler: start_time, title, created_at");
    }
  };
  const categories = createRoute({ method: "get", path: "/events/categories", tags: ["events"], summary: "Etkinlik kategorileri",
    request: { query: schema.categoryQuerySchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: z.array(schema.categoryResponseSchema) } } } },
  });
  app.openapi(categories, async c => {
    const query = c.req.valid("query");
    return publicCachedJson(c, deps, { domain: "events", canonicalPath: `/events/categories`, query: query, load: async () => queries.listEventCategoriesJson(deps.db, query.skip ?? 0, query.limit ?? 10) });
  });
  deps.routeRegistry.push({ method: "get", path: "/events/categories", domain: "events", tag: "events", summary: "Etkinlik kategorileri", public: true, response: z.array(schema.categoryResponseSchema), query: schema.categoryQuerySchema });
  const createCategory = createRoute({ method: "post", path: "/events/categories", tags: ["events"], summary: "Kategori oluştur",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [staff, limitBodySize(deps.security?.maxBodyBytes)],
    request: { body: { content: { "application/json": { schema: schema.categoryCreateSchema } } } },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 201: { description: "Success", content: { "application/json": { schema: schema.categoryResponseSchema } } } },
  });
  app.openapi(createCategory, async c => {
    const result = await service.createEventCategory(deps.db, c.req.valid("json"));
    deps.cache.invalidate("events");
    return sendJsonResponse(c, result, { status: 201 });
  });
  deps.routeRegistry.push({ method: "post", path: "/events/categories", domain: "events", tag: "events", summary: "Kategori oluştur", auth: ["admin", "moderator"], response: schema.categoryResponseSchema, body: schema.categoryCreateSchema, status: 201 });
  const category = createRoute({ method: "get", path: "/events/categories/{category_id}", tags: ["events"], summary: "Kategori detayı",
    request: { params: schema.categoryParamsSchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: schema.categoryResponseSchema } } } },
  });
  app.openapi(category, async c => {
    const id = c.req.valid("param").category_id;
    return publicCachedJson(c, deps, { domain: "events", canonicalPath: `/events/categories/${String(id)}`, query: {}, load: async () => service.requiredCategory(await queries.getEventCategoryJson(deps.db, id)) });
  });
  deps.routeRegistry.push({ method: "get", path: "/events/categories/:category_id", domain: "events", tag: "events", summary: "Kategori detayı", public: true, response: schema.categoryResponseSchema, params: schema.categoryParamsSchema });
  const updateCategory = createRoute({ method: "put", path: "/events/categories/{category_id}", tags: ["events"], summary: "Kategori güncelle",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [staff, limitBodySize(deps.security?.maxBodyBytes)],
    request: { params: schema.categoryParamsSchema, body: { content: { "application/json": { schema: schema.categoryCreateSchema } } } },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: schema.categoryResponseSchema } } } },
  });
  app.openapi(updateCategory, async c => {
    const id = c.req.valid("param").category_id;
    const result = await service.updateEventCategory(deps.db, id, c.req.valid("json"));
    deps.cache.invalidate("events");
    return sendJsonResponse(c, result, { status: 200 });
  });
  deps.routeRegistry.push({ method: "put", path: "/events/categories/:category_id", domain: "events", tag: "events", summary: "Kategori güncelle", auth: ["admin", "moderator"], response: schema.categoryResponseSchema, params: schema.categoryParamsSchema, body: schema.categoryCreateSchema });
  const deleteCategory = createRoute({ method: "delete", path: "/events/categories/{category_id}", tags: ["events"], summary: "Kategori sil",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [staff, limitBodySize(deps.security?.maxBodyBytes)],
    request: { params: schema.categoryParamsSchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 204: { description: "Success" } },
  });
  app.openapi(deleteCategory, async c => {
    const id = c.req.valid("param").category_id;
    await service.deleteEventCategory(deps.db, id);
    deps.cache.invalidate("events");
    c.header("Cache-Control", "no-store");
    return c.body(null, 204);
  });
  deps.routeRegistry.push({ method: "delete", path: "/events/categories/:category_id", domain: "events", tag: "events", summary: "Kategori sil", auth: ["admin", "moderator"], params: schema.categoryParamsSchema, status: 204 });
  const list = createRoute({ method: "get", path: "/events", tags: ["events"], summary: "Etkinlik listesi",
    request: { query: schema.eventQuerySchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: z.array(schema.eventResponseSchema) } } } },
  });
  app.openapi(list, async c => {
    const query = c.req.valid("query");
    checkSort(query);
    return publicCachedJson(c, deps, { domain: "events", canonicalPath: `/events`, query: query, load: async () => queries.listEventsJson(deps.db, query, false) });
  });
  deps.routeRegistry.push({ method: "get", path: "/events", domain: "events", tag: "events", summary: "Etkinlik listesi", public: true, response: z.array(schema.eventResponseSchema), query: schema.eventQuerySchema });
  const adminList = createRoute({ method: "get", path: "/events/admin", tags: ["events"], summary: "Yönetici etkinlik listesi",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [staff, limitBodySize(deps.security?.maxBodyBytes)],
    request: { query: schema.adminEventQuerySchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: z.array(schema.eventResponseSchema) } } } },
  });
  app.openapi(adminList, async c => {
    const query = c.req.valid("query");
    checkSort(query);
    return sendJsonResponse(c, await queries.listEventsJson(deps.db, query, true), { status: 200, isPublic: false });
  });
  deps.routeRegistry.push({ method: "get", path: "/events/admin", domain: "events", tag: "events", summary: "Yönetici etkinlik listesi", auth: ["admin", "moderator"], response: z.array(schema.eventResponseSchema), query: schema.adminEventQuerySchema });
  const featured = createRoute({ method: "get", path: "/events/featured", tags: ["events"], summary: "Öne çıkan etkinlik",
    request: {  },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: schema.eventResponseSchema.nullable() } } } },
  });
  app.openapi(featured, async c => {
    return publicCachedJson(c, deps, { domain: "events", canonicalPath: `/events/featured`, query: {}, load: async () => queries.getFeaturedEventJson(deps.db) });
  });
  deps.routeRegistry.push({ method: "get", path: "/events/featured", domain: "events", tag: "events", summary: "Öne çıkan etkinlik", public: true, response: schema.eventResponseSchema.nullable() });
  const bySlug = createRoute({ method: "get", path: "/events/by-slug/{slug}", tags: ["events"], summary: "Slug ile etkinlik",
    request: { params: schema.slugParamsSchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: schema.eventResponseSchema } } } },
  });
  app.openapi(bySlug, async c => {
    const id = c.req.valid("param").slug;
    return publicCachedJson(c, deps, { domain: "events", canonicalPath: `/events/by-slug/${id}`, query: {}, load: async () => service.requiredEvent(await queries.getEventBySlugJson(deps.db, id)) });
  });
  deps.routeRegistry.push({ method: "get", path: "/events/by-slug/:slug", domain: "events", tag: "events", summary: "Slug ile etkinlik", public: true, response: schema.eventResponseSchema, params: schema.slugParamsSchema });
  const create = createRoute({ method: "post", path: "/events", tags: ["events"], summary: "Etkinlik oluştur",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [staff, bodyInvalid, limitBodySize(deps.security?.maxBodyBytes)],
    request: { body: { content: { "application/json": { schema: schema.eventCreateSchema } } } },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 201: { description: "Success", content: { "application/json": { schema: schema.eventResponseSchema } } } },
  });
  app.openapi(create, async c => {
    const user = c.get("user");
    if (!user) throw new Error("Protected handler requires authenticated user");
    const result = await service.createEvent(deps.db, user.id, c.req.valid("json"), now());
    deps.cache.invalidate("events");
    return sendJsonResponse(c, result, { status: 201 });
  }, (result, c) => {
    if (!result.success && result.target === "json") return c.json({ detail: "Geçersiz istek gövdesi" }, 400);
  });
  deps.routeRegistry.push({ method: "post", path: "/events", domain: "events", tag: "events", summary: "Etkinlik oluştur", auth: ["admin", "moderator"], response: schema.eventResponseSchema, body: schema.eventCreateSchema, status: 201 });
  const detail = createRoute({ method: "get", path: "/events/{event_id}", tags: ["events"], summary: "Etkinlik detayı",
    request: { params: schema.eventParamsSchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: schema.eventResponseSchema } } } },
  });
  app.openapi(detail, async c => {
    const id = c.req.valid("param").event_id;
    return publicCachedJson(c, deps, { domain: "events", canonicalPath: `/events/${String(id)}`, query: {}, load: async () => service.requiredEvent(await queries.getEventJson(deps.db, id)) });
  });
  deps.routeRegistry.push({ method: "get", path: "/events/:event_id", domain: "events", tag: "events", summary: "Etkinlik detayı", public: true, response: schema.eventResponseSchema, params: schema.eventParamsSchema });
  const update = createRoute({ method: "put", path: "/events/{event_id}", tags: ["events"], summary: "Etkinlik güncelle",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [staff, limitBodySize(deps.security?.maxBodyBytes)],
    request: { params: schema.eventParamsSchema, body: { content: { "application/json": { schema: schema.eventUpdateSchema } } } },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: schema.eventResponseSchema } } } },
  });
  app.openapi(update, async c => {
    const id = c.req.valid("param").event_id;
    const result = await service.updateEvent(deps.db, id, c.req.valid("json"), now());
    deps.cache.invalidate("events");
    return sendJsonResponse(c, result, { status: 200 });
  });
  deps.routeRegistry.push({ method: "put", path: "/events/:event_id", domain: "events", tag: "events", summary: "Etkinlik güncelle", auth: ["admin", "moderator"], response: schema.eventResponseSchema, params: schema.eventParamsSchema, body: schema.eventUpdateSchema });
  const remove = createRoute({ method: "delete", path: "/events/{event_id}", tags: ["events"], summary: "Etkinliği arşivle",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [staff, limitBodySize(deps.security?.maxBodyBytes)],
    request: { params: schema.eventParamsSchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: z.object({ message: z.string() }) } } } },
  });
  app.openapi(remove, async c => {
    const id = c.req.valid("param").event_id;
    const result = JSON.stringify(await service.deleteEvent(deps.db, id));
    deps.cache.invalidate("events");
    return sendJsonResponse(c, result, { status: 200 });
  });
  deps.routeRegistry.push({ method: "delete", path: "/events/:event_id", domain: "events", tag: "events", summary: "Etkinliği arşivle", auth: ["admin", "moderator"], response: z.object({ message: z.string() }), params: schema.eventParamsSchema });
  const hardRemove = createRoute({ method: "delete", path: "/events/{event_id}/hard", tags: ["events"], summary: "Etkinliği kalıcı sil",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [admin, limitBodySize(deps.security?.maxBodyBytes)],
    request: { params: schema.eventParamsSchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 204: { description: "Success" } },
  });
  app.openapi(hardRemove, async c => {
    const id = c.req.valid("param").event_id;
    await service.hardDeleteEvent(deps.db, id);
    deps.cache.invalidate("events");
    c.header("Cache-Control", "no-store");
    return c.body(null, 204);
  });
  deps.routeRegistry.push({ method: "delete", path: "/events/:event_id/hard", domain: "events", tag: "events", summary: "Etkinliği kalıcı sil", auth: ["admin"], params: schema.eventParamsSchema, status: 204 });
}
