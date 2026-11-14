import { sql } from "drizzle-orm";
import type { Logger } from "pino";
import type { Db } from "../../db/client";
import { HttpError } from "../../lib/http-error";
import * as repo from "./repo";
import { geocodeResponseSchema } from "./schemas";
import type { GeocodeResponse, SponsorCreate, SponsorQuery, SponsorResponse, SponsorUpdate } from "./schemas";
import { serializeSponsor } from "./serializer";

export type FetchImpl = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
function requiredSponsor(row: repo.SponsorRow | null, id: number): repo.SponsorRow {
  if (!row) throw new HttpError(404, `ID ${String(id)} olan sponsor bulunamadı`); return row;
}
export async function listSponsors(db: Db, query: SponsorQuery): Promise<SponsorResponse[]> { return (await repo.listSponsorRows(db, query)).map(serializeSponsor); }
export async function getSponsor(db: Db, id: number): Promise<SponsorResponse> { return serializeSponsor(requiredSponsor(await repo.findSponsorRow(db, id), id)); }
export async function listSponsorCategories(db: Db): Promise<string[]> { return repo.listSponsorCategories(db); }
export async function createSponsor(db: Db, input: SponsorCreate): Promise<SponsorResponse> {
  const row = await repo.insertSponsorRow(db, { name: input.name, description: input.description ?? null, imageUrl: input.image_url ?? null, category: input.category,
    discountInfo: input.discount_info ?? null, latitude: input.latitude ?? null, longitude: input.longitude ?? null, address: input.address ?? null, isActive: input.is_active, isFeatured: input.is_featured });
  return serializeSponsor(row);
}
export async function updateSponsor(db: Db, id: number, input: SponsorUpdate): Promise<SponsorResponse> {
  if (Object.keys(input).length === 0) return getSponsor(db, id);
  const row = await repo.updateSponsorRow(db, id, {
    name: input.name === null ? sql`NULL` : input.name, description: input.description, imageUrl: input.image_url, category: input.category === null ? sql`NULL` : input.category,
    discountInfo: input.discount_info, latitude: input.latitude, longitude: input.longitude, address: input.address, isActive: input.is_active, isFeatured: input.is_featured,
  }); return serializeSponsor(requiredSponsor(row, id));
}
export async function deleteSponsor(db: Db, id: number): Promise<void> { requiredSponsor(await repo.deleteSponsorRow(db, id), id); }
export async function geocodeAddress(address: string, fetchImpl: FetchImpl, userAgent: string, logger: Logger): Promise<GeocodeResponse> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({ q: address, format: "json", limit: "1", countrycodes: "tr" }).toString();
  let data: unknown;
  try {
    const response = await fetchImpl(url, { headers: { "User-Agent": userAgent }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`Geocoding upstream HTTP ${String(response.status)}`);
    data = await response.json();
  } catch (error: unknown) {
    if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
      throw new HttpError(504, "Geocoding servisi yanıt vermiyor. Lütfen tekrar deneyin.");
    }
    logger.error({ err: error }, "Geocoding isteği başarısız"); throw new HttpError(500, "Geocoding servisine ulaşılamadı");
  }
  if (Array.isArray(data) && data.length === 0) throw new HttpError(404, "Adres bulunamadı. Lütfen daha detaylı bir adres girin.");
  if (!Array.isArray(data) || data[0] === null || typeof data[0] !== "object") throw new Error("Invalid geocoding response");
  const result = data[0] as Record<string, unknown>;
  return geocodeResponseSchema.parse({ latitude: Number(result.lat), longitude: Number(result.lon), formatted_address: result.display_name });
}
