import type { AppDeps } from "../app";
import { cacheKey } from "./cache";
import { eventQuerySchema } from "../modules/events/schemas";
import { projectQuerySchema } from "../modules/projects/schemas";
import { memberQuerySchema, leaderboardQuerySchema } from "../modules/members/schemas";
import { sponsorQuerySchema } from "../modules/sponsors/schemas";
import * as events from "../modules/events/queries";
import * as projects from "../modules/projects/queries";
import * as members from "../modules/members/queries";
import * as sponsors from "../modules/sponsors/queries";
export function registerBenchmarkWarmup(deps: Pick<AppDeps, "db" | "cache">): void {
  const eventQuery = eventQuerySchema.parse({ limit: "100" });
  const projectQuery = projectQuerySchema.parse({ limit: "100" });
  const memberQuery = memberQuerySchema.parse({});
  const leaderboardQuery = leaderboardQuerySchema.parse({});
  const sponsorQuery = sponsorQuerySchema.parse({});
  for (const [path, domain, query, load] of [
    ["/events", "events", eventQuery, () => events.listEventsJson(deps.db, eventQuery, false)],
    ["/events/featured", "events", {}, () => events.getFeaturedEventJson(deps.db)],
    ["/projects", "projects", projectQuery, () => projects.listProjectsJson(deps.db, projectQuery, false)],
    ["/projects/featured", "projects", {}, () => projects.getFeaturedProjectJson(deps.db)],
    ["/members/leaderboard", "members", leaderboardQuery, () => members.listLeaderboardJson(deps.db, leaderboardQuery.limit ?? 10)],
    ["/members", "members", memberQuery, () => members.listMembersJson(deps.db, memberQuery)],
    ["/sponsors/", "sponsors", sponsorQuery, () => sponsors.listSponsorsJson(deps.db, sponsorQuery)],
  ] as const) deps.cache.registerWarmup(cacheKey(path, query), domain, async () => {
    const body = await load();
    return body === null ? { status: 404, bodyText: JSON.stringify({ detail: "Öne çıkan proje bulunamadı" }), cacheable: false } : { status: 200, bodyText: body, cacheable: true };
  });
}
