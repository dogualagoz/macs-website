import { sql } from "drizzle-orm";
import type { Env } from "../../config/env";
import type { Db } from "../../db/client";
import { HttpError } from "../../lib/http-error";
import { hashPassword, verifyPassword } from "../../lib/password";
import * as repo from "./repo";
import type { UserResponse } from "./schemas";
import { serializeUser } from "./serializer";

function required(row: repo.UserPublicRow | null): UserResponse {
  if (!row) throw new HttpError(404, "Kullanıcı bulunamadı");
  return serializeUser(row);
}
function validatePassword(env: Env, password: string): void {
  if (!password) throw new HttpError(400, "Şifre boş olamaz");
  if (Array.from(password).length < env.MIN_PASSWORD_LENGTH) throw new HttpError(400, `Şifre en az ${env.MIN_PASSWORD_LENGTH.toString()} karakter olmalıdır`);
}
function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === "23505") return true;
  return "cause" in error && isUniqueViolation(error.cause);
}
export async function createUser(db: Db, env: Env, input: { email: string; full_name: string; password: string; role?: "admin" | "moderator"; status?: "pending" | "approved" }): Promise<UserResponse> {
  if (await repo.findUserByEmail(db, input.email)) throw new HttpError(400, "Bu email adresi zaten kullanımda");
  validatePassword(env, input.password);
  const hashedPassword = await hashPassword(input.password);
  try {
    return required(await repo.insertUser(db, { email: input.email, fullName: input.full_name, hashedPassword,
      role: input.role ?? "moderator", status: input.status ?? "pending", isActive: true, failedLoginAttempts: 0 }));
  } catch (error: unknown) {
    if (isUniqueViolation(error)) throw new HttpError(400, "Bu email adresi zaten kullanımda");
    throw error;
  }
}
export async function getUser(db: Db, userId: number): Promise<UserResponse> { return required(await repo.findUserById(db, userId)); }
export async function setPassword(db: Db, env: Env, email: string, password: string): Promise<UserResponse> {
  validatePassword(env, password);
  return db.transaction(async tx => {
    const row = await repo.findUserCredentialsByEmail(tx, email);
    if (!row) throw new HttpError(404, "Kullanıcı bulunamadı");
    return required(await repo.updateUser(tx, row.id, { hashedPassword: await hashPassword(password), passwordChangedAt: sql`now()`, failedLoginAttempts: 0, lastFailedLogin: null }));
  });
}
export async function changePassword(db: Db, env: Env, email: string, currentPassword: string, newPassword: string): Promise<UserResponse> {
  return db.transaction(async tx => {
    const row = await repo.findUserCredentialsByEmail(tx, email);
    if (!row) throw new HttpError(404, "Kullanıcı bulunamadı");
    if (!await verifyPassword(currentPassword, row.hashed_password)) throw new HttpError(400, "Mevcut şifre yanlış");
    if (await verifyPassword(newPassword, row.hashed_password)) throw new HttpError(400, "Yeni şifre eski şifre ile aynı olamaz");
    validatePassword(env, newPassword);
    return required(await repo.updateUser(tx, row.id, { hashedPassword: await hashPassword(newPassword), passwordChangedAt: sql`now()` }));
  });
}
export async function setAccess(db: Db, userId: number, patch: { status?: "pending" | "approved" | "rejected"; role?: "admin" | "moderator"; is_active?: boolean }): Promise<UserResponse> {
  if (Object.keys(patch).length === 0) return getUser(db, userId);
  return required(await repo.updateUser(db, userId, {
    ...(patch.status === undefined ? {} : { status: patch.status }), ...(patch.role === undefined ? {} : { role: patch.role }),
    ...(patch.is_active === undefined ? {} : { isActive: patch.is_active }),
  }));
}
export async function updateProfile(db: Db, userId: number, fullName?: string): Promise<UserResponse> {
  return fullName ? required(await repo.updateUser(db, userId, { fullName })) : getUser(db, userId);
}
export async function removeUser(db: Db, userId: number): Promise<UserResponse> { return required(await repo.deleteUser(db, userId)); }
export async function listUsers(db: Db, skip: number, limit: number): Promise<{ users: UserResponse[]; total: number }> {
  const result = await repo.listUserRows(db, skip, limit);
  return { users: result.users.map(serializeUser), total: result.total };
}
