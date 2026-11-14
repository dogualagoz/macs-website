import { z } from "zod";
import { bodyBool, bodyInt, dateTimeIn, pathInt, qInt, qStr } from "../../lib/validation";
import { memberResponseSchema } from "../members/schemas";

export const PROJECT_STATUSES = ["PLANNING", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "CANCELLED"] as const;
export const PROJECT_TYPES = ["DEVELOPED_BY_MACS", "SUPPORTED_BY_MACS", "MEMBER_SHOWCASE"] as const;
export const categoryResponseSchema = z.object({
  name: z.string(), description: z.string().nullable(), icon: z.string().nullable(), id: z.int(),
  created_at: z.string().nullable(), updated_at: z.string().nullable(),
});
export const projectResponseSchema = z.object({
  title: z.string(), description: z.string().nullable(), content: z.string().nullable(), image_url: z.string().nullable(),
  technologies: z.string().nullable(), github_url: z.string().nullable(), live_url: z.string().nullable(),
  status: z.enum(PROJECT_STATUSES), project_type: z.enum(PROJECT_TYPES), category_id: z.int().nullable(), team_members: z.string().nullable(),
  started_at: z.string().nullable(), completed_at: z.string().nullable(), is_active: z.boolean(), is_featured: z.boolean(),
  id: z.int(), slug: z.string(), created_by: z.int(), members: z.array(memberResponseSchema.extend({ project_role: z.string().nullable() })),
  is_deleted: z.boolean(), created_at: z.string().nullable(), updated_at: z.string().nullable(), category: categoryResponseSchema.nullable(),
});
export const projectListResponseSchema = z.object({ projects: z.array(projectResponseSchema), total: z.int(), page: z.int(), size: z.int() });
export const projectMemberResponseSchema = z.object({
  id: z.int(), project_id: z.int(), member_id: z.int(), role: z.string().nullable(), contribution_count: z.int().nullable(),
  member: z.object({ id: z.int(), full_name: z.string(), profile_image: z.string().nullable(), is_active: z.boolean().nullable() }).nullable(),
});
export const membershipMutationResponseSchema = projectMemberResponseSchema.omit({ member: true }).extend({ message: z.string() });
export const projectParamsSchema = z.object({ project_id: pathInt("project_id") });
export const membershipParamsSchema = projectParamsSchema.extend({ member_id: pathInt("member_id") });
export const categoryParamsSchema = z.object({ category_id: pathInt("category_id") });
export const slugParamsSchema = z.object({ slug: z.string() });
const listFields = {
  skip: qInt({ ge: 0, default: 0 }), search: qStr(), category_id: qInt({}),
  status: z.preprocess(value => value === "" ? undefined : value, z.enum(PROJECT_STATUSES).optional()),
};
export const projectQuerySchema = z.object({ ...listFields, limit: qInt({ ge: 1, le: 100, default: 10 }) });
export const adminProjectQuerySchema = z.object({ ...listFields, limit: qInt({ ge: 1, le: 200, default: 50 }) });
export const categoryCreateSchema = z.object({ name: z.string(), description: z.string().nullish(), icon: z.string().nullish() });
export const categoryUpdateSchema = categoryCreateSchema.extend({ name: z.string().nullish() }).partial();
export const projectMemberInputSchema = z.object({ member_id: bodyInt(), role: z.string().nullish() });
export const projectMemberUpdateSchema = z.object({ role: z.string().nullish(), contribution_count: bodyInt().nullish() });
const projectFields = {
  title: z.string(), description: z.string().nullish(), content: z.string().nullish(), image_url: z.string().nullish(),
  technologies: z.string().nullish(), github_url: z.string().nullish(), live_url: z.string().nullish(),
  category_id: bodyInt().nullish(), team_members: z.string().nullish(), started_at: dateTimeIn().nullish(), completed_at: dateTimeIn().nullish(),
  member_ids: z.array(projectMemberInputSchema).nullish(),
};
export const projectCreateSchema = z.object({
  ...projectFields, status: z.enum(PROJECT_STATUSES).default("PLANNING"), project_type: z.enum(PROJECT_TYPES).default("DEVELOPED_BY_MACS"),
  is_active: bodyBool().nullable().default(true), is_featured: bodyBool().nullable().default(false),
});
export const projectUpdateSchema = z.object({
  ...projectFields, status: z.enum(PROJECT_STATUSES).nullable(), project_type: z.enum(PROJECT_TYPES).nullable(), is_active: bodyBool().nullable(), is_featured: bodyBool().nullable(),
}).partial();
export type ProjectResponse = z.infer<typeof projectResponseSchema>;
export type ProjectListResponse = z.infer<typeof projectListResponseSchema>;
export type CategoryResponse = z.infer<typeof categoryResponseSchema>;
export type CategoryCreate = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;
export type ProjectQuery = z.infer<typeof projectQuerySchema>;
export type ProjectCreate = z.infer<typeof projectCreateSchema>;
export type ProjectUpdate = z.infer<typeof projectUpdateSchema>;
export type ProjectMemberInput = z.infer<typeof projectMemberInputSchema>;
export type ProjectMemberUpdate = z.infer<typeof projectMemberUpdateSchema>;
export type ProjectMemberResponse = z.infer<typeof projectMemberResponseSchema>;
export type MembershipMutationResponse = z.infer<typeof membershipMutationResponseSchema>;
