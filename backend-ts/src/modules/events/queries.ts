import { and, eq, ne, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import type { Db, Tx } from "../../db/client";
import { eventCategories, events } from "../../db/schema";
import { sqlBoolFalse, sqlIntZero, sqlNaiveIso, sqlUtcIso } from "../../lib/sql-json";
import { USER_PUBLIC_COLUMNS as u } from "../users/queries";
import type { EventQuery } from "./schemas";

export type CategoryRow = typeof eventCategories.$inferSelect;
export type Visibility = "public" | "undeleted" | "all";
function visibility(scope: Visibility): SQL {
  return scope === "all" ? sql`true` : sql`e.is_deleted = false ${scope === "public" ? sql`AND e.is_active = true` : sql``}`;
}
function categoryJson() {
  return sql`json_build_object('id', c.id, 'name', c.name, 'description', c.description,
    'created_at', ${sqlUtcIso(sql`c.created_at`)}, 'updated_at', ${sqlUtcIso(sql`c.updated_at`)})`;
}
function eventJson() {
  return sql`json_build_object('id', e.id, 'title', e.title, 'slug', e.slug,
    'description', e.description, 'content', e.content, 'image_url', e.image_url,
    'location', e.location, 'registration_link', e.registration_link, 'directions_link', e.directions_link,
    'start_time', ${sqlNaiveIso(sql`e.start_time`)}, 'end_time', ${sqlNaiveIso(sql`e.end_time`)},
    'category_id', e.category_id, 'created_by', e.created_by,
    'is_active', ${sqlBoolFalse(sql`e.is_active`)}, 'is_featured', ${sqlBoolFalse(sql`e.is_featured`)},
    'is_deleted', ${sqlBoolFalse(sql`e.is_deleted`)},
    'created_at', ${sqlUtcIso(sql`e.created_at`)}, 'updated_at', ${sqlUtcIso(sql`e.updated_at`)},
    'creator', CASE WHEN ${u.id} IS NULL THEN NULL ELSE json_build_object(
      'id', ${u.id}, 'email', ${u.email}, 'full_name', ${u.full_name}, 'role', ${u.role}, 'status', ${u.status},
      'is_active', ${sqlBoolFalse(u.is_active)}, 'last_login', ${sqlUtcIso(u.last_login)},
      'failed_login_attempts', ${sqlIntZero(u.failed_login_attempts)},
      'password_changed_at', ${sqlUtcIso(u.password_changed_at)}) END,
    'category', CASE WHEN c.id IS NULL THEN NULL ELSE ${categoryJson()} END)`;
}
const joins = sql`left join "users" ON e.created_by = "users".id
  left join "event_categories" c ON e.category_id = c.id`;
export async function listEventsJson(db: Db, query: EventQuery, admin: boolean): Promise<string> {
  const sort = query.sort_by === "title" ? sql`title` : query.sort_by === "created_at" ? sql`created_at` : sql`start_time`;
  const direction = query.sort_desc ? sql`DESC` : sql`ASC`;
  const order = (alias: SQL) => query.sort_by ? sql`${alias}.${sort} ${direction}, ${alias}.id ASC` : sql`${alias}.id ASC`;
  const [row] = await db.execute<{ body: string }>(sql`SELECT coalesce(json_agg(q.row_json ORDER BY ${order(sql`q`)}), '[]'::json)::text AS body
    FROM (SELECT e.id, e.title, e.created_at, e.start_time, ${eventJson()} AS row_json FROM events e ${joins}
      WHERE ${visibility(admin ? "undeleted" : "public")}
      ${query.search ? sql`AND e.title ILIKE ${`%${query.search}%`}` : sql``}
      ${query.category_id ? sql`AND e.category_id = ${query.category_id}` : sql``}
      ${query.status === "upcoming" ? sql`AND e.start_time >= (now() AT TIME ZONE 'UTC')` : query.status === "past" ? sql`AND e.start_time < (now() AT TIME ZONE 'UTC')` : sql``}
      ORDER BY ${order(sql`e`)} LIMIT ${query.limit ?? (admin ? 50 : 10)} OFFSET ${query.skip ?? 0}) q`);
  if (!row) throw new Error("Event list query returned no row");
  return row.body;
}
export async function getEventJson(db: Db | Tx, id: number, scope: Visibility = "public"): Promise<string | null> {
  const [row] = await db.execute<{ body: string }>(sql`SELECT ${eventJson()}::text AS body FROM events e ${joins} WHERE e.id = ${id} AND ${visibility(scope)}`);
  return row?.body ?? null;
}
export async function getEventBySlugJson(db: Db, slug: string): Promise<string | null> {
  const [row] = await db.execute<{ body: string }>(sql`SELECT ${eventJson()}::text AS body FROM events e ${joins} WHERE e.slug = ${slug} AND ${visibility("public")}`);
  return row?.body ?? null;
}
export async function getFeaturedEventJson(db: Db): Promise<string> {
  const [row] = await db.execute<{ body: string }>(sql`WITH first_flagged AS (
    SELECT e.id, e.start_time FROM events e WHERE ${visibility("public")} AND e.is_featured = true ORDER BY e.id ASC LIMIT 1
  ), selected AS (
    SELECT id FROM first_flagged WHERE start_time >= (now() AT TIME ZONE 'UTC')
    UNION ALL
    (SELECT e.id FROM events e WHERE ${visibility("public")} AND e.start_time >= (now() AT TIME ZONE 'UTC')
      AND NOT EXISTS (SELECT 1 FROM first_flagged WHERE start_time >= (now() AT TIME ZONE 'UTC'))
      ORDER BY e.start_time ASC, e.id ASC LIMIT 1)
  ) SELECT coalesce((SELECT ${eventJson()} FROM events e ${joins} WHERE e.id = (SELECT id FROM selected)), 'null'::json)::text AS body`);
  if (!row) throw new Error("Featured event query returned no row");
  return row.body;
}
export async function listEventCategoriesJson(db: Db, skip: number, limit: number): Promise<string> {
  const [row] = await db.execute<{ body: string }>(sql`SELECT coalesce(json_agg(q.row_json ORDER BY q.id ASC), '[]'::json)::text AS body
    FROM (SELECT c.id, ${categoryJson()} AS row_json FROM event_categories c ORDER BY c.id ASC LIMIT ${limit} OFFSET ${skip}) q`);
  if (!row) throw new Error("Category list query returned no row");
  return row.body;
}
export async function getEventCategoryJson(db: Db | Tx, id: number): Promise<string | null> {
  const [row] = await db.execute<{ body: string }>(sql`SELECT ${categoryJson()}::text AS body FROM event_categories c WHERE c.id = ${id}`);
  return row?.body ?? null;
}
export async function slugExists(db: Db | Tx, slug: string, exceptId?: number): Promise<boolean> {
  const rows = await db.select({ id: events.id }).from(events).where(and(eq(events.slug, slug), exceptId === undefined ? undefined : ne(events.id, exceptId))).limit(1);
  return rows.length > 0;
}
// Serialize featured promotions even when there is no currently featured row to lock.
export async function clearFeatured(tx: Tx, exceptId?: number): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(734125, 7)`);
  await tx.update(events).set({ isFeatured: false, updatedAt: sql`now()` })
    .where(and(eq(events.isFeatured, true), exceptId === undefined ? undefined : ne(events.id, exceptId)));
}
export async function insertEventRow(tx: Tx, values: typeof events.$inferInsert): Promise<number> {
  const [row] = await tx.insert(events).values(values).returning({ id: events.id });
  if (!row) throw new Error("Event insert returned no row");
  return row.id;
}
export async function updateEventRow(tx: Tx, id: number, values: PgUpdateSetSource<typeof events>): Promise<void> {
  await tx.update(events).set({ ...values, updatedAt: sql`now()` }).where(eq(events.id, id));
}
export async function deleteEventRow(tx: Tx, id: number): Promise<void> { await tx.delete(events).where(eq(events.id, id)); }
export async function findCategoryRow(db: Db | Tx, id: number): Promise<CategoryRow | null> {
  const [row] = await db.select().from(eventCategories).where(eq(eventCategories.id, id)).limit(1);
  return row ?? null;
}
export async function insertCategoryRow(tx: Tx, name: string, description: string | null): Promise<CategoryRow> {
  const [row] = await tx.insert(eventCategories).values({ name, description }).returning();
  if (!row) throw new Error("Category insert returned no row");
  return row;
}
export async function updateCategoryRow(tx: Tx, id: number, name: string): Promise<CategoryRow | null> {
  const [row] = await tx.update(eventCategories).set({ name, updatedAt: sql`now()` }).where(eq(eventCategories.id, id)).returning();
  return row ?? null;
}
export async function clearEventCategory(tx: Tx, id: number): Promise<void> {
  await tx.update(events).set({ categoryId: null, updatedAt: sql`now()` }).where(eq(events.categoryId, id));
}
export async function deleteCategoryRow(tx: Tx, id: number): Promise<void> { await tx.delete(eventCategories).where(eq(eventCategories.id, id)); }
