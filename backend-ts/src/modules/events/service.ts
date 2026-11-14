import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import type { Db, Tx } from "../../db/client";
import type { events } from "../../db/schema";
import { HttpError } from "../../lib/http-error";
import { createSlug, resolveSlug } from "../../lib/slug";
import * as repo from "./repo";
import { EVENT_SORTABLE } from "./schemas";
import type { CategoryCreate, EventCreate, EventQuery, EventResponse, EventUpdate, EventCategoryResponse } from "./schemas";
import { serializeEvent, serializeEventCategory } from "./serializer";

function requiredEvent(row: repo.EventRow | null): EventResponse {
  if (!row) throw new HttpError(404, "Event bulunamadı");
  return serializeEvent(row);
}
function requiredCategory(row: repo.CategoryRow | null): EventCategoryResponse {
  if (!row) throw new HttpError(404, "Kategori bulunamadı");
  return serializeEventCategory(row);
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
export async function listEvents(db: Db, query: EventQuery, admin = false): Promise<EventResponse[]> {
  if (query.sort_by && !EVENT_SORTABLE.some(field => field === query.sort_by)) {
    throw new HttpError(400, "Geçersiz sıralama alanı. İzin verilenler: start_time, title, created_at");
  }
  return (await repo.listEventRows(db, query, admin)).map(serializeEvent);
}
export async function getEvent(db: Db, id: number): Promise<EventResponse> { return requiredEvent(await repo.findEventRow(db, id)); }
export async function getEventBySlug(db: Db, slug: string): Promise<EventResponse> { return requiredEvent(await repo.findEventBySlug(db, slug)); }
export async function getFeaturedEvent(db: Db): Promise<EventResponse | null> {
  const flagged = await repo.findFlaggedEvent(db);
  const row = flagged?.upcoming ? flagged : await repo.findNextEvent(db);
  return row ? serializeEvent(row) : null;
}
export async function createEvent(db: Db, creatorId: number, input: EventCreate, now: Date): Promise<EventResponse> {
  return db.transaction(async tx => {
    await validateCategory(tx, input.category_id);
    const base = createSlug(input.title);
    const slug = resolveSlug(base, await repo.slugExists(tx, base), now);
    if (input.is_featured) await repo.clearFeatured(tx);
    const id = await repo.insertEventRow(tx, { title: input.title, slug, createdBy: creatorId, startTime: input.start_time,
      description: input.description ?? null, content: input.content ?? null, imageUrl: input.image_url ?? null,
      location: input.location ?? null, registrationLink: input.registration_link ?? null, directionsLink: input.directions_link ?? null,
      endTime: input.end_time ?? null, categoryId: input.category_id ?? null, isActive: input.is_active, isFeatured: input.is_featured, isDeleted: false });
    return requiredEvent(await repo.findEventRow(tx, id, "all"));
  });
}
export async function updateEvent(db: Db, id: number, input: EventUpdate, now: Date): Promise<EventResponse> {
  return db.transaction(async tx => {
    const current = requiredEvent(await repo.findEventRow(tx, id, "undeleted"));
    await validateCategory(tx, input.category_id);
    const patch = eventPatch(input);
    if (input.title !== undefined) {
      const base = createSlug(input.title); patch.slug = resolveSlug(base, await repo.slugExists(tx, base, id), now);
    }
    if (input.is_featured) await repo.clearFeatured(tx, id);
    if (Object.keys(patch).length === 0) return current;
    await repo.updateEventRow(tx, id, patch);
    return requiredEvent(await repo.findEventRow(tx, id, "all"));
  });
}
export async function deleteEvent(db: Db, id: number): Promise<{ message: string }> {
  return db.transaction(async tx => {
    requiredEvent(await repo.findEventRow(tx, id, "undeleted"));
    await repo.updateEventRow(tx, id, { isDeleted: true }); return { message: "Event başarıyla silindi" };
  });
}
export async function hardDeleteEvent(db: Db, id: number): Promise<void> {
  await db.transaction(async tx => { requiredEvent(await repo.findEventRow(tx, id, "all")); await repo.deleteEventRow(tx, id); });
}
export async function listEventCategories(db: Db, skip: number, limit: number): Promise<EventCategoryResponse[]> {
  return (await repo.listCategoryRows(db, skip, limit)).map(serializeEventCategory);
}
export async function getEventCategory(db: Db, id: number): Promise<EventCategoryResponse> { return requiredCategory(await repo.findCategoryRow(db, id)); }
export async function createEventCategory(db: Db, input: CategoryCreate): Promise<EventCategoryResponse> {
  return db.transaction(async tx => serializeEventCategory(await repo.insertCategoryRow(tx, input.name, input.description ?? null)));
}
export async function updateEventCategory(db: Db, id: number, input: CategoryCreate): Promise<EventCategoryResponse> {
  return db.transaction(async tx => requiredCategory(await repo.updateCategoryRow(tx, id, input.name)));
}
export async function deleteEventCategory(db: Db, id: number): Promise<void> {
  await db.transaction(async tx => {
    requiredCategory(await repo.findCategoryRow(tx, id));
    await repo.clearEventCategory(tx, id); await repo.deleteCategoryRow(tx, id);
  });
}
