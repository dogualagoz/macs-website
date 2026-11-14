import { z } from "zod";
import { dateTimeIn, pathInt, qBool, qInt, qStr } from "../../lib/validation";
import { userResponseSchema } from "../users/schemas";

export const EVENT_SORTABLE = ["start_time", "title", "created_at"] as const;
export const categoryResponseSchema = z.object({
  name: z.string(), description: z.string().nullable(), id: z.number().int(),
  created_at: z.string().nullable(), updated_at: z.string().nullable(),
});
export const eventResponseSchema = z.object({
  title: z.string(), description: z.string().nullable(), content: z.string().nullable(), image_url: z.string().nullable(),
  location: z.string().nullable(), registration_link: z.string().nullable(), directions_link: z.string().nullable(),
  start_time: z.string(), end_time: z.string().nullable(), category_id: z.number().int().nullable(),
  is_active: z.boolean(), is_featured: z.boolean(), id: z.number().int(), slug: z.string(), created_by: z.number().int(),
  creator: userResponseSchema.nullable(), is_deleted: z.boolean(), created_at: z.string().nullable(), updated_at: z.string().nullable(),
  category: categoryResponseSchema.nullable(),
});
export type EventResponse = z.infer<typeof eventResponseSchema>;
export type EventCategoryResponse = z.infer<typeof categoryResponseSchema>;
export const eventParamsSchema = z.object({ event_id: pathInt("event_id") });
export const categoryParamsSchema = z.object({ category_id: pathInt("category_id") });
export const slugParamsSchema = z.object({ slug: z.string() });
export const categoryQuerySchema = z.object({ skip: qInt({ ge: 0, default: 0 }), limit: qInt({ ge: 1, le: 100, default: 10 }) });
const listFields = {
  skip: qInt({ ge: 0, default: 0 }), search: qStr(), category_id: z.preprocess(value => value === "" ? undefined : value, qInt({})),
  status: z.enum(["all", "upcoming", "past"]).default("all"),
  sort_by: z.preprocess(value => value === undefined ? "start_time" : value, qStr()), sort_desc: qBool({ default: false }),
};
export const eventQuerySchema = z.object({ ...listFields, limit: qInt({ ge: 1, le: 100, default: 10 }) });
export const adminEventQuerySchema = z.object({ ...listFields, limit: qInt({ ge: 1, le: 200, default: 50 }) });
export type EventQuery = z.infer<typeof eventQuerySchema>;
export const categoryCreateSchema = z.object({ name: z.string(), description: z.string().nullish() });
export type CategoryCreate = z.infer<typeof categoryCreateSchema>;
const bodyBoolean = z.preprocess(value => {
  if (typeof value === "string") {
    if (["true", "1", "on", "yes", "t", "y"].includes(value.toLowerCase())) return true;
    if (["false", "0", "off", "no", "f", "n"].includes(value.toLowerCase())) return false;
  }
  if (value === 1) return true;
  if (value === 0) return false;
  return value;
}, z.boolean());
const eventFields = {
  title: z.string(), description: z.string().nullish(), content: z.string().nullish(), image_url: z.string().nullish(),
  location: z.string().nullish(), registration_link: z.string().nullish(), directions_link: z.string().nullish(),
  start_time: dateTimeIn(), end_time: dateTimeIn().nullish(), category_id: z.number().int().nullish(),
  is_active: bodyBoolean, is_featured: bodyBoolean,
};
export const eventCreateSchema = z.object({ ...eventFields, is_active: bodyBoolean.default(true), is_featured: bodyBoolean.default(false) });
export const eventUpdateSchema = z.object({ ...eventFields, is_active: bodyBoolean.nullable(), is_featured: bodyBoolean.nullable() }).partial();
export type EventCreate = z.infer<typeof eventCreateSchema>;
export type EventUpdate = z.infer<typeof eventUpdateSchema>;
