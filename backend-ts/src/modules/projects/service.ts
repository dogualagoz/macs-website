import { sql } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import type { Db, Tx } from "../../db/client";
import type { projects } from "../../db/schema";
import { HttpError } from "../../lib/http-error";
import { createSlug, resolveSlug } from "../../lib/slug";
import * as repo from "./queries";
import type { CategoryCreate, CategoryUpdate, MembershipMutationResponse, ProjectCreate, ProjectMemberInput, ProjectMemberUpdate, ProjectUpdate } from "./schemas";
function serializeMembership(row: repo.MembershipRow): Omit<MembershipMutationResponse, "message"> {
  return { id: row.id, project_id: row.projectId, member_id: row.memberId, role: row.role, contribution_count: row.contributionCount };
}
export function requiredProject(body: string | null): string { if (body === null) throw new HttpError(404, "Proje bulunamadı"); return body; }
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
export async function createProject(db: Db, creatorId: number, input: ProjectCreate, now: Date): Promise<string> {
  return db.transaction(async tx => {
    await validateCategory(tx, input.category_id, 404);
    const base = createSlug(input.title); const slug = resolveSlug(base, await repo.slugExists(tx, base), now);
    if (input.is_featured) await repo.clearFeatured(tx);
    const id = await repo.insertProjectRow(tx, { title: input.title, slug, createdBy: creatorId, description: input.description ?? null, content: input.content ?? null,
      imageUrl: input.image_url ?? null, technologies: input.technologies ?? null, githubUrl: input.github_url ?? null, liveUrl: input.live_url ?? null,
      status: input.status, projectType: input.project_type, categoryId: input.category_id ?? null, teamMembers: input.team_members ?? null,
      startedAt: input.started_at ?? null, completedAt: input.completed_at ?? null, isActive: input.is_active ?? true, isFeatured: input.is_featured ?? false, isDeleted: false });
    if (input.member_ids?.length) await replaceMembers(tx, id, input.member_ids);
    return requiredProject(await repo.getProjectJson(tx, id, { scope: "all", members: "empty" }));
  });
}
export async function updateProject(db: Db, id: number, input: ProjectUpdate, now: Date): Promise<string> {
  return db.transaction(async tx => {
    const current = requiredProject(await repo.getProjectJson(tx, id, { scope: "undeleted", members: "empty" })); await validateCategory(tx, input.category_id, 400);
    // The former serializer rejected null status inside this transaction.
    if (input.status === null) throw new Error("Project status is null");
    const patch = projectPatch(input);
    if (input.title !== undefined && input.title !== (JSON.parse(current) as { title: string }).title) { const base = createSlug(input.title); patch.slug = resolveSlug(base, await repo.slugExists(tx, base, id), now); }
    if (input.is_featured) await repo.clearFeatured(tx, id);
    if (Object.keys(patch).length > 0) await repo.updateProjectRow(tx, id, patch);
    if (input.member_ids !== undefined && input.member_ids !== null) await replaceMembers(tx, id, input.member_ids);
    return requiredProject(await repo.getProjectJson(tx, id, { scope: "all", members: "empty" }));
  });
}
export async function deleteProject(db: Db, id: number): Promise<void> {
  await db.transaction(async tx => { requiredProject(await repo.getProjectJson(tx, id, { scope: "undeleted", members: "empty" })); await repo.updateProjectRow(tx, id, { isDeleted: true }); });
}
export async function hardDeleteProject(db: Db, id: number): Promise<void> {
  await db.transaction(async tx => { requiredProject(await repo.getProjectJson(tx, id, { scope: "all", members: "empty" })); await repo.deleteProjectRow(tx, id); });
}
export async function createProjectCategory(db: Db, input: CategoryCreate): Promise<string> {
  return db.transaction(async tx => {
    if (await repo.categoryNameExists(tx, input.name)) throw new HttpError(400, "Bu isimde bir kategori zaten mevcut");
    const row = await repo.insertCategoryRow(tx, { name: input.name, description: input.description ?? null, icon: input.icon ?? null });
    return requiredProjectCategory(await repo.getProjectCategoryJson(tx, row.id));
  });
}
export async function updateProjectCategory(db: Db, id: number, input: CategoryUpdate): Promise<string> {
  return db.transaction(async tx => {
    const current = requiredCategory(await repo.findCategoryRow(tx, id));
    if (Object.keys(input).length === 0) return requiredProjectCategory(await repo.getProjectCategoryJson(tx, current.id));
    requiredCategory(await repo.updateCategoryRow(tx, id, { name: input.name === null ? sql`NULL` : input.name, description: input.description, icon: input.icon }));
    return requiredProjectCategory(await repo.getProjectCategoryJson(tx, id));
  });
}
export async function deleteProjectCategory(db: Db, id: number): Promise<void> {
  await db.transaction(async tx => { requiredCategory(await repo.findCategoryRow(tx, id)); await repo.clearProjectCategory(tx, id); await repo.deleteCategoryRow(tx, id); });
}
export async function addProjectMember(db: Db, projectId: number, input: ProjectMemberInput): Promise<MembershipMutationResponse> {
  return db.transaction(async tx => {
    requiredProject(await repo.getProjectJson(tx, projectId, { scope: "undeleted", members: "empty" })); await validateMember(tx, input.member_id);
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

export function requiredProjectCategory(body: string | null): string { if (body === null) throw new HttpError(404, "Kategori bulunamadı"); return body; }
