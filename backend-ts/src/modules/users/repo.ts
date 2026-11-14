import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import { count, desc, eq, sql } from "drizzle-orm";
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
export async function listUserRows(db: Db | Tx, skip: number, limit: number): Promise<{ users: UserPublicRow[]; total: number }> {
  const rows = await db.select(USER_PUBLIC_COLUMNS).from(users).orderBy(desc(users.createdAt), desc(users.id)).offset(skip).limit(limit);
  const [total] = await db.select({ value: count() }).from(users);
  return { users: rows, total: total?.value ?? 0 };
}
