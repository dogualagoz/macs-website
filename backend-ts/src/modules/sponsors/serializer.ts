import { pgToUtcIso } from "../../lib/datetime";
import type { SponsorRow } from "./repo";
import { sponsorResponseSchema } from "./schemas";
import type { SponsorResponse } from "./schemas";

export function serializeSponsor(row: SponsorRow): SponsorResponse {
  // FastAPI validates SponsorBase again on output, including after committed updates.
  return sponsorResponseSchema.parse({ name: row.name, description: row.description, image_url: row.imageUrl, category: row.category, discount_info: row.discountInfo,
    latitude: row.latitude, longitude: row.longitude, address: row.address, is_active: row.isActive, is_featured: row.isFeatured,
    id: row.id, created_at: pgToUtcIso(row.createdAt), updated_at: null });
}
