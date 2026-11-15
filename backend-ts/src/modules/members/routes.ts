import type { AppRouter as Router } from "../../app";
import { z } from "zod";
import type { AppDeps } from "../../app";
import { route } from "../../lib/route";
import * as schema from "./schemas";
import * as service from "./service";

export function registerMemberRoutes(router: Router, deps: AppDeps): void {
  const base = { domain: "members", tag: "members" } as const;
  const publicMember = { ...base, public: true, response: schema.memberResponseSchema } as const;
  const staff = { ...base, auth: ["admin", "moderator"] } as const;
  route(router, deps, { ...publicMember, method: "get", path: "/members", summary: "Üye listesi", query: schema.memberQuerySchema, response: z.array(schema.memberResponseSchema),
    handler: ({ query }) => service.listMembers(deps.db, query) });
  route(router, deps, { ...base, public: true, method: "get", path: "/members/leaderboard", summary: "Üye sıralaması", query: schema.leaderboardQuerySchema, response: z.array(schema.memberWithStatsSchema),
    handler: ({ query }) => service.listLeaderboard(deps.db, query.limit ?? 10) });
  route(router, deps, { ...publicMember, method: "get", path: "/members/:member_id", summary: "Üye detayı", params: schema.memberParamsSchema,
    handler: ({ params }) => service.getMember(deps.db, params.member_id) });
  route(router, deps, { ...base, public: true, method: "get", path: "/members/:member_id/stats", summary: "Üye istatistikleri", params: schema.memberParamsSchema, response: schema.memberWithStatsSchema,
    handler: ({ params }) => service.getMemberStats(deps.db, params.member_id) });
  route(router, deps, { ...base, public: true, method: "get", path: "/members/:member_id/projects", summary: "Üyenin proje üyelikleri", params: schema.memberParamsSchema, response: z.array(schema.projectMemberResponseSchema),
    handler: ({ params }) => service.getMemberProjects(deps.db, params.member_id) });
  route(router, deps, { ...staff, method: "post", path: "/members", summary: "Üye oluştur", body: schema.memberCreateSchema, response: schema.memberResponseSchema, status: 201,
    handler: ({ body }) => service.createMember(deps.db, body) });
  route(router, deps, { ...staff, method: "put", path: "/members/:member_id", summary: "Üye güncelle", params: schema.memberParamsSchema, body: schema.memberUpdateSchema, response: schema.memberResponseSchema,
    handler: ({ params, body }) => service.updateMember(deps.db, params.member_id, body) });
  route(router, deps, { ...staff, method: "delete", path: "/members/:member_id", summary: "Üye sil", params: schema.memberParamsSchema, status: 204,
    handler: ({ params }) => service.deleteMember(deps.db, params.member_id) });
}
