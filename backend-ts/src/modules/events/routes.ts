import type { Router } from "express";
import { z } from "zod";
import type { AppDeps } from "../../app";
import { HttpError } from "../../lib/http-error";
import { route } from "../../lib/route";
import * as schema from "./schemas";
import * as service from "./service";

export function registerEventRoutes(router: Router, deps: AppDeps): void {
  const base = { domain: "events", tag: "events" } as const;
  const publicEvent = { ...base, public: true, response: schema.eventResponseSchema } as const;
  const staff = { ...base, auth: ["admin", "moderator"] } as const;
  const category = { ...base, response: schema.categoryResponseSchema } as const;
  const now = () => deps.now?.() ?? new Date();
  route(router, deps, { ...category, public: true, method: "get", path: "/events/categories", summary: "Etkinlik kategorileri", query: schema.categoryQuerySchema, response: z.array(schema.categoryResponseSchema),
    handler: ({ query }) => service.listEventCategories(deps.db, query.skip ?? 0, query.limit ?? 10) });
  route(router, deps, { ...category, ...staff, method: "post", path: "/events/categories", summary: "Kategori oluştur", status: 201, body: schema.categoryCreateSchema,
    handler: ({ body }) => service.createEventCategory(deps.db, body) });
  route(router, deps, { ...category, public: true, method: "get", path: "/events/categories/:category_id", summary: "Kategori detayı", params: schema.categoryParamsSchema,
    handler: ({ params }) => service.getEventCategory(deps.db, params.category_id) });
  route(router, deps, { ...category, ...staff, method: "put", path: "/events/categories/:category_id", summary: "Kategori güncelle", params: schema.categoryParamsSchema, body: schema.categoryCreateSchema,
    handler: ({ params, body }) => service.updateEventCategory(deps.db, params.category_id, body) });
  route(router, deps, { ...staff, method: "delete", path: "/events/categories/:category_id", summary: "Kategori sil", params: schema.categoryParamsSchema, status: 204,
    handler: ({ params }) => service.deleteEventCategory(deps.db, params.category_id) });
  route(router, deps, { ...publicEvent, method: "get", path: "/events", summary: "Etkinlik listesi", query: schema.eventQuerySchema, response: z.array(schema.eventResponseSchema),
    handler: ({ query }) => service.listEvents(deps.db, query) });
  route(router, deps, { ...staff, method: "get", path: "/events/admin", summary: "Yönetici etkinlik listesi", query: schema.adminEventQuerySchema, response: z.array(schema.eventResponseSchema),
    handler: ({ query }) => service.listEvents(deps.db, query, true) });
  route(router, deps, { ...publicEvent, method: "get", path: "/events/featured", summary: "Öne çıkan etkinlik", response: schema.eventResponseSchema.nullable(),
    handler: () => service.getFeaturedEvent(deps.db) });
  route(router, deps, { ...publicEvent, method: "get", path: "/events/by-slug/:slug", summary: "Slug ile etkinlik", params: schema.slugParamsSchema,
    handler: ({ params }) => service.getEventBySlug(deps.db, params.slug) });
  route(router, deps, { ...staff, method: "post", path: "/events", summary: "Etkinlik oluştur", body: schema.eventCreateSchema, response: schema.eventResponseSchema, status: 201,
    bodyInvalid: new HttpError(400, "Geçersiz istek gövdesi"), handler: ({ user, body }) => {
      if (!user) throw new Error("Protected handler requires authenticated user");
      return service.createEvent(deps.db, user.id, body, now());
    } });
  route(router, deps, { ...publicEvent, method: "get", path: "/events/:event_id", summary: "Etkinlik detayı", params: schema.eventParamsSchema,
    handler: ({ params }) => service.getEvent(deps.db, params.event_id) });
  route(router, deps, { ...staff, method: "put", path: "/events/:event_id", summary: "Etkinlik güncelle", params: schema.eventParamsSchema, body: schema.eventUpdateSchema, response: schema.eventResponseSchema,
    handler: ({ params, body }) => service.updateEvent(deps.db, params.event_id, body, now()) });
  route(router, deps, { ...staff, method: "delete", path: "/events/:event_id", summary: "Etkinliği arşivle", params: schema.eventParamsSchema, response: z.object({ message: z.string() }),
    handler: ({ params }) => service.deleteEvent(deps.db, params.event_id) });
  route(router, deps, { ...base, auth: ["admin"], method: "delete", path: "/events/:event_id/hard", summary: "Etkinliği kalıcı sil", params: schema.eventParamsSchema, status: 204,
    handler: ({ params }) => service.hardDeleteEvent(deps.db, params.event_id) });
}
