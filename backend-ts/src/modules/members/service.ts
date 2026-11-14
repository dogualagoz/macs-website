import { sql } from "drizzle-orm";
import type { Db } from "../../db/client";
import { HttpError } from "../../lib/http-error";
import * as repo from "./repo";
import type { MemberCreate, MemberQuery, MemberResponse, MemberUpdate, MemberWithStats, ProjectMemberResponse } from "./schemas";
import { serializeMember, serializeMemberStats, serializeProjectMember } from "./serializer";

function requiredMember(row: repo.MemberRow | null): repo.MemberRow {
  if (!row) throw new HttpError(404, "Üye bulunamadı"); return row;
}
export async function listMembers(db: Db, query: MemberQuery): Promise<MemberResponse[]> { return (await repo.listMemberRows(db, query)).map(serializeMember); }
export async function getMember(db: Db, id: number): Promise<MemberResponse> { return serializeMember(requiredMember(await repo.findMemberRow(db, id))); }
export async function getMemberStats(db: Db, id: number): Promise<MemberWithStats> {
  const row = await repo.findMemberStatsRow(db, id); if (!row) throw new HttpError(404, "Üye bulunamadı"); return serializeMemberStats(row);
}
export async function listLeaderboard(db: Db, limit: number): Promise<MemberWithStats[]> { return (await repo.listLeaderboardRows(db, limit)).map(serializeMemberStats); }
export async function getMemberProjects(db: Db, id: number): Promise<ProjectMemberResponse[]> {
  requiredMember(await repo.findMemberRow(db, id)); return (await repo.listMemberProjectRows(db, id)).map(serializeProjectMember);
}
export async function createMember(db: Db, input: MemberCreate): Promise<MemberResponse> {
  return db.transaction(async tx => {
    if (await repo.activeMemberNameExists(tx, input.full_name)) throw new HttpError(400, `'${input.full_name}' isimli aktif bir üye zaten mevcut`);
    return serializeMember(await repo.insertMemberRow(tx, { fullName: input.full_name, profileImage: input.profile_image ?? null, isActive: true }));
  });
}
export async function updateMember(db: Db, id: number, input: MemberUpdate): Promise<MemberResponse> {
  return db.transaction(async tx => {
    const current = requiredMember(await repo.findMemberRow(tx, id));
    if (Object.keys(input).length === 0) return serializeMember(current);
    const row = await repo.updateMemberRow(tx, id, {
      fullName: input.full_name === null ? sql`NULL` : input.full_name, profileImage: input.profile_image, isActive: input.is_active,
    }); return serializeMember(requiredMember(row));
  });
}
export async function deleteMember(db: Db, id: number): Promise<void> {
  await db.transaction(async tx => { requiredMember(await repo.findMemberRow(tx, id)); await repo.deleteMemberRow(tx, id); });
}
