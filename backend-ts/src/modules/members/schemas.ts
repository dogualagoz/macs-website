import { z } from "zod";
import { bodyBool, pathInt, qBool, qInt, qStr } from "../../lib/validation";

export const memberResponseSchema = z.object({
  full_name: z.string(), profile_image: z.string().nullable(), id: z.int(), is_active: z.boolean(), created_at: z.string().nullable(),
});
export const memberWithStatsSchema = memberResponseSchema.extend({ project_count: z.int(), total_contributions: z.int() });
export const projectMemberResponseSchema = z.object({ member_id: z.int(), role: z.string().nullable(), contribution_count: z.int(), id: z.int(), project_id: z.int() });
export const memberParamsSchema = z.object({ member_id: pathInt("member_id") });
export const memberQuerySchema = z.object({ skip: qInt({ ge: 0, default: 0 }), limit: qInt({ ge: 1, le: 200, default: 50 }), search: qStr(), is_active: qBool({}) });
export const leaderboardQuerySchema = z.object({ limit: qInt({ ge: 1, le: 100, default: 10 }) });
export const memberCreateSchema = z.object({ full_name: z.string(), profile_image: z.string().nullish() });
export const memberUpdateSchema = z.object({ full_name: z.string().nullish(), profile_image: z.string().nullish(), is_active: bodyBool().nullish() });
export type MemberResponse = z.infer<typeof memberResponseSchema>;
export type MemberWithStats = z.infer<typeof memberWithStatsSchema>;
export type ProjectMemberResponse = z.infer<typeof projectMemberResponseSchema>;
export type MemberQuery = z.infer<typeof memberQuerySchema>;
export type MemberCreate = z.infer<typeof memberCreateSchema>;
export type MemberUpdate = z.infer<typeof memberUpdateSchema>;
