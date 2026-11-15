import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../../db/client";
import { sponsors } from "../../db/schema";
import { sqlUtcIso } from "../../lib/sql-json";
import { requiredSponsorJson } from "./service";
import type { SponsorCreate, SponsorQuery, SponsorUpdate } from "./schemas";

function sponsorJson() {
  return sql`json_build_object(
    'name', ${sponsors.name}, 'description', ${sponsors.description}, 'image_url', ${sponsors.imageUrl},
    'category', ${sponsors.category}, 'discount_info', ${sponsors.discountInfo},
    'latitude', ${sponsors.latitude}, 'longitude', ${sponsors.longitude}, 'address', ${sponsors.address},
    'is_active', ${sponsors.isActive}, 'is_featured', ${sponsors.isFeatured},
    'id', ${sponsors.id}, 'created_at', ${sqlUtcIso(sponsors.createdAt)}, 'updated_at', null)`;
}
export async function listSponsorsJson(db: Db, query: SponsorQuery): Promise<string> {
  const [row] = await db.execute<{ body: string }>(sql`SELECT coalesce(json_agg(q.row_json ORDER BY q.id ASC), '[]'::json)::text AS body
    FROM (SELECT ${sponsors.id} AS id, ${sponsorJson()} AS row_json FROM ${sponsors}
      WHERE ${and(eq(sponsors.isActive, query.is_active ?? true), query.category ? eq(sponsors.category, query.category) : undefined)}
      ORDER BY ${sponsors.id} ASC LIMIT ${query.limit ?? 50} OFFSET ${query.skip ?? 0}) q`);
  if (!row) throw new Error("Sponsor list query returned no row");
  return row.body;
}
export async function listSponsorCategoriesJson(db: Db): Promise<string> {
  const [row] = await db.execute<{ body: string }>(sql`SELECT coalesce(json_agg(c.category ORDER BY c.category ASC), '[]'::json)::text AS body
    FROM (SELECT DISTINCT ${sponsors.category} AS category FROM ${sponsors} WHERE ${sponsors.category} <> '') c`);
  if (!row) throw new Error("Sponsor categories query returned no row");
  return row.body;
}
export async function getSponsorJson(db: Db, id: number): Promise<string | null> {
  const [row] = await db.execute<{ body: string }>(sql`SELECT ${sponsorJson()}::text AS body FROM ${sponsors} WHERE ${sponsors.id} = ${id}`);
  return row?.body ?? null;
}
export async function createSponsor(db: Db, input: SponsorCreate): Promise<string> {
  const [row] = await db.insert(sponsors).values({ name: input.name, description: input.description ?? null, imageUrl: input.image_url ?? null,
    category: input.category, discountInfo: input.discount_info ?? null, latitude: input.latitude ?? null, longitude: input.longitude ?? null,
    address: input.address ?? null, isActive: input.is_active, isFeatured: input.is_featured,
  }).returning({ body: sql<string>`${sponsorJson()}::text` });
  if (!row) throw new Error("Sponsor insert returned no row");
  return row.body;
}
export async function updateSponsor(db: Db, id: number, input: SponsorUpdate): Promise<string> {
  if (Object.keys(input).length === 0) return requiredSponsorJson(await getSponsorJson(db, id), id);
  const [row] = await db.update(sponsors).set({
    name: input.name === null ? sql`NULL` : input.name, description: input.description, imageUrl: input.image_url,
    category: input.category === null ? sql`NULL` : input.category, discountInfo: input.discount_info,
    latitude: input.latitude, longitude: input.longitude, address: input.address, isActive: input.is_active, isFeatured: input.is_featured,
  }).where(eq(sponsors.id, id)).returning({ body: sql<string>`${sponsorJson()}::text` });
  return requiredSponsorJson(row?.body ?? null, id);
}
export async function deleteSponsor(db: Db, id: number): Promise<void> {
  const [row] = await db.delete(sponsors).where(eq(sponsors.id, id)).returning({ id: sponsors.id });
  requiredSponsorJson(row ? "null" : null, id);
}
