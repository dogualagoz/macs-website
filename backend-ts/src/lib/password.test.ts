import { expect, test } from "bun:test";
import fx from "../../test/fixtures/python-fixtures.json";
import { hashPassword, verifyPassword } from "./password";

test("verifies passlib hash", async () => {
  expect(await verifyPassword("parola123", fx.passlib.parola123)).toBe(true);
});

test("rejects wrong password", async () => {
  expect(await verifyPassword("parola124", fx.passlib.parola123)).toBe(false);
});

test("72-byte truncation matches bcrypt 4.0.1", async () => {
  expect(await verifyPassword("a".repeat(72), fx.passlib.a72_plus_TAIL)).toBe(true);
  expect(await verifyPassword("a".repeat(72) + "XYZ", fx.passlib.a72_plus_TAIL)).toBe(true);
  expect(await verifyPassword("a".repeat(71), fx.passlib.a72_plus_TAIL)).toBe(false);
});

test("truncation counts UTF-8 bytes, not characters", async () => {
  expect(await verifyPassword("ş".repeat(36), fx.passlib.s_cedilla_x40)).toBe(true);
  expect(await verifyPassword("ş".repeat(35), fx.passlib.s_cedilla_x40)).toBe(false);
});

test("truncation may cut inside a multibyte character", async () => {
  const hash = await hashPassword("a" + "ş".repeat(40));
  expect(await verifyPassword("a" + "ş".repeat(36), hash)).toBe(true);
  expect(await verifyPassword("a" + "ş".repeat(35), hash)).toBe(false);
});

test("hashPassword truncates ASCII input before Bun can prehash it", async () => {
  const hash = await hashPassword("a".repeat(72) + "TAIL");
  expect(await verifyPassword("a".repeat(72), hash)).toBe(true);
  expect(await verifyPassword("a".repeat(71), hash)).toBe(false);
});

test("malformed or empty input returns false, never throws", async () => {
  expect(await verifyPassword("x", "not-a-hash")).toBe(false);
  expect(await verifyPassword("", fx.passlib.parola123)).toBe(false);
  expect(await verifyPassword("x", "")).toBe(false);
});

test("hashPassword emits a cost-12 bcrypt hash and verifies", async () => {
  const hash = await hashPassword("parola123");
  expect(hash).toMatch(/^\$2b\$12\$.{53}$/);
  expect(await verifyPassword("parola123", hash)).toBe(true);
});
