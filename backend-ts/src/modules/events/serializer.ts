import { pgToNaiveIso, pgToUtcIso } from "../../lib/datetime";
import type { UserPublicRow } from "../users/queries";
import type { UserResponse } from "../users/schemas";
function serializeUser(row: UserPublicRow): UserResponse {
  return { id: row.id, email: row.email, full_name: row.full_name, role: row.role, status: row.status,
    is_active: row.is_active ?? false, last_login: pgToUtcIso(row.last_login), failed_login_attempts: row.failed_login_attempts ?? 0,
    password_changed_at: pgToUtcIso(row.password_changed_at) };
}
import type { CategoryRow, EventRow } from "./repo";
import type { EventCategoryResponse, EventResponse } from "./schemas";

export function serializeEventCategory(row: CategoryRow): EventCategoryResponse {
  return { id: row.id, name: row.name, description: row.description, created_at: pgToUtcIso(row.createdAt), updated_at: pgToUtcIso(row.updatedAt) };
}
export function serializeEvent(row: EventRow): EventResponse {
  const event = row.event;
  return {
    title: event.title, description: event.description, content: event.content, image_url: event.imageUrl, location: event.location,
    registration_link: event.registrationLink, directions_link: event.directionsLink,
    start_time: pgToNaiveIso(event.startTime) as string, end_time: pgToNaiveIso(event.endTime), category_id: event.categoryId,
    is_active: event.isActive ?? false, is_featured: event.isFeatured ?? false, id: event.id, slug: event.slug, created_by: event.createdBy,
    creator: row.creator ? serializeUser(row.creator) : null, is_deleted: event.isDeleted ?? false,
    created_at: pgToUtcIso(event.createdAt), updated_at: pgToUtcIso(event.updatedAt), category: row.category ? serializeEventCategory(row.category) : null,
  };
}
