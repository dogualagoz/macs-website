import type { Router } from "express";
import { z } from "zod";
import type { AppDeps } from "../../app";
import { route } from "../../lib/route";
import * as schema from "./schemas";
import * as service from "./service";

export function registerProjectRoutes(router: Router, deps: AppDeps): void {
  const base = { domain: "projects", tag: "projects" } as const;
  const publicProject = { ...base, public: true, response: schema.projectResponseSchema } as const;
  const staff = { ...base, auth: ["admin", "moderator"] } as const;
  const category = { ...base, response: schema.categoryResponseSchema } as const;
  const now = () => deps.now?.() ?? new Date();
  route(router, deps, { ...category, public: true, method: "get", path: "/projects/categories", summary: "Proje kategorileri", response: z.array(schema.categoryResponseSchema),
    handler: () => service.listProjectCategories(deps.db) });
  route(router, deps, { ...category, ...staff, method: "post", path: "/projects/categories", summary: "Kategori oluştur", status: 201, body: schema.categoryCreateSchema,
    handler: ({ body }) => service.createProjectCategory(deps.db, body) });
  route(router, deps, { ...category, public: true, method: "get", path: "/projects/categories/:category_id", summary: "Kategori detayı", params: schema.categoryParamsSchema,
    handler: ({ params }) => service.getProjectCategory(deps.db, params.category_id) });
  route(router, deps, { ...category, ...staff, method: "put", path: "/projects/categories/:category_id", summary: "Kategori güncelle", params: schema.categoryParamsSchema, body: schema.categoryUpdateSchema,
    handler: ({ params, body }) => service.updateProjectCategory(deps.db, params.category_id, body) });
  route(router, deps, { ...staff, method: "delete", path: "/projects/categories/:category_id", summary: "Kategori sil", params: schema.categoryParamsSchema, status: 204,
    handler: ({ params }) => service.deleteProjectCategory(deps.db, params.category_id) });
  route(router, deps, { ...publicProject, method: "get", path: "/projects", summary: "Proje listesi", query: schema.projectQuerySchema, response: schema.projectListResponseSchema,
    handler: ({ query }) => service.listProjects(deps.db, query) });
  route(router, deps, { ...staff, method: "get", path: "/projects/admin", summary: "Yönetici proje listesi", query: schema.adminProjectQuerySchema, response: schema.projectListResponseSchema,
    handler: ({ query }) => service.listProjects(deps.db, query, true) });
  route(router, deps, { ...publicProject, method: "get", path: "/projects/featured", summary: "Öne çıkan proje", handler: () => service.getFeaturedProject(deps.db) });
  route(router, deps, { ...publicProject, method: "get", path: "/projects/by-slug/:slug", summary: "Slug ile proje", params: schema.slugParamsSchema,
    handler: ({ params }) => service.getProjectBySlug(deps.db, params.slug) });
  route(router, deps, { ...staff, method: "post", path: "/projects", summary: "Proje oluştur", status: 201, body: schema.projectCreateSchema, response: schema.projectResponseSchema,
    handler: ({ user, body }) => {
      if (!user) throw new Error("Protected handler requires authenticated user");
      return service.createProject(deps.db, user.id, body, now());
    } });
  route(router, deps, { ...publicProject, method: "get", path: "/projects/:project_id", summary: "Proje detayı", params: schema.projectParamsSchema,
    handler: ({ params }) => service.getProject(deps.db, params.project_id) });
  route(router, deps, { ...staff, method: "put", path: "/projects/:project_id", summary: "Proje güncelle", params: schema.projectParamsSchema, body: schema.projectUpdateSchema, response: schema.projectResponseSchema,
    handler: ({ params, body }) => service.updateProject(deps.db, params.project_id, body, now()) });
  route(router, deps, { ...staff, method: "delete", path: "/projects/:project_id", summary: "Projeyi arşivle", params: schema.projectParamsSchema, status: 204,
    handler: ({ params }) => service.deleteProject(deps.db, params.project_id) });
  route(router, deps, { ...base, auth: ["admin"], method: "delete", path: "/projects/:project_id/hard", summary: "Projeyi kalıcı sil", params: schema.projectParamsSchema, status: 204,
    handler: ({ params }) => service.hardDeleteProject(deps.db, params.project_id) });
  route(router, deps, { ...base, public: true, method: "get", path: "/projects/:project_id/members", summary: "Proje üyeleri", params: schema.projectParamsSchema, response: z.array(schema.projectMemberResponseSchema),
    handler: ({ params }) => service.listProjectMembers(deps.db, params.project_id) });
  route(router, deps, { ...staff, method: "post", path: "/projects/:project_id/members", summary: "Projeye üye ekle", status: 201, params: schema.projectParamsSchema, body: schema.projectMemberInputSchema, response: schema.membershipMutationResponseSchema,
    handler: ({ params, body }) => service.addProjectMember(deps.db, params.project_id, body) });
  route(router, deps, { ...staff, method: "put", path: "/projects/:project_id/members/:member_id", summary: "Proje üyesini güncelle", params: schema.membershipParamsSchema, body: schema.projectMemberUpdateSchema, response: schema.membershipMutationResponseSchema,
    handler: ({ params, body }) => service.updateProjectMember(deps.db, params.project_id, params.member_id, body) });
  route(router, deps, { ...staff, method: "delete", path: "/projects/:project_id/members/:member_id", summary: "Proje üyesini çıkar", params: schema.membershipParamsSchema, status: 204,
    handler: ({ params }) => service.removeProjectMember(deps.db, params.project_id, params.member_id) });
}
