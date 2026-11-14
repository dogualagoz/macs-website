import { timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import type { Env } from "../../config/env";
import type { Db, Tx } from "../../db/client";
import { HttpError } from "../../lib/http-error";
import { signAccessToken } from "../../lib/jwt";
import { verifyPassword } from "../../lib/password";
import { findUserCredentialsByEmail, updateUser } from "../users/repo";

export function validAdminSecret(expected: string | null, supplied: string): boolean {
  if (!expected) return false;
  const left = Buffer.from(expected); const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}
// Each committed auth mutation has one service entry point for Task 11 invalidation.
export async function recordFailedLogin(db: Db | Tx, userId: number): Promise<void> {
  await updateUser(db, userId, { failedLoginAttempts: sql`coalesce(failed_login_attempts, 0) + 1`, lastFailedLogin: sql`now()` });
}
export async function recordSuccessfulLogin(db: Db | Tx, userId: number): Promise<void> {
  await updateUser(db, userId, { failedLoginAttempts: 0, lastLogin: sql`now()` });
}
export async function resetExpiredLoginAttempts(db: Db | Tx, userId: number): Promise<void> {
  await updateUser(db, userId, { failedLoginAttempts: 0 });
}
export async function login(db: Db, env: Env, now: Date, email: string, password: string): Promise<{ access_token: string; token_type: "bearer" }> {
  const result = await db.transaction(async tx => {
    const row = await findUserCredentialsByEmail(tx, email);
    if (!row) return new HttpError(401, "Email veya şifre hatalı");
    if ((row.failed_login_attempts ?? 0) >= env.MAX_LOGIN_ATTEMPTS) {
      if (row.failed_minutes_ago !== null && row.failed_minutes_ago < env.LOCKOUT_DURATION) {
        return new HttpError(401, `Çok fazla başarısız deneme. Hesap ${Math.trunc(env.LOCKOUT_DURATION - row.failed_minutes_ago).toString()} dakika kilitlendi.`);
      }
      await resetExpiredLoginAttempts(tx, row.id);
    }
    if (!await verifyPassword(password, row.hashed_password)) {
      await recordFailedLogin(tx, row.id);
      // Return errors from the transaction: failed-login writes must commit before 401.
      return new HttpError(401, "Email veya şifre hatalı");
    }
    if (!row.is_active) return new HttpError(401, "Hesabınız aktif değil");
    if (row.status !== "approved") return new HttpError(403, "Hesabınız henüz onaylanmadı. Yönetici onayı bekleniyor.");
    const access_token = await signAccessToken({ sub: row.email, role: row.role }, env.JWT_SECRET_KEY, env.ACCESS_TOKEN_EXPIRE_MINUTES, now);
    await recordSuccessfulLogin(tx, row.id);
    return { access_token, token_type: "bearer" as const };
  });
  if (result instanceof HttpError) throw result;
  return result;
}
