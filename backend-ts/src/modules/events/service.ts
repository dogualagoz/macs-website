import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import type { Db, Tx } from "../../db/client";
import type { events } from "../../db/schema";
import { HttpError } from "../../lib/http-error";
import { createSlug, resolveSlug } from "../../lib/slug";
import * as repo from "./queries";
import type { CategoryCreate, EventCreate, EventUpdate } from "./schemas";

export function requiredEvent(body: string | null): string {
  if (body === null) throw new HttpError(404, "Event bulunamadı");
  return body;
}
export function requiredCategory(body: string | null): string {
  if (body === null) throw new HttpError(404, "Kategori bulunamadı");
  return body;
}
async function validateCategory(tx: Tx, categoryId: number | null | undefined): Promise<void> {
  if (categoryId && !await repo.findCategoryRow(tx, categoryId)) throw new HttpError(404, "Belirtilen kategori bulunamadı");
}
function eventPatch(input: EventUpdate): PgUpdateSetSource<typeof events> {
  return {
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.content === undefined ? {} : { content: input.content }),
    ...(input.image_url === undefined ? {} : { imageUrl: input.image_url }),
    ...(input.location === undefined ? {} : { location: input.location }),
    ...(input.registration_link === undefined ? {} : { registrationLink: input.registration_link }),
    ...(input.directions_link === undefined ? {} : { directionsLink: input.directions_link }),
    ...(input.start_time === undefined ? {} : { startTime: input.start_time }),
    ...(input.end_time === undefined ? {} : { endTime: input.end_time }),
    ...(input.category_id === undefined ? {} : { categoryId: input.category_id }),
    ...(input.is_active === undefined ? {} : { isActive: input.is_active }),
    ...(input.is_featured === undefined ? {} : { isFeatured: input.is_featured }),
  };
}
export async function createEvent(db: Db, creatorId: number, input: EventCreate, now: Date): Promise<string> {
  return db.transaction(async tx => {
    await validateCategory(tx, input.category_id);
    const base = createSlug(input.title);
    const slug = resolveSlug(base, await repo.slugExists(tx, base), now);
    if (input.is_featured) await repo.clearFeatured(tx);
    const id = await repo.insertEventRow(tx, { title: input.title, slug, createdBy: creatorId, startTime: input.start_time,
      description: input.description ?? null, content: input.content ?? null, imageUrl: input.image_url ?? null,
      location: input.location ?? null, registrationLink: input.registration_link ?? null, directionsLink: input.directions_link ?? null,
      endTime: input.end_time ?? null, categoryId: input.category_id ?? null, isActive: input.is_active, isFeatured: input.is_featured, isDeleted: false });
    return requiredEvent(await repo.getEventJson(tx, id, "all"));
  });
}
export async function updateEvent(db: Db, id: number, input: EventUpdate, now: Date): Promise<string> {
  return db.transaction(async tx => {
    const current = requiredEvent(await repo.getEventJson(tx, id, "undeleted"));
    await validateCategory(tx, input.category_id);
    const patch = eventPatch(input);
    if (input.title !== undefined) {
      const base = createSlug(input.title); patch.slug = resolveSlug(base, await repo.slugExists(tx, base, id), now);
    }
    if (input.is_featured) await repo.clearFeatured(tx, id);
    if (Object.keys(patch).length === 0) return current;
    await repo.updateEventRow(tx, id, patch);
    return requiredEvent(await repo.getEventJson(tx, id, "all"));
  });
}
export async function deleteEvent(db: Db, id: number): Promise<{ message: string }> {
  return db.transaction(async tx => {
    requiredEvent(await repo.getEventJson(tx, id, "undeleted"));
    await repo.updateEventRow(tx, id, { isDeleted: true }); return { message: "Event başarıyla silindi" };
  });
}
export async function hardDeleteEvent(db: Db, id: number): Promise<void> {
  await db.transaction(async tx => { requiredEvent(await repo.getEventJson(tx, id, "all")); await repo.deleteEventRow(tx, id); });
}
export async function createEventCategory(db: Db, input: CategoryCreate): Promise<string> {
  return db.transaction(async tx => {
    const row = await repo.insertCategoryRow(tx, input.name, input.description ?? null);
    return requiredCategory(await repo.getEventCategoryJson(tx, row.id));
  });
}
export async function updateEventCategory(db: Db, id: number, input: CategoryCreate): Promise<string> {
  return db.transaction(async tx => {
    requiredCategory(await repo.getEventCategoryJson(tx, id));
    await repo.updateCategoryRow(tx, id, input.name);
    return requiredCategory(await repo.getEventCategoryJson(tx, id));
  });
}
export async function deleteEventCategory(db: Db, id: number): Promise<void> {
  await db.transaction(async tx => {
    requiredCategory(await repo.getEventCategoryJson(tx, id));
    await repo.clearEventCategory(tx, id); await repo.deleteCategoryRow(tx, id);
  });
}
