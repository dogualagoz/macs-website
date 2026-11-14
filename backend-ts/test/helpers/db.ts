import type { AppDeps } from "../../src/app";
import type { Sql } from "../../src/db/client";

export async function resetDb(sql: Sql): Promise<void> {
  await sql`TRUNCATE TABLE public.assets, public.event_categories, public.events, public.members,
    public.project_categories, public.project_members, public.projects, public.sponsors, public.users
    RESTART IDENTITY CASCADE`;
}

export async function countQueries<T>(deps: AppDeps, fn: () => Promise<T>): Promise<{ result: T; count: number; queries: readonly string[] }> {
  deps.counter.reset();
  const result = await fn();
  return { result, count: deps.counter.count(), queries: deps.counter.queries() };
}
