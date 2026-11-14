import { expect, test } from "bun:test";
import { jwtVerify, SignJWT } from "jose";
import fx from "../../test/fixtures/python-fixtures.json";
import { HttpError } from "./http-error";
import { signAccessToken, verifyAccessToken } from "./jwt";

const now = new Date("2026-11-14T00:00:00Z");
const key = new TextEncoder().encode(fx.jose.secret);

async function expect401(promise: Promise<unknown>, detail: string): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    if (!(error instanceof HttpError)) throw error;
    expect(error.status).toBe(401);
    expect(error.detail).toBe(detail);
    expect(error.headers?.["WWW-Authenticate"]).toBe("Bearer");
    return;
  }
  throw new Error("Expected verification to reject with HttpError 401");
}

test("accepts python-jose token", async () => {
  expect(await verifyAccessToken(fx.jose.token, fx.jose.secret, now)).toEqual(fx.jose.claims);
});

test("sign/verify round trip, exp = now + minutes", async () => {
  const token = await signAccessToken({ sub: "a@b.co", role: "moderator" }, fx.jose.secret, 60, now);
  const expected = { sub: "a@b.co", role: "moderator", exp: 1794618000 };
  expect(await verifyAccessToken(token, fx.jose.secret, now)).toEqual(expected);
  const decoded = await jwtVerify(token, key, { algorithms: ["HS256"], currentDate: now });
  expect(decoded.payload).toEqual(expected);
  expect(decoded.protectedHeader).toEqual({ alg: "HS256", typ: "JWT" });
});

test("expired", async () => {
  const token = await new SignJWT({ sub: "a@b.co", role: "admin", exp: 1 })
    .setProtectedHeader({ alg: "HS256" }).sign(key);
  await expect401(verifyAccessToken(token, fx.jose.secret, now), "Token geçersiz veya süresi dolmuş: Signature has expired.");
});

test("expiration boundary is rejected", async () => {
  const token = await signAccessToken({ sub: "a@b.co", role: "admin" }, fx.jose.secret, 0, now);
  await expect401(verifyAccessToken(token, fx.jose.secret, now), "Token geçersiz veya süresi dolmuş: Signature has expired.");
});

test("bad signature", async () => {
  await expect401(verifyAccessToken(fx.jose.token, "other-secret-other-secret", now), "Token geçersiz veya süresi dolmuş: Signature verification failed.");
});

test("garbage", async () => {
  await expect401(verifyAccessToken("abc", fx.jose.secret, now), "Token geçersiz veya süresi dolmuş: Not enough segments");
});

test.each([undefined, ""])("missing or empty sub: %s", async (sub) => {
  const token = await new SignJWT({ ...(sub === undefined ? {} : { sub }), role: "admin", exp: 4102444800 })
    .setProtectedHeader({ alg: "HS256" }).sign(key);
  await expect401(verifyAccessToken(token, fx.jose.secret, now), "Token doğrulama hatası: 401: Token içinde email bilgisi eksik");
});

test("rejects algorithms other than HS256", async () => {
  const token = await new SignJWT({ sub: "a@b.co", role: "admin", exp: 4102444800 })
    .setProtectedHeader({ alg: "HS384" }).sign(key);
  await expect401(verifyAccessToken(token, fx.jose.secret, now), "Token geçersiz veya süresi dolmuş: Not enough segments");
});

test("strips Bearer prefix", async () => {
  expect((await verifyAccessToken("Bearer " + fx.jose.token, fx.jose.secret, now)).sub).toBe("admin@example.com");
});
