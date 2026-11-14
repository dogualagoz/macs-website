import { and, asc, desc, eq, getTableColumns, ilike, ne, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import type { Db, Tx } from "../../db/client";
import { members, projectCategories, projectMembers, projects } from "../../db/schema";
import type { ProjectQuery } from "./schemas";

export type CategoryRow = typeof projectCategories.$inferSelect;
export type MembershipRow = Pick<typeof projectMembers.$inferSelect, "id" | "projectId" | "memberId" | "role" | "contributionCount">;
export interface EmbeddedMember {
  id: number; full_name: string; profile_image: string | null; is_active: boolean | null; created_at: string | null; project_role: string | null;
}
export interface ProjectRow { project: typeof projects.$inferSelect; category: CategoryRow | null; members: EmbeddedMember[] }
export interface ProjectMembershipRow { membership: MembershipRow; member: Pick<typeof members.$inferSelect, "id" | "fullName" | "profileImage" | "isActive"> | null }
export type Visibility = "public" | "undeleted" | "all";
const columns = {
  // Text projections avoid postgres.js lazy enum-type discovery on the first read.
  project: { ...getTableColumns(projects), status: sql<typeof projects.$inferSelect.status>`${projects.status}::text`, projectType: sql<typeof projects.$inferSelect.projectType>`${projects.projectType}::text` },
  category: getTableColumns(projectCategories),
  members: sql<EmbeddedMember[]>`coalesce((SELECT json_agg(json_build_object(
    'id', m.id, 'full_name', m.full_name, 'profile_image', m.profile_image, 'is_active', m.is_active,
    'created_at', m.created_at, 'project_role', pm.role) ORDER BY pm.id)
    FROM project_members pm JOIN members m ON m.id = pm.member_id WHERE pm.project_id = ${projects.id}), '[]'::json)`,
};
const membershipColumns = { id: projectMembers.id, projectId: projectMembers.projectId, memberId: projectMembers.memberId, role: projectMembers.role, contributionCount: projectMembers.contributionCount };
function joined(db: Db | Tx) { return db.select(columns).from(projects).leftJoin(projectCategories, eq(projects.categoryId, projectCategories.id)); }
function visibility(scope: Visibility): SQL | undefined {
  return scope === "all" ? undefined : and(eq(projects.isDeleted, false), scope === "public" ? eq(projects.isActive, true) : undefined);
}
function listFilter(query: ProjectQuery, admin: boolean): SQL | undefined {
  return and(visibility(admin ? "undeleted" : "public"), query.search ? ilike(projects.title, `%${query.search}%`) : undefined,
    query.category_id ? eq(projects.categoryId, query.category_id) : undefined, query.status ? eq(projects.status, query.status) : undefined);
}
export async function listProjectRows(db: Db | Tx, query: ProjectQuery, admin: boolean): Promise<ProjectRow[]> {
  return joined(db).where(listFilter(query, admin)).orderBy(desc(projects.createdAt), desc(projects.id)).offset(query.skip ?? 0).limit(query.limit ?? (admin ? 50 : 10));
}
export async function countProjectRows(db: Db | Tx, query: ProjectQuery, admin: boolean): Promise<number> {
  const [row] = await db.select({ total: sql<number>`count(*)::int` }).from(projects).where(listFilter(query, admin)); return row?.total ?? 0;
}
export async function findProjectRow(db: Db | Tx, id: number, scope: Visibility = "public"): Promise<ProjectRow | null> {
  const [row] = await joined(db).where(and(eq(projects.id, id), visibility(scope))).limit(1); return row ?? null;
}
export async function findProjectBySlug(db: Db | Tx, slug: string): Promise<ProjectRow | null> {
  const [row] = await joined(db).where(and(eq(projects.slug, slug), visibility("public"))).limit(1); return row ?? null;
}
export async function findFeaturedRow(db: Db | Tx): Promise<ProjectRow | null> {
  const [row] = await joined(db).where(and(visibility("public"), eq(projects.isFeatured, true))).orderBy(asc(projects.id)).limit(1); return row ?? null;
}
export async function findNewestRow(db: Db | Tx): Promise<ProjectRow | null> {
  const [row] = await joined(db).where(visibility("public")).orderBy(desc(projects.createdAt), desc(projects.id)).limit(1); return row ?? null;
}
export async function slugExists(db: Db | Tx, slug: string, exceptId?: number): Promise<boolean> {
  const rows = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.slug, slug), exceptId === undefined ? undefined : ne(projects.id, exceptId))).limit(1); return rows.length > 0;
}
export async function clearFeatured(tx: Tx, exceptId?: number): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(734125, 9)`);
  await tx.update(projects).set({ isFeatured: false, updatedAt: sql`now()` }).where(and(eq(projects.isFeatured, true), exceptId === undefined ? undefined : ne(projects.id, exceptId)));
}
export async function insertProjectRow(tx: Tx, values: typeof projects.$inferInsert): Promise<number> {
  const [row] = await tx.insert(projects).values(values).returning({ id: projects.id }); if (!row) throw new Error("Project insert returned no row"); return row.id;
}
export async function updateProjectRow(tx: Tx, id: number, values: PgUpdateSetSource<typeof projects>): Promise<void> {
  await tx.update(projects).set({ ...values, updatedAt: sql`now()` }).where(eq(projects.id, id));
}
export async function deleteProjectRow(tx: Tx, id: number): Promise<void> { await tx.delete(projects).where(eq(projects.id, id)); }
export async function listCategoryRows(db: Db | Tx): Promise<CategoryRow[]> { return db.select().from(projectCategories).orderBy(asc(projectCategories.id)); }
export async function findCategoryRow(db: Db | Tx, id: number): Promise<CategoryRow | null> {
  const [row] = await db.select().from(projectCategories).where(eq(projectCategories.id, id)).limit(1); return row ?? null;
}
export async function categoryNameExists(db: Db | Tx, name: string): Promise<boolean> {
  const rows = await db.select({ id: projectCategories.id }).from(projectCategories).where(eq(projectCategories.name, name)).limit(1); return rows.length > 0;
}
export async function insertCategoryRow(tx: Tx, values: typeof projectCategories.$inferInsert): Promise<CategoryRow> {
  const [row] = await tx.insert(projectCategories).values(values).returning(); if (!row) throw new Error("Category insert returned no row"); return row;
}
export async function updateCategoryRow(tx: Tx, id: number, values: PgUpdateSetSource<typeof projectCategories>): Promise<CategoryRow | null> {
  const [row] = await tx.update(projectCategories).set({ ...values, updatedAt: sql`now()` }).where(eq(projectCategories.id, id)).returning(); return row ?? null;
}
export async function clearProjectCategory(tx: Tx, id: number): Promise<void> { await tx.update(projects).set({ categoryId: null, updatedAt: sql`now()` }).where(eq(projects.categoryId, id)); }
export async function deleteCategoryRow(tx: Tx, id: number): Promise<void> { await tx.delete(projectCategories).where(eq(projectCategories.id, id)); }
export async function memberExists(db: Db | Tx, id: number): Promise<boolean> {
  const rows = await db.select({ id: members.id }).from(members).where(eq(members.id, id)).limit(1); return rows.length > 0;
}
export async function projectExists(db: Db | Tx, id: number): Promise<boolean> {
  const rows = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, id), visibility("undeleted"))).limit(1); return rows.length > 0;
}
export async function listMembershipRows(db: Db | Tx, projectId: number): Promise<ProjectMembershipRow[]> {
  return db.select({ membership: membershipColumns, member: { id: members.id, fullName: members.fullName, profileImage: members.profileImage, isActive: members.isActive } })
    .from(projectMembers).leftJoin(members, eq(members.id, projectMembers.memberId)).where(eq(projectMembers.projectId, projectId)).orderBy(asc(projectMembers.id));
}
export async function findMembershipRow(db: Db | Tx, projectId: number, memberId: number): Promise<MembershipRow | null> {
  const [row] = await db.select(membershipColumns).from(projectMembers).where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.memberId, memberId))).orderBy(asc(projectMembers.id)).limit(1); return row ?? null;
}
export async function insertMembershipRow(tx: Tx, projectId: number, memberId: number, role: string | null): Promise<MembershipRow> {
  const [row] = await tx.insert(projectMembers).values({ projectId, memberId, role, contributionCount: 1 }).returning(membershipColumns); if (!row) throw new Error("Project membership insert returned no row"); return row;
}
export async function updateMembershipRow(tx: Tx, id: number, values: PgUpdateSetSource<typeof projectMembers>): Promise<MembershipRow | null> {
  const [row] = await tx.update(projectMembers).set(values).where(eq(projectMembers.id, id)).returning(membershipColumns); return row ?? null;
}
export async function deleteMembershipRow(tx: Tx, id: number): Promise<void> { await tx.delete(projectMembers).where(eq(projectMembers.id, id)); }
export async function clearMemberships(tx: Tx, projectId: number): Promise<void> { await tx.delete(projectMembers).where(eq(projectMembers.projectId, projectId)); }
