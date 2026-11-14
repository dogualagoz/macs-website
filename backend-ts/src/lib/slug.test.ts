import { expect, test } from "bun:test";
import golden from "../../test/fixtures/slug-golden.json";
import { createSlug, resolveSlug, transliterate } from "./slug";

test.each(golden)("createSlug($title) matches python unidecode", ({ title, slug }) => {
  expect(createSlug(title)).toBe(slug);
});

test("transliterate maps Latin letters, symbols and combining marks", () => {
  expect(transliterate("İı ß æÆ œŒ øØ łŁ đĐ þÞ ðÐ € e\u0301 ‘x’ “y”–—")).toBe(
    "Ii ss aeAE oeOE oO lL dD thTh dD EUR e 'x' \"y\"--",
  );
});

test("resolveSlug handles collisions and empty bases", () => {
  const now = new Date("2026-11-14T08:05:09Z");
  expect(resolveSlug("bahar-senligi", false, now)).toBe("bahar-senligi");
  expect(resolveSlug("bahar-senligi", true, now)).toBe("bahar-senligi-20261114-080509");
  expect(resolveSlug("", false, now)).toBe("20261114-080509");
  expect(resolveSlug("", true, now)).toBe("20261114-080509");
});

test("non-latin title yields empty base", () => {
  expect(createSlug("日本語")).toBe("");
});
