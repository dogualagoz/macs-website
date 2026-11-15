import { and, asc, eq, ne, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import type { Db, Tx } from "../../db/client";
import { members, projectCategories, projectMembers, projects } from "../../db/schema";
import { sqlBoolFalse, sqlNaiveIso, sqlUtcIso } from "../../lib/sql-json";
import type { ProjectQuery } from "./schemas";

export type CategoryRow = typeof projectCategories.$inferSelect;
export type MembershipRow = Pick<typeof projectMembers.$inferSelect, "id" | "projectId" | "memberId" | "role" | "contributionCount">;
export type Visibility = "public" | "undeleted" | "all";
const membershipColumns = { id: projectMembers.id, projectId: projectMembers.projectId, memberId: projectMembers.memberId, role: projectMembers.role, contributionCount: projectMembers.contributionCount };
function visibility(scope: Visibility): SQL {
  return scope === "all" ? sql`true` : sql`p.is_deleted = false ${scope === "public" ? sql`AND p.is_active = true` : sql``}`;
}
function categoryJson() {
  return sql`json_build_object('id', c.id, 'name', c.name, 'description', c.description, 'icon', c.icon,
    'created_at', ${sqlUtcIso(sql`c.created_at`)}, 'updated_at', ${sqlUtcIso(sql`c.updated_at`)})`;
}
function embeddedMembers() {
  return sql`coalesce((SELECT json_agg(json_build_object('id', m.id, 'full_name', m.full_name,
    'profile_image', m.profile_image, 'is_active', ${sqlBoolFalse(sql`m.is_active`)},
    'created_at', ${sqlUtcIso(sql`m.created_at`)}, 'project_role', pm.role) ORDER BY pm.id ASC)
    FROM project_members pm JOIN members m ON m.id = pm.member_id WHERE pm.project_id = p.id), '[]'::json)`;
}
function projectJson(embed: boolean) {
  return sql`json_build_object('id', p.id, 'title', p.title, 'slug', p.slug, 'description', p.description,
    'content', p.content, 'image_url', p.image_url, 'technologies', p.technologies, 'github_url', p.github_url,
    'live_url', p.live_url, 'status', p.status::text, 'project_type', p.project_type::text,
    'category_id', p.category_id, 'team_members', p.team_members,
    'started_at', ${sqlNaiveIso(sql`p.started_at`)}, 'completed_at', ${sqlNaiveIso(sql`p.completed_at`)},
    'is_active', ${sqlBoolFalse(sql`p.is_active`)}, 'is_featured', ${sqlBoolFalse(sql`p.is_featured`)},
    'is_deleted', ${sqlBoolFalse(sql`p.is_deleted`)}, 'created_by', p.created_by,
    'created_at', ${sqlUtcIso(sql`p.created_at`)}, 'updated_at', ${sqlUtcIso(sql`p.updated_at`)},
    'members', ${embed ? embeddedMembers() : sql`'[]'::json`},
    'category', CASE WHEN c.id IS NULL THEN NULL ELSE ${categoryJson()} END)`;
}
const joins = sql`LEFT JOIN project_categories c ON c.id = p.category_id`;
export async function listProjectsJson(db: Db, query: ProjectQuery, admin: boolean): Promise<string> {
  const size = query.limit ?? (admin ? 50 : 10);
  const skip = query.skip ?? 0;
  const [row] = await db.execute<{ body: string }>(sql`WITH filtered AS (
    SELECT p.* FROM projects p WHERE ${visibility(admin ? "undeleted" : "public")}
    ${query.search ? sql`AND p.title ILIKE ${`%${query.search}%`}` : sql``}
    ${query.category_id ? sql`AND p.category_id = ${query.category_id}` : sql``}
    ${query.status ? sql`AND p.status = ${query.status}` : sql``}
  ), paged AS (SELECT * FROM filtered ORDER BY created_at DESC, id DESC LIMIT ${size} OFFSET ${skip}),
  total AS (SELECT count(*)::int AS value FROM filtered)
  SELECT json_build_object('projects', coalesce((SELECT json_agg(${projectJson(true)} ORDER BY p.created_at DESC, p.id DESC)
    FROM paged p ${joins}), '[]'::json), 'total', (SELECT value FROM total),
    'page', ${Math.floor(skip / size) + 1}::bigint, 'size', ${size}::int)::text AS body`);
  if (!row) throw new Error("Project list query returned no row");
  return row.body;
}
export async function getProjectJson(db: Db | Tx, id: number, opts: { scope: Visibility; members: "embed" | "empty" }): Promise<string | null> {
  const [row] = await db.execute<{ body: string }>(sql`SELECT ${projectJson(opts.members === "embed")}::text AS body
    FROM projects p ${joins} WHERE p.id = ${id} AND ${visibility(opts.scope)}`);
  return row?.body ?? null;
}
export async function getProjectBySlugJson(db: Db, slug: string): Promise<string | null> {
  const [row] = await db.execute<{ body: string }>(sql`SELECT ${projectJson(true)}::text AS body FROM projects p ${joins}
    WHERE p.slug = ${slug} AND ${visibility("public")}`);
  return row?.body ?? null;
}
export async function getFeaturedProjectJson(db: Db): Promise<string | null> {
  const [row] = await db.execute<{ body: string }>(sql`WITH candidates AS (
    (SELECT p.id, 1 AS priority FROM projects p WHERE ${visibility("public")} AND p.is_featured = true ORDER BY p.id ASC LIMIT 1)
    UNION ALL
    (SELECT p.id, 2 AS priority FROM projects p WHERE ${visibility("public")} ORDER BY p.created_at DESC, p.id DESC LIMIT 1)
  ) SELECT ${projectJson(true)}::text AS body FROM projects p ${joins}
    WHERE p.id = (SELECT id FROM candidates ORDER BY priority ASC LIMIT 1)`);
  return row?.body ?? null;
}
export async function listProjectCategoriesJson(db: Db): Promise<string> {
  const [row] = await db.execute<{ body: string }>(sql`SELECT coalesce(json_agg(${categoryJson()} ORDER BY c.id ASC), '[]'::json)::text AS body FROM project_categories c`);
  if (!row) throw new Error("Category list query returned no row");
  return row.body;
}
export async function getProjectCategoryJson(db: Db | Tx, id: number): Promise<string | null> {
  const [row] = await db.execute<{ body: string }>(sql`SELECT ${categoryJson()}::text AS body FROM project_categories c WHERE c.id = ${id}`);
  return row?.body ?? null;
}
export async function listProjectMembersJson(db: Db, projectId: number): Promise<string | null> {
  const [row] = await db.execute<{ body: string | null }>(sql`SELECT CASE WHEN EXISTS (
    SELECT 1 FROM projects p WHERE p.id = ${projectId} AND ${visibility("undeleted")}) THEN
    coalesce((SELECT json_agg(json_build_object('id', pm.id, 'project_id', pm.project_id, 'member_id', pm.member_id,
      'role', pm.role, 'contribution_count', pm.contribution_count, 'member', CASE WHEN m.id IS NULL THEN NULL ELSE
      json_build_object('id', m.id, 'full_name', m.full_name, 'profile_image', m.profile_image, 'is_active', m.is_active) END)
      ORDER BY pm.id ASC) FROM project_members pm LEFT JOIN members m ON m.id = pm.member_id
      WHERE pm.project_id = ${projectId}), '[]'::json)::text ELSE NULL END AS body`);
  return row?.body ?? null;
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
