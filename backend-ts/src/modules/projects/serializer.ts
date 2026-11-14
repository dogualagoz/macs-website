import { pgToNaiveIso, pgToUtcIso } from "../../lib/datetime";
import { serializeMember } from "../members/serializer";
import type { CategoryRow, MembershipRow, ProjectMembershipRow, ProjectRow } from "./repo";
import type { CategoryResponse, MembershipMutationResponse, ProjectMemberResponse, ProjectResponse } from "./schemas";

export function serializeProjectCategory(row: CategoryRow): CategoryResponse {
  return { id: row.id, name: row.name, description: row.description, icon: row.icon, created_at: pgToUtcIso(row.createdAt), updated_at: pgToUtcIso(row.updatedAt) };
}
export function serializeProject(row: ProjectRow, opts: { members: "embed" | "empty" }): ProjectResponse {
  const project = row.project;
  if (project.status === null) throw new Error("Project status is null");
  return {
    title: project.title, description: project.description, content: project.content, image_url: project.imageUrl, technologies: project.technologies,
    github_url: project.githubUrl, live_url: project.liveUrl, status: project.status, project_type: project.projectType, category_id: project.categoryId,
    team_members: project.teamMembers, started_at: pgToNaiveIso(project.startedAt), completed_at: pgToNaiveIso(project.completedAt),
    is_active: project.isActive ?? false, is_featured: project.isFeatured ?? false, id: project.id, slug: project.slug, created_by: project.createdBy,
    members: opts.members === "empty" ? [] : row.members.map(member => ({
      ...serializeMember({ id: member.id, fullName: member.full_name, profileImage: member.profile_image, isActive: member.is_active, createdAt: member.created_at }), project_role: member.project_role,
    })), is_deleted: project.isDeleted ?? false, created_at: pgToUtcIso(project.createdAt), updated_at: pgToUtcIso(project.updatedAt),
    category: row.category ? serializeProjectCategory(row.category) : null,
  };
}
export function serializeMembership(row: MembershipRow): Omit<MembershipMutationResponse, "message"> {
  return { id: row.id, project_id: row.projectId, member_id: row.memberId, role: row.role, contribution_count: row.contributionCount };
}
export function serializeProjectMembership(row: ProjectMembershipRow): ProjectMemberResponse {
  return { ...serializeMembership(row.membership), member: row.member ? { id: row.member.id, full_name: row.member.fullName, profile_image: row.member.profileImage, is_active: row.member.isActive } : null };
}
