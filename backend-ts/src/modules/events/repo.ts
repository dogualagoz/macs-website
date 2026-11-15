import { and, asc, desc, eq, getTableColumns, gte, ilike, lt, ne, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import type { Db, Tx } from "../../db/client";
import { eventCategories, events, users } from "../../db/schema";
const USER_PUBLIC_COLUMNS = {
  id: users.id, email: users.email, full_name: users.fullName, role: users.role,
  status: users.status, is_active: users.isActive, last_login: users.lastLogin,
  failed_login_attempts: users.failedLoginAttempts, password_changed_at: users.passwordChangedAt,
};
import type { UserPublicRow } from "../users/queries";
import type { EventQuery } from "./schemas";

export type CategoryRow = typeof eventCategories.$inferSelect;
export interface EventRow {
  event: typeof events.$inferSelect;
  creator: UserPublicRow | null;
  category: CategoryRow | null;
}
export type Visibility = "public" | "undeleted" | "all";
const columns = { event: getTableColumns(events), creator: USER_PUBLIC_COLUMNS, category: getTableColumns(eventCategories) };
const nowUtc = sql`(now() AT TIME ZONE 'UTC')`;
function joined(db: Db | Tx) {
  return db.select(columns).from(events).leftJoin(users, eq(events.createdBy, users.id))
    .leftJoin(eventCategories, eq(events.categoryId, eventCategories.id));
}
function visibility(scope: Visibility): SQL | undefined {
  return scope === "all" ? undefined : and(eq(events.isDeleted, false), scope === "public" ? eq(events.isActive, true) : undefined);
}
export async function listEventRows(db: Db | Tx, query: EventQuery, admin: boolean): Promise<EventRow[]> {
  const sortColumn = query.sort_by === "title" ? events.title : query.sort_by === "created_at" ? events.createdAt : events.startTime;
  const order = query.sort_by ? [query.sort_desc ? desc(sortColumn) : asc(sortColumn), asc(events.id)] : [asc(events.id)];
  return joined(db).where(and(visibility(admin ? "undeleted" : "public"),
    query.search ? ilike(events.title, `%${query.search}%`) : undefined,
    query.category_id ? eq(events.categoryId, query.category_id) : undefined,
    query.status === "upcoming" ? gte(events.startTime, nowUtc) : query.status === "past" ? lt(events.startTime, nowUtc) : undefined,
  )).orderBy(...order).offset(query.skip ?? 0).limit(query.limit ?? (admin ? 50 : 10));
}
export async function findEventRow(db: Db | Tx, id: number, scope: Visibility = "public"): Promise<EventRow | null> {
  const [row] = await joined(db).where(and(eq(events.id, id), visibility(scope))).limit(1);
  return row ?? null;
}
export async function findEventBySlug(db: Db | Tx, slug: string): Promise<EventRow | null> {
  const [row] = await joined(db).where(and(eq(events.slug, slug), visibility("public"))).limit(1);
  return row ?? null;
}
export async function findFlaggedEvent(db: Db | Tx): Promise<(EventRow & { upcoming: boolean }) | null> {
  const [row] = await db.select({ ...columns, upcoming: sql<boolean>`${events.startTime} >= ${nowUtc}` }).from(events)
    .leftJoin(users, eq(events.createdBy, users.id)).leftJoin(eventCategories, eq(events.categoryId, eventCategories.id))
    .where(and(visibility("public"), eq(events.isFeatured, true))).orderBy(asc(events.id)).limit(1);
  return row ?? null;
}
export async function findNextEvent(db: Db | Tx): Promise<EventRow | null> {
  const [row] = await joined(db).where(and(visibility("public"), gte(events.startTime, nowUtc)))
    .orderBy(asc(events.startTime), asc(events.id)).limit(1);
  return row ?? null;
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
export async function listCategoryRows(db: Db | Tx, skip: number, limit: number): Promise<CategoryRow[]> {
  return db.select().from(eventCategories).orderBy(asc(eventCategories.id)).offset(skip).limit(limit);
}
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
