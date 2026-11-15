import type { Env } from "../config/env";
import { HttpError, unauthorized } from "../lib/http-error";
import { verifyAccessToken } from "../lib/jwt";
export type Role = "admin" | "moderator";

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  status: string;
  is_active: boolean;
  last_login: string | null;
  failed_login_attempts: number;
  password_changed_at: string | null;
}
export type LoadUserByEmail = (email: string) => Promise<AuthUser | null>;

export async function authenticate(req: Request, env: Env, loadUser: LoadUserByEmail, now: Date): Promise<AuthUser> {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) throw unauthorized("Not authenticated");
  const claims = await verifyAccessToken(authorization, env.JWT_SECRET_KEY, now);
  const user = await loadUser(claims.sub);
  if (!user) throw unauthorized("Kimlik doğrulanamadı");
  if (!user.is_active) throw unauthorized("Hesap aktif değil");
  if (user.status !== "approved") throw new HttpError(403, "Hesabınız henüz onaylanmadı");
  return user;
}

export function requireRoles(user: AuthUser, roles: readonly Role[]): void {
  if (!roles.some((role) => role === user.role)) throw new HttpError(403, "Bu işlem için yetkiniz yok");
}
