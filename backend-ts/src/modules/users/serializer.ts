import { pgToUtcIso } from "../../lib/datetime";
import type { UserPublicRow } from "./repo";
import type { UserResponse } from "./schemas";

export function serializeUser(row: UserPublicRow): UserResponse {
  return { id: row.id, email: row.email, full_name: row.full_name, role: row.role, status: row.status,
    is_active: row.is_active ?? false, last_login: pgToUtcIso(row.last_login), failed_login_attempts: row.failed_login_attempts ?? 0,
    password_changed_at: pgToUtcIso(row.password_changed_at) };
}
