import { pgToUtcIso } from "../../lib/datetime";
import type { MemberRow, MemberStatsRow, ProjectMemberRow } from "./repo";
import type { MemberResponse, MemberWithStats, ProjectMemberResponse } from "./schemas";

export function serializeMember(row: MemberRow): MemberResponse {
  return { full_name: row.fullName, profile_image: row.profileImage, id: row.id, is_active: row.isActive ?? false, created_at: pgToUtcIso(row.createdAt) };
}
export function serializeMemberStats(row: MemberStatsRow): MemberWithStats {
  return { ...serializeMember(row), project_count: row.projectCount, total_contributions: row.totalContributions };
}
export function serializeProjectMember(row: ProjectMemberRow): ProjectMemberResponse {
  return { member_id: row.memberId, role: row.role, contribution_count: row.contributionCount ?? 0, id: row.id, project_id: row.projectId };
}
