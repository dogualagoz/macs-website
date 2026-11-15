import { createRoute, z } from "@hono/zod-openapi";
import type { MiddlewareHandler } from "hono";
import type { AppRouter, AppDeps, AppEnv } from "../../app";
import { publicCachedJson, sendJsonResponse } from "../../lib/public-cache";
import { authenticate, requireRoles } from "../../middleware/auth";
import { perMinute, routeRateLimit } from "../../security/rate-limit";
import { limitBodySize, requireJsonBody } from "../../security/request-guards";
import * as schema from "./schemas";
import * as queries from "./queries";
import { geocodeAddress, requiredSponsorJson } from "./service";

export function registerSponsorRoutes(app: AppRouter, deps: AppDeps): void {
  const staff: MiddlewareHandler<AppEnv> = async (c, next) => {
    const user = await authenticate(c.req.raw, deps.env, deps.loadUser, deps.now?.() ?? new Date());
    requireRoles(user, ["admin", "moderator"]);
    c.set("user", user);
    await next();
  };
  const list = createRoute({ method: "get", path: "/sponsors/", tags: ["sponsors"], summary: "Sponsor listesi",
    request: { query: schema.sponsorQuerySchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: z.array(schema.sponsorResponseSchema) } } } },
  });
  app.openapi(list, async c => {
    const query = c.req.valid("query");
    return publicCachedJson(c, deps, { domain: "sponsors", canonicalPath: "/sponsors/", query, load: () => queries.listSponsorsJson(deps.db, query) });
  });
  const categories = createRoute({ method: "get", path: "/sponsors/categories", tags: ["sponsors"], summary: "Sponsor kategorileri",
    request: {},
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: z.array(z.string()) } } } },
  });
  app.openapi(categories, async c => {
    return publicCachedJson(c, deps, { domain: "sponsors", canonicalPath: "/sponsors/categories", query: {}, load: () => queries.listSponsorCategoriesJson(deps.db) });
  });
  const geocode = createRoute({ method: "post", path: "/sponsors/geocode", tags: ["sponsors"], summary: "Adres koordinatları",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [routeRateLimit(deps, perMinute(10)), staff, limitBodySize(deps.security?.maxBodyBytes), requireJsonBody],
    request: { body: { required: true, content: { "application/json": { schema: schema.geocodeRequestSchema } } } },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: schema.geocodeResponseSchema } } } },
  });
  app.openapi(geocode, async c => {
    return sendJsonResponse(c, JSON.stringify(await geocodeAddress(c.req.valid("json").address, deps.fetchImpl ?? fetch, deps.env.NOMINATIM_USER_AGENT, deps.logger)));
  });
  const detail = createRoute({ method: "get", path: "/sponsors/{sponsor_id}", tags: ["sponsors"], summary: "Sponsor detayı",
    request: { params: schema.sponsorParamsSchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: schema.sponsorResponseSchema } } } },
  });
  app.openapi(detail, async c => {
    const id = c.req.valid("param").sponsor_id;
    return publicCachedJson(c, deps, { domain: "sponsors", canonicalPath: `/sponsors/${String(id)}`, query: {}, load: async () => requiredSponsorJson(await queries.getSponsorJson(deps.db, id), id) });
  });
  const create = createRoute({ method: "post", path: "/sponsors/", tags: ["sponsors"], summary: "Sponsor oluştur",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [staff, limitBodySize(deps.security?.maxBodyBytes), requireJsonBody],
    request: { body: { required: true, content: { "application/json": { schema: schema.sponsorCreateSchema } } } },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 201: { description: "Success", content: { "application/json": { schema: schema.sponsorResponseSchema } } } },
  });
  app.openapi(create, async c => {
    const result = await queries.createSponsor(deps.db, c.req.valid("json"));
    deps.cache.invalidate("sponsors");
    return sendJsonResponse(c, result, { status: 201 });
  });
  const update = createRoute({ method: "put", path: "/sponsors/{sponsor_id}", tags: ["sponsors"], summary: "Sponsor güncelle",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [staff, limitBodySize(deps.security?.maxBodyBytes), requireJsonBody],
    request: { params: schema.sponsorParamsSchema, body: { required: true, content: { "application/json": { schema: schema.sponsorUpdateSchema } } } },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 200: { description: "Success", content: { "application/json": { schema: schema.sponsorResponseSchema } } } },
  });
  app.openapi(update, async c => {
    const result = await queries.updateSponsor(deps.db, c.req.valid("param").sponsor_id, c.req.valid("json"));
    deps.cache.invalidate("sponsors");
    return sendJsonResponse(c, result);
  });
  const remove = createRoute({ method: "delete", path: "/sponsors/{sponsor_id}", tags: ["sponsors"], summary: "Sponsor sil",
    security: [{ OAuth2PasswordBearer: [] }], middleware: [staff, limitBodySize(deps.security?.maxBodyBytes)],
    request: { params: schema.sponsorParamsSchema },
    responses: { 422: { $ref: "#/components/responses/HTTPValidationError" }, 204: { description: "Success" } },
  });
  app.openapi(remove, async c => {
    await queries.deleteSponsor(deps.db, c.req.valid("param").sponsor_id);
    deps.cache.invalidate("sponsors");
    return c.body(null, 204);
  });
}
