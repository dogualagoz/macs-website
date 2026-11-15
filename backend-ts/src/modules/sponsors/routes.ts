import type { AppRouter as Router } from "../../app";
import { z } from "zod";
import type { AppDeps } from "../../app";
import { route } from "../../lib/route";
import { perMinute } from "../../middleware/rate-limit";
import * as schema from "./schemas";
import * as service from "./service";

export function registerSponsorRoutes(router: Router, deps: AppDeps): void {
  const base = { domain: "sponsors", tag: "sponsors" } as const;
  const publicSponsor = { ...base, public: true, response: schema.sponsorResponseSchema } as const;
  const staff = { ...base, auth: ["admin", "moderator"] } as const;
  route(router, deps, { ...publicSponsor, method: "get", path: "/sponsors/", summary: "Sponsor listesi", query: schema.sponsorQuerySchema, response: z.array(schema.sponsorResponseSchema),
    handler: ({ query }) => service.listSponsors(deps.db, query) });
  route(router, deps, { ...base, public: true, method: "get", path: "/sponsors/categories", summary: "Sponsor kategorileri", response: z.array(z.string()),
    handler: () => service.listSponsorCategories(deps.db) });
  route(router, deps, { ...staff, method: "post", path: "/sponsors/geocode", summary: "Adres koordinatları", body: schema.geocodeRequestSchema, response: schema.geocodeResponseSchema, rateLimit: perMinute(10),
    handler: ({ body }) => service.geocodeAddress(body.address, deps.fetchImpl ?? fetch, deps.env.NOMINATIM_USER_AGENT, deps.logger) });
  route(router, deps, { ...publicSponsor, method: "get", path: "/sponsors/:sponsor_id", summary: "Sponsor detayı", params: schema.sponsorParamsSchema,
    handler: ({ params }) => service.getSponsor(deps.db, params.sponsor_id) });
  route(router, deps, { ...staff, method: "post", path: "/sponsors/", summary: "Sponsor oluştur", body: schema.sponsorCreateSchema, response: schema.sponsorResponseSchema, status: 201,
    handler: ({ body }) => service.createSponsor(deps.db, body) });
  route(router, deps, { ...staff, method: "put", path: "/sponsors/:sponsor_id", summary: "Sponsor güncelle", params: schema.sponsorParamsSchema, body: schema.sponsorUpdateSchema, response: schema.sponsorResponseSchema,
    handler: ({ params, body }) => service.updateSponsor(deps.db, params.sponsor_id, body) });
  route(router, deps, { ...staff, method: "delete", path: "/sponsors/:sponsor_id", summary: "Sponsor sil", params: schema.sponsorParamsSchema, status: 204,
    handler: ({ params }) => service.deleteSponsor(deps.db, params.sponsor_id) });
}
