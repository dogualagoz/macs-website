import { sql } from "drizzle-orm";
import type { Db, Tx } from "../../db/client";
import { HttpError } from "../../lib/http-error";
import { sqlBoolFalse, sqlIntZero, sqlUtcIso } from "../../lib/sql-json";
import type { MemberCreate, MemberQuery, MemberUpdate } from "./schemas";

function memberJson(withStats = false) {
  return sql`json_build_object('full_name', m.full_name, 'profile_image', m.profile_image,
    'id', m.id, 'is_active', ${sqlBoolFalse(sql`m.is_active`)}, 'created_at', ${sqlUtcIso(sql`m.created_at`)}
    ${withStats ? sql`, 'project_count', count(pm.id)::int, 'total_contributions', coalesce(sum(pm.contribution_count), 0)::int` : sql``})`;
}
export function requiredMemberJson(body: string | null): string {
  if (body === null) throw new HttpError(404, "Üye bulunamadı");
  return body;
}
export async function listMembersJson(db: Db, query: MemberQuery): Promise<string> {
  const [row] = await db.execute<{ body: string }>(sql`SELECT coalesce(json_agg(q.row_json ORDER BY q.created_at DESC, q.id DESC), '[]'::json)::text AS body
    FROM (SELECT m.id, m.created_at, ${memberJson()} AS row_json FROM members m
      WHERE true ${query.is_active === undefined ? sql`` : sql`AND m.is_active = ${query.is_active}`}
      ${query.search ? sql`AND m.full_name ILIKE ${`%${query.search}%`}` : sql``}
      ORDER BY m.created_at DESC, m.id DESC LIMIT ${query.limit ?? 50} OFFSET ${query.skip ?? 0}) q`);
  if (!row) throw new Error("Member list query returned no row");
  return row.body;
}
export async function listLeaderboardJson(db: Db, limit: number): Promise<string> {
  const [row] = await db.execute<{ body: string }>(sql`SELECT coalesce(json_agg(q.row_json ORDER BY q.project_count DESC, q.total_contributions DESC, q.id ASC), '[]'::json)::text AS body
    FROM (SELECT m.id, count(pm.id) AS project_count, coalesce(sum(pm.contribution_count), 0) AS total_contributions,
      ${memberJson(true)} AS row_json FROM members m
      LEFT JOIN project_members pm ON pm.member_id = m.id
      LEFT JOIN projects p ON p.id = pm.project_id AND p.is_deleted = false AND p.is_active = true
      WHERE m.is_active = true AND (pm.id IS NULL OR p.id IS NOT NULL)
      GROUP BY m.id ORDER BY count(pm.id) DESC, coalesce(sum(pm.contribution_count), 0) DESC, m.id ASC LIMIT ${limit}) q`);
  if (!row) throw new Error("Leaderboard query returned no row");
  return row.body;
}
export async function getMemberJson(db: Db | Tx, id: number): Promise<string | null> {
  const [row] = await db.execute<{ body: string }>(sql`SELECT ${memberJson()}::text AS body FROM members m WHERE m.id = ${id}`);
  return row?.body ?? null;
}
export async function getMemberStatsJson(db: Db, id: number): Promise<string | null> {
  const [row] = await db.execute<{ body: string }>(sql`SELECT ${memberJson(true)}::text AS body FROM members m
    LEFT JOIN project_members pm ON pm.member_id = m.id WHERE m.id = ${id} GROUP BY m.id`);
  return row?.body ?? null;
}
export async function listMemberProjectsJson(db: Db, id: number): Promise<string | null> {
  const [row] = await db.execute<{ body: string }>(sql`SELECT
    (SELECT coalesce(json_agg(json_build_object('member_id', pm.member_id, 'role', pm.role,
      'contribution_count', ${sqlIntZero(sql`pm.contribution_count`)}, 'id', pm.id, 'project_id', pm.project_id) ORDER BY pm.id ASC), '[]'::json)::text
      FROM project_members pm WHERE pm.member_id = m.id) AS body
    FROM members m WHERE m.id = ${id}`);
  return row?.body ?? null;
}
export async function createMember(db: Db, input: MemberCreate): Promise<string> {
  return db.transaction(async tx => {
    const duplicate = await tx.execute(sql`SELECT id FROM members WHERE full_name = ${input.full_name} AND is_active = true LIMIT 1`);
    if (duplicate.length) throw new HttpError(400, `'${input.full_name}' isimli aktif bir üye zaten mevcut`);
    const [row] = await tx.execute<{ body: string }>(sql`INSERT INTO members AS m (full_name, profile_image, is_active)
      VALUES (${input.full_name}, ${input.profile_image ?? null}, true) RETURNING ${memberJson()}::text AS body`);
    if (!row) throw new Error("Member insert returned no row");
    return row.body;
  });
}
export async function updateMember(db: Db, id: number, input: MemberUpdate): Promise<string> {
  return db.transaction(async tx => {
    const current = requiredMemberJson(await getMemberJson(tx, id));
    if (Object.keys(input).length === 0) return current;
    const updates = [sql`updated_at = now()`];
    if (input.full_name !== undefined) updates.push(sql`full_name = ${input.full_name}`);
    if (input.profile_image !== undefined) updates.push(sql`profile_image = ${input.profile_image}`);
    if (input.is_active !== undefined) updates.push(sql`is_active = ${input.is_active}`);
    const [row] = await tx.execute<{ body: string }>(sql`UPDATE members AS m SET ${sql.join(updates, sql`, `)} WHERE m.id = ${id} RETURNING ${memberJson()}::text AS body`);
    return requiredMemberJson(row?.body ?? null);
  });
}
export async function deleteMember(db: Db, id: number): Promise<void> {
  await db.transaction(async tx => {
    const rows = await tx.execute(sql`DELETE FROM members WHERE id = ${id} RETURNING id`);
    requiredMemberJson(rows.length ? "null" : null);
  });
}
