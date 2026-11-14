import { z } from "zod";
import { bodyBool, bodyFloat, pathInt, qBool, qInt, qStr } from "../../lib/validation";

const sponsorFields = {
  name: z.string().min(2).max(255), description: z.string().nullish(), image_url: z.string().max(500).nullish(),
  category: z.string().min(2).max(100), discount_info: z.string().min(2).max(500).nullish(),
  latitude: bodyFloat({ ge: -90, le: 90 }).nullish(), longitude: bodyFloat({ ge: -180, le: 180 }).nullish(),
  address: z.string().nullish(), is_active: bodyBool().default(true), is_featured: bodyBool().default(false),
};
export const sponsorCreateSchema = z.object(sponsorFields);
export const sponsorUpdateSchema = z.object({ ...sponsorFields, name: sponsorFields.name.nullable(), category: sponsorFields.category.nullable(),
  discount_info: z.string().min(2).nullish(), is_active: bodyBool().nullable(), is_featured: bodyBool().nullable(),
}).partial();
export const sponsorResponseSchema = z.object({
  name: z.string().min(2).max(255), description: z.string().nullable(), image_url: z.string().max(500).nullable(),
  category: z.string().min(2).max(100), discount_info: z.string().min(2).max(500).nullable(),
  latitude: z.number().min(-90).max(90).nullable(), longitude: z.number().min(-180).max(180).nullable(), address: z.string().nullable(),
  is_active: z.boolean(), is_featured: z.boolean(), id: z.int(), created_at: z.string().nullable(), updated_at: z.null(),
});
export const sponsorParamsSchema = z.object({ sponsor_id: pathInt("sponsor_id") });
export const sponsorQuerySchema = z.object({ category: qStr(), is_active: qBool({ default: true }), skip: qInt({ ge: 0, default: 0 }), limit: qInt({ ge: 1, le: 200, default: 50 }) });
export const geocodeRequestSchema = z.object({ address: z.string().min(3) });
export const geocodeResponseSchema = z.object({ latitude: z.number(), longitude: z.number(), formatted_address: z.string() });
export type SponsorCreate = z.infer<typeof sponsorCreateSchema>;
export type SponsorUpdate = z.infer<typeof sponsorUpdateSchema>;
export type SponsorResponse = z.infer<typeof sponsorResponseSchema>;
export type SponsorQuery = z.infer<typeof sponsorQuerySchema>;
export type GeocodeResponse = z.infer<typeof geocodeResponseSchema>;
