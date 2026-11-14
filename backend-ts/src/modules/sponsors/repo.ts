import { and, asc, eq, ne } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import type { Db, Tx } from "../../db/client";
import { sponsors } from "../../db/schema";
import type { SponsorQuery } from "./schemas";

export type SponsorRow = typeof sponsors.$inferSelect;
export async function listSponsorRows(db: Db | Tx, query: SponsorQuery): Promise<SponsorRow[]> {
  return db.select().from(sponsors).where(and(eq(sponsors.isActive, query.is_active ?? true), query.category ? eq(sponsors.category, query.category) : undefined))
    .orderBy(asc(sponsors.id)).offset(query.skip ?? 0).limit(query.limit ?? 50);
}
export async function listSponsorCategories(db: Db | Tx): Promise<string[]> {
  const rows = await db.selectDistinct({ category: sponsors.category }).from(sponsors).where(ne(sponsors.category, "")).orderBy(asc(sponsors.category)); return rows.map(row => row.category);
}
export async function findSponsorRow(db: Db | Tx, id: number): Promise<SponsorRow | null> {
  const [row] = await db.select().from(sponsors).where(eq(sponsors.id, id)).limit(1); return row ?? null;
}
export async function insertSponsorRow(db: Db | Tx, values: typeof sponsors.$inferInsert): Promise<SponsorRow> {
  const [row] = await db.insert(sponsors).values(values).returning(); if (!row) throw new Error("Sponsor insert returned no row"); return row;
}
export async function updateSponsorRow(db: Db | Tx, id: number, values: PgUpdateSetSource<typeof sponsors>): Promise<SponsorRow | null> {
  const [row] = await db.update(sponsors).set(values).where(eq(sponsors.id, id)).returning(); return row ?? null;
}
export async function deleteSponsorRow(db: Db | Tx, id: number): Promise<SponsorRow | null> {
  const [row] = await db.delete(sponsors).where(eq(sponsors.id, id)).returning(); return row ?? null;
}
