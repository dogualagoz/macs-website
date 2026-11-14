import { sql } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import type { Db, Tx } from "../../db/client";
import type { projects } from "../../db/schema";
import { HttpError } from "../../lib/http-error";
import { createSlug, resolveSlug } from "../../lib/slug";
import * as repo from "./repo";
import type { CategoryCreate, CategoryResponse, CategoryUpdate, MembershipMutationResponse, ProjectCreate, ProjectListResponse, ProjectMemberInput, ProjectMemberResponse, ProjectMemberUpdate, ProjectQuery, ProjectResponse, ProjectUpdate } from "./schemas";
import { serializeMembership, serializeProject, serializeProjectCategory, serializeProjectMembership } from "./serializer";

function requiredProject(row: repo.ProjectRow | null): repo.ProjectRow { if (!row) throw new HttpError(404, "Proje bulunamadı"); return row; }
function requiredCategory(row: repo.CategoryRow | null): repo.CategoryRow { if (!row) throw new HttpError(404, "Kategori bulunamadı"); return row; }
function requiredMembership(row: repo.MembershipRow | null): repo.MembershipRow { if (!row) throw new HttpError(404, "Bu member bu projede bulunamadı"); return row; }
async function validateCategory(tx: Tx, categoryId: number | null | undefined, status: number): Promise<void> {
  if (categoryId && !await repo.findCategoryRow(tx, categoryId)) throw new HttpError(status, "Belirtilen kategori bulunamadı");
}
async function validateMember(tx: Tx, memberId: number): Promise<void> { if (!await repo.memberExists(tx, memberId)) throw new HttpError(404, `Member ID ${String(memberId)} bulunamadı`); }
async function replaceMembers(tx: Tx, projectId: number, members: ProjectMemberInput[]): Promise<void> {
  await repo.clearMemberships(tx, projectId);
  for (const member of members) { await validateMember(tx, member.member_id); await repo.insertMembershipRow(tx, projectId, member.member_id, member.role ?? null); }
}
function projectPatch(input: ProjectUpdate): PgUpdateSetSource<typeof projects> {
  return {
    ...(input.title === undefined ? {} : { title: input.title }), ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.content === undefined ? {} : { content: input.content }), ...(input.image_url === undefined ? {} : { imageUrl: input.image_url }),
    ...(input.technologies === undefined ? {} : { technologies: input.technologies }), ...(input.github_url === undefined ? {} : { githubUrl: input.github_url }),
    ...(input.live_url === undefined ? {} : { liveUrl: input.live_url }), ...(input.status === undefined ? {} : { status: input.status }),
    ...(input.project_type === undefined ? {} : { projectType: input.project_type === null ? sql`NULL` : input.project_type }),
    ...(input.category_id === undefined ? {} : { categoryId: input.category_id }), ...(input.team_members === undefined ? {} : { teamMembers: input.team_members }),
    ...(input.started_at === undefined ? {} : { startedAt: input.started_at }), ...(input.completed_at === undefined ? {} : { completedAt: input.completed_at }),
    ...(input.is_active === undefined ? {} : { isActive: input.is_active }), ...(input.is_featured === undefined ? {} : { isFeatured: input.is_featured }),
  };
}
export async function listProjects(db: Db, query: ProjectQuery, admin = false): Promise<ProjectListResponse> {
  const rows = await repo.listProjectRows(db, query, admin); const total = await repo.countProjectRows(db, query, admin);
  const size = query.limit ?? (admin ? 50 : 10);
  return { projects: rows.map(row => serializeProject(row, { members: "embed" })), total, page: Math.floor((query.skip ?? 0) / size) + 1, size };
}
export async function getProject(db: Db, id: number): Promise<ProjectResponse> { return serializeProject(requiredProject(await repo.findProjectRow(db, id)), { members: "embed" }); }
export async function getProjectBySlug(db: Db, slug: string): Promise<ProjectResponse> { return serializeProject(requiredProject(await repo.findProjectBySlug(db, slug)), { members: "embed" }); }
export async function getFeaturedProject(db: Db): Promise<ProjectResponse> {
  const row = await repo.findFeaturedRow(db) ?? await repo.findNewestRow(db); if (!row) throw new HttpError(404, "Öne çıkan proje bulunamadı"); return serializeProject(row, { members: "embed" });
}
export async function createProject(db: Db, creatorId: number, input: ProjectCreate, now: Date): Promise<ProjectResponse> {
  return db.transaction(async tx => {
    await validateCategory(tx, input.category_id, 404);
    const base = createSlug(input.title); const slug = resolveSlug(base, await repo.slugExists(tx, base), now);
    if (input.is_featured) await repo.clearFeatured(tx);
    const id = await repo.insertProjectRow(tx, { title: input.title, slug, createdBy: creatorId, description: input.description ?? null, content: input.content ?? null,
      imageUrl: input.image_url ?? null, technologies: input.technologies ?? null, githubUrl: input.github_url ?? null, liveUrl: input.live_url ?? null,
      status: input.status, projectType: input.project_type, categoryId: input.category_id ?? null, teamMembers: input.team_members ?? null,
      startedAt: input.started_at ?? null, completedAt: input.completed_at ?? null, isActive: input.is_active ?? true, isFeatured: input.is_featured ?? false, isDeleted: false });
    if (input.member_ids?.length) await replaceMembers(tx, id, input.member_ids);
    return serializeProject(requiredProject(await repo.findProjectRow(tx, id, "all")), { members: "empty" });
  });
}
export async function updateProject(db: Db, id: number, input: ProjectUpdate, now: Date): Promise<ProjectResponse> {
  return db.transaction(async tx => {
    const current = requiredProject(await repo.findProjectRow(tx, id, "undeleted")); await validateCategory(tx, input.category_id, 400);
    const patch = projectPatch(input);
    if (input.title !== undefined && input.title !== current.project.title) { const base = createSlug(input.title); patch.slug = resolveSlug(base, await repo.slugExists(tx, base, id), now); }
    if (input.is_featured) await repo.clearFeatured(tx, id);
    if (Object.keys(patch).length > 0) await repo.updateProjectRow(tx, id, patch);
    if (input.member_ids !== undefined && input.member_ids !== null) await replaceMembers(tx, id, input.member_ids);
    return serializeProject(requiredProject(await repo.findProjectRow(tx, id, "all")), { members: "empty" });
  });
}
export async function deleteProject(db: Db, id: number): Promise<void> {
  await db.transaction(async tx => { requiredProject(await repo.findProjectRow(tx, id, "undeleted")); await repo.updateProjectRow(tx, id, { isDeleted: true }); });
}
export async function hardDeleteProject(db: Db, id: number): Promise<void> {
  await db.transaction(async tx => { requiredProject(await repo.findProjectRow(tx, id, "all")); await repo.deleteProjectRow(tx, id); });
}
export async function listProjectCategories(db: Db): Promise<CategoryResponse[]> { return (await repo.listCategoryRows(db)).map(serializeProjectCategory); }
export async function getProjectCategory(db: Db, id: number): Promise<CategoryResponse> { return serializeProjectCategory(requiredCategory(await repo.findCategoryRow(db, id))); }
export async function createProjectCategory(db: Db, input: CategoryCreate): Promise<CategoryResponse> {
  return db.transaction(async tx => {
    if (await repo.categoryNameExists(tx, input.name)) throw new HttpError(400, "Bu isimde bir kategori zaten mevcut");
    return serializeProjectCategory(await repo.insertCategoryRow(tx, { name: input.name, description: input.description ?? null, icon: input.icon ?? null }));
  });
}
export async function updateProjectCategory(db: Db, id: number, input: CategoryUpdate): Promise<CategoryResponse> {
  return db.transaction(async tx => {
    const current = requiredCategory(await repo.findCategoryRow(tx, id));
    if (Object.keys(input).length === 0) return serializeProjectCategory(current);
    return serializeProjectCategory(requiredCategory(await repo.updateCategoryRow(tx, id, { name: input.name === null ? sql`NULL` : input.name, description: input.description, icon: input.icon })));
  });
}
export async function deleteProjectCategory(db: Db, id: number): Promise<void> {
  await db.transaction(async tx => { requiredCategory(await repo.findCategoryRow(tx, id)); await repo.clearProjectCategory(tx, id); await repo.deleteCategoryRow(tx, id); });
}
export async function listProjectMembers(db: Db, id: number): Promise<ProjectMemberResponse[]> {
  if (!await repo.projectExists(db, id)) throw new HttpError(404, "Proje bulunamadı");
  return (await repo.listMembershipRows(db, id)).map(serializeProjectMembership);
}
export async function addProjectMember(db: Db, projectId: number, input: ProjectMemberInput): Promise<MembershipMutationResponse> {
  return db.transaction(async tx => {
    requiredProject(await repo.findProjectRow(tx, projectId, "undeleted")); await validateMember(tx, input.member_id);
    if (await repo.findMembershipRow(tx, projectId, input.member_id)) throw new HttpError(400, "Bu member zaten projeye ekli");
    return { ...serializeMembership(await repo.insertMembershipRow(tx, projectId, input.member_id, input.role ?? null)), message: "Member başarıyla projeye eklendi" };
  });
}
export async function updateProjectMember(db: Db, projectId: number, memberId: number, input: ProjectMemberUpdate): Promise<MembershipMutationResponse> {
  return db.transaction(async tx => {
    let row = requiredMembership(await repo.findMembershipRow(tx, projectId, memberId));
    if (input.role != null || input.contribution_count != null) row = requiredMembership(await repo.updateMembershipRow(tx, row.id, {
      ...(input.role == null ? {} : { role: input.role }), ...(input.contribution_count == null ? {} : { contributionCount: input.contribution_count }),
    }));
    return { ...serializeMembership(row), message: "Member bilgileri güncellendi" };
  });
}
export async function removeProjectMember(db: Db, projectId: number, memberId: number): Promise<void> {
  await db.transaction(async tx => { const row = requiredMembership(await repo.findMembershipRow(tx, projectId, memberId)); await repo.deleteMembershipRow(tx, row.id); });
}
