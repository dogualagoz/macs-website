import { pgToUtcIso } from "../../lib/datetime";
import type { UserResponse } from "./schemas";
import { sqlBoolFalse, sqlIntZero, sqlUtcIso } from "../../lib/sql-json";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import { eq, sql } from "drizzle-orm";
import type { Db, Tx } from "../../db/client";
import { users } from "../../db/schema";

export const USER_PUBLIC_COLUMNS = {
  id: users.id, email: users.email, full_name: users.fullName, role: users.role,
  status: users.status, is_active: users.isActive, last_login: users.lastLogin,
  failed_login_attempts: users.failedLoginAttempts, password_changed_at: users.passwordChangedAt,
} as const;
export interface UserPublicRow {
  id: number; email: string; full_name: string; role: string; status: string;
  is_active: boolean | null; last_login: string | null; failed_login_attempts: number | null; password_changed_at: string | null;
}
export interface UserCredentialRow extends UserPublicRow {
  hashed_password: string; last_failed_login: string | null; failed_minutes_ago: number | null;
}
export async function findUserByEmail(db: Db | Tx, email: string): Promise<UserPublicRow | null> {
  const [row] = await db.select(USER_PUBLIC_COLUMNS).from(users).where(eq(users.email, email)).limit(1);
  return row ?? null;
}
export async function findUserById(db: Db | Tx, id: number): Promise<UserPublicRow | null> {
  const [row] = await db.select(USER_PUBLIC_COLUMNS).from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}
// Password flows hold this row lock inside their transaction to prevent lost updates.
export async function findUserCredentialsByEmail(db: Db | Tx, email: string): Promise<UserCredentialRow | null> {
  const [row] = await db.select({ ...USER_PUBLIC_COLUMNS, hashed_password: users.hashedPassword,
    last_failed_login: users.lastFailedLogin,
    failed_minutes_ago: sql<number | null>`extract(epoch from (now() - ${users.lastFailedLogin})) / 60`.mapWith(Number),
  }).from(users).where(eq(users.email, email)).limit(1).for("update");
  return row ?? null;
}
export async function insertUser(db: Db | Tx, values: typeof users.$inferInsert): Promise<UserPublicRow> {
  const [row] = await db.insert(users).values(values).returning(USER_PUBLIC_COLUMNS);
  if (!row) throw new Error("User insert returned no row");
  return row;
}
export async function updateUser(db: Db | Tx, id: number, values: PgUpdateSetSource<typeof users>): Promise<UserPublicRow | null> {
  const [row] = await db.update(users).set({ ...values, updatedAt: sql`now()` }).where(eq(users.id, id)).returning(USER_PUBLIC_COLUMNS);
  return row ?? null;
}
export async function deleteUser(db: Db | Tx, id: number): Promise<UserPublicRow | null> {
  const [row] = await db.delete(users).where(eq(users.id, id)).returning(USER_PUBLIC_COLUMNS);
  return row ?? null;
}

export function serializeUser(row: UserPublicRow): UserResponse {
  return { id: row.id, email: row.email, full_name: row.full_name, role: row.role, status: row.status,
    is_active: row.is_active ?? false, last_login: pgToUtcIso(row.last_login), failed_login_attempts: row.failed_login_attempts ?? 0,
    password_changed_at: pgToUtcIso(row.password_changed_at) };
}


function userJson() {
  return sql`json_build_object(
    'id', ${users.id}, 'email', ${users.email}, 'full_name', ${users.fullName},
    'role', ${users.role}, 'status', ${users.status}, 'is_active', ${sqlBoolFalse(users.isActive)},
    'last_login', ${sqlUtcIso(users.lastLogin)}, 'failed_login_attempts', ${sqlIntZero(users.failedLoginAttempts)},
    'password_changed_at', ${sqlUtcIso(users.passwordChangedAt)})`;
}
export async function getUserJson(db: Db | Tx, id: number): Promise<string | null> {
  const result = await db.execute<{ body: string }>(sql`SELECT ${userJson()}::text AS body FROM ${users} WHERE ${users.id} = ${id}`);
  return result[0]?.body ?? null;
}
export async function listUsersJson(db: Db | Tx, skip: number, limit: number): Promise<string> {
  const result = await db.execute<{ body: string }>(sql`WITH paged AS (
    SELECT ${userJson()} AS body, ${users.createdAt} AS created_at, ${users.id} AS id FROM ${users}
    ORDER BY ${users.createdAt} DESC, ${users.id} DESC OFFSET ${skip} LIMIT ${limit}
  ) SELECT json_build_object('users', coalesce((SELECT json_agg(body ORDER BY created_at DESC, id DESC) FROM paged), '[]'::json),
    'total', (SELECT count(*) FROM ${users}))::text AS body`);
  if (!result[0]) throw new Error("User list query returned no row");
  return result[0].body;
}
