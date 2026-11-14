import { errors, jwtVerify, SignJWT } from "jose";
import { unauthorized } from "./http-error";

export interface TokenClaims {
  sub: string;
  role: string;
  exp: number;
}

export async function signAccessToken(
  claims: { sub: string; role: string },
  secret: string,
  expiresMinutes: number,
  now: Date,
): Promise<string> {
  return new SignJWT({ sub: claims.sub, role: claims.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(Math.floor(now.getTime() / 1000) + expiresMinutes * 60)
    .sign(new TextEncoder().encode(secret));
}

export async function verifyAccessToken(token: string, secret: string, now: Date): Promise<TokenClaims> {
  const raw = token.startsWith("Bearer ") ? token.slice(7) : token;
  const { payload } = await jwtVerify(raw, new TextEncoder().encode(secret), {
    algorithms: ["HS256"], currentDate: now,
  }).catch((error: unknown) => {
    const detail = error instanceof errors.JWTExpired ? "Signature has expired."
      : error instanceof errors.JWSSignatureVerificationFailed ? "Signature verification failed."
        : "Not enough segments";
    throw unauthorized(`Token geçersiz veya süresi dolmuş: ${detail}`);
  });
  if (!payload.sub) throw unauthorized("Token doğrulama hatası: 401: Token içinde email bilgisi eksik");
  if (typeof payload.role !== "string" || typeof payload.exp !== "number") {
    throw unauthorized("Token geçersiz veya süresi dolmuş: Not enough segments");
  }
  return { sub: payload.sub, role: payload.role, exp: payload.exp };
}
