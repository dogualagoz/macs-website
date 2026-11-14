import { and, asc, desc, eq, ilike, isNotNull, isNull, or, sql } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import type { Db, Tx } from "../../db/client";
import { members, projectMembers, projects } from "../../db/schema";
import type { MemberQuery } from "./schemas";

const columns = { id: members.id, fullName: members.fullName, profileImage: members.profileImage, isActive: members.isActive, createdAt: members.createdAt };
export type MemberRow = Pick<typeof members.$inferSelect, keyof typeof columns>;
export type ProjectMemberRow = Pick<typeof projectMembers.$inferSelect, "memberId" | "role" | "contributionCount" | "id" | "projectId">;
export interface MemberStatsRow extends MemberRow { projectCount: number; totalContributions: number }
const stats = { projectCount: sql<number>`count(${projectMembers.id})::int`, totalContributions: sql<number>`coalesce(sum(${projectMembers.contributionCount}), 0)::int` };

export async function listMemberRows(db: Db | Tx, query: MemberQuery): Promise<MemberRow[]> {
  return db.select(columns).from(members).where(and(
    query.is_active === undefined ? undefined : eq(members.isActive, query.is_active),
    query.search ? ilike(members.fullName, `%${query.search}%`) : undefined,
  )).orderBy(desc(members.createdAt), desc(members.id)).offset(query.skip ?? 0).limit(query.limit ?? 50);
}
export async function findMemberRow(db: Db | Tx, id: number): Promise<MemberRow | null> {
  const [row] = await db.select(columns).from(members).where(eq(members.id, id)).limit(1); return row ?? null;
}
export async function activeMemberNameExists(db: Db | Tx, name: string): Promise<boolean> {
  const rows = await db.select({ id: members.id }).from(members).where(and(eq(members.fullName, name), eq(members.isActive, true))).limit(1);
  return rows.length > 0;
}
export async function listLeaderboardRows(db: Db | Tx, limit: number): Promise<MemberStatsRow[]> {
  return db.select({ ...columns, ...stats }).from(members)
    .leftJoin(projectMembers, eq(projectMembers.memberId, members.id))
    .leftJoin(projects, and(eq(projects.id, projectMembers.projectId), eq(projects.isDeleted, false), eq(projects.isActive, true)))
    .where(and(eq(members.isActive, true), or(isNull(projectMembers.id), isNotNull(projects.id))))
    .groupBy(members.id).orderBy(desc(stats.projectCount), desc(stats.totalContributions), asc(members.id)).limit(limit);
}
export async function findMemberStatsRow(db: Db | Tx, id: number): Promise<MemberStatsRow | null> {
  const [row] = await db.select({ ...columns, ...stats }).from(members).leftJoin(projectMembers, eq(projectMembers.memberId, members.id))
    .where(eq(members.id, id)).groupBy(members.id); return row ?? null;
}
export async function listMemberProjectRows(db: Db | Tx, id: number): Promise<ProjectMemberRow[]> {
  return db.select({ memberId: projectMembers.memberId, role: projectMembers.role, contributionCount: projectMembers.contributionCount, id: projectMembers.id, projectId: projectMembers.projectId })
    .from(projectMembers).where(eq(projectMembers.memberId, id)).orderBy(asc(projectMembers.id));
}
export async function insertMemberRow(tx: Tx, values: typeof members.$inferInsert): Promise<MemberRow> {
  const [row] = await tx.insert(members).values(values).returning(columns); if (!row) throw new Error("Member insert returned no row"); return row;
}
export async function updateMemberRow(tx: Tx, id: number, values: PgUpdateSetSource<typeof members>): Promise<MemberRow | null> {
  const [row] = await tx.update(members).set({ ...values, updatedAt: sql`now()` }).where(eq(members.id, id)).returning(columns); return row ?? null;
}
export async function deleteMemberRow(tx: Tx, id: number): Promise<void> { await tx.delete(members).where(eq(members.id, id)); }
