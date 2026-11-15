import { beforeEach, describe, expect, test } from "bun:test";
import { api, resetState, SEED, signedToken, TARGET_KIND } from "./client";
import { deviation } from "./deviations";

const keys = ["name", "description", "image_url", "category", "discount_info", "latitude", "longitude", "address", "is_active", "is_featured", "id", "created_at", "updated_at"].sort();
const ids = (body: unknown) => (body as { id: number }[]).map(row => row.id);
const mod = () => signedToken(SEED.mod);

describe("sponsors contract", () => {
  beforeEach(resetState);
  test("default list filters active sponsors and returns exact shape with null updated_at", async () => {
    const r = await api("GET", "/sponsors/"); expect(r.status).toBe(200); expect(ids(r.body)).toEqual([1, 2, 3, 5]);
    for (const row of r.body as object[]) { expect(Object.keys(row).sort()).toEqual(keys); expect(row).toMatchObject({ updated_at: null }); }
    expect((r.body as object[])[0]).toMatchObject({ created_at: "2026-01-01T12:00:00.123456Z", latitude: 41, longitude: 29, is_featured: true });
  });
  test.each([["is_active=false", [4]], ["is_active=f", [4]], ["is_active=y", [1, 2, 3, 5]], ["category=Kafe", [1]], ["category=kafe", []], ["skip=1&limit=2", [2, 3]], ["category=", [1, 2, 3, 5]]] as const)("list query %s", async (query, expected) => {
    const r = await api("GET", `/sponsors/?${query}`); expect(r.status).toBe(200); expect(ids(r.body)).toEqual([...expected]);
  });
  test("categories include inactive categories and omit empty values in sorted order", async () => {
    const r = await api("GET", "/sponsors/categories"); expect(r.status).toBe(200); expect(TARGET_KIND === "old" ? (r.body as string[]).toSorted() : r.body).toEqual(["Kafe", "Kitap", "Restoran", "Teknoloji"]);
  });
  test("public list, categories and detail ignore garbage Authorization", async () => {
    for (const path of ["/sponsors/", "/sponsors/categories", "/sponsors/1"]) expect((await api("GET", path, { token: "garbage" })).status).toBe(200);
  });
  test("missing and non-integer sponsor IDs", async () => {
    const missing = await api("GET", "/sponsors/999"); expect(missing.status).toBe(404); expect(missing.body).toEqual({ detail: "ID 999 olan sponsor bulunamadı" });
    const invalid = await api("GET", "/sponsors/abc"); expect(invalid.status).toBe(422); expect(invalid.body).toMatchObject({ detail: [{ type: "int_parsing", loc: ["path", "sponsor_id"], input: "abc" }] });
  });
  test.each([["limit=201", "limit", "less_than_equal"], ["skip=-1", "skip", "greater_than_equal"], ["is_active=x", "is_active", "bool_parsing"]])("invalid query %s", async (query, field, type) => {
    const r = await api("GET", `/sponsors/?${query}`); expect(r.status).toBe(422); expect(r.body).toMatchObject({ detail: [{ type, loc: ["query", field] }] });
  });
  test.each([
    [{ name: "A", category: "Kafe" }, "name", "string_too_short", "String should have at least 2 characters"],
    [{ name: "AB", category: "A" }, "category", "string_too_short", "String should have at least 2 characters"],
    [{ name: "AB", category: "Kafe", latitude: 91 }, "latitude", "less_than_equal", "Input should be less than or equal to 90"],
    [{ name: "AB", category: "Kafe", longitude: -181 }, "longitude", "greater_than_equal", "Input should be greater than or equal to -180"],
    [{ name: "AB", category: "Kafe", image_url: "x".repeat(501) }, "image_url", "string_too_long", "String should have at most 500 characters"],
    [{ name: "AB", category: "Kafe", discount_info: "x".repeat(501) }, "discount_info", "string_too_long", "String should have at most 500 characters"],
    [{ name: "AB", category: "Kafe", is_featured: "1.0" }, "is_featured", "bool_parsing", "Input should be a valid boolean, unable to interpret input"],
    [{ name: "AB", category: "Kafe", latitude: "0x1" }, "latitude", "float_parsing", "Input should be a valid number, unable to parse string as a number"],
  ] as const)("create validation %j", async (json, field, type, msg) => {
    const r = await api("POST", "/sponsors/", { token: await mod(), json }); expect(r.status).toBe(422); expect(r.body).toMatchObject({ detail: [{ type, loc: ["body", field], msg }] });
  });
  test("create minimal sponsor uses defaults and null optional fields", async () => {
    const r = await api("POST", "/sponsors/", { token: await mod(), json: { name: "Yeni Sponsor", category: "Kafe" } }); expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ id: 6, name: "Yeni Sponsor", category: "Kafe", description: null, image_url: null, address: null, is_active: true, is_featured: false, latitude: null, longitude: null, discount_info: null, updated_at: null });
    expect(Object.keys(r.body as object).sort()).toEqual(keys); expect((r.body as { created_at: string }).created_at).toMatch(/Z$/);
  });
  test("create and update coerce numeric strings and lax boolean aliases", async () => {
    const token = await mod(); const r = await api("POST", "/sponsors/", { token, json: { name: "Coerced", category: "Kafe", latitude: " 40.9887 ", longitude: "2.9e1", is_active: "yes", is_featured: 1 } });
    expect(r.status).toBe(201); expect(r.body).toMatchObject({ latitude: 40.9887, longitude: 29, is_active: true, is_featured: true });
    const changed = await api("PUT", "/sponsors/6", { token, json: { latitude: true, longitude: false, is_active: "off", is_featured: "n" } });
    expect(changed.status).toBe(200); expect(changed.body).toMatchObject({ latitude: 1, longitude: 0, is_active: false, is_featured: false });
  });
  test("update preserves omissions and clears nullable fields", async () => {
    const token = await mod(); const r = await api("PUT", "/sponsors/1", { token, json: { is_featured: false, discount_info: "x".repeat(500), latitude: null } });
    expect(r.status).toBe(200); expect(r.body).toMatchObject({ name: "Kahve Durağı", is_featured: false, latitude: null, longitude: 29, discount_info: "x".repeat(500), updated_at: null });
    const empty = await api("PUT", "/sponsors/1", { token, json: {} }); expect(empty.status).toBe(200); expect(empty.body).toEqual(r.body);
    const short = await api("PUT", "/sponsors/1", { token, json: { discount_info: "x" } }); expect(short.status).toBe(422); expect(short.body).toMatchObject({ detail: [{ type: "string_too_short", loc: ["body", "discount_info"] }] });
    const cleared = await api("PUT", "/sponsors/1", { token, json: { discount_info: null, is_featured: true } }); expect(cleared.status).toBe(200); expect(cleared.body).toMatchObject({ discount_info: null, is_featured: true });
  });
  test("long discount_info on update applies deviation l (old 500 after commit, new 422 without write)", async () => {
    const token = await mod(); const before = await api("GET", "/sponsors/1"); expect(before.status).toBe(200);
    const r = await api("PUT", "/sponsors/1", { token, json: { discount_info: "x".repeat(501) } });
    expect(r.status).toBe(deviation("l", { old: 500, new: 422 }));
    if (TARGET_KIND === "old") {
      const persisted = await api("GET", "/sponsors/1"); expect(persisted.status).toBe(500);
      const fixed = await api("PUT", "/sponsors/1", { token, json: { discount_info: "valid" } }); expect(fixed.status).toBe(200); expect(fixed.body).toMatchObject({ discount_info: "valid" });
    } else {
      expect(r.body).toMatchObject({ detail: [{ type: "string_too_long", loc: ["body", "discount_info"], msg: "String should have at most 500 characters", input: "x".repeat(501) }] });
      const after = await api("GET", "/sponsors/1"); expect(after.status).toBe(200); expect(after.body).toEqual(before.body);
    }
  });
  test.each(["is_active", "is_featured"] as const)("explicit null %s on update applies deviation l (old 500 after commit, new 422 without write)", async field => {
    const token = await mod(); const before = await api("GET", "/sponsors/1"); expect(before.status).toBe(200);
    const r = await api("PUT", "/sponsors/1", { token, json: { [field]: null } });
    expect(r.status).toBe(deviation("l", { old: 500, new: 422 }));
    if (TARGET_KIND === "old") {
      const persisted = await api("GET", "/sponsors/1"); expect(persisted.status).toBe(500);
      const repaired = await api("PUT", "/sponsors/1", { token, json: { [field]: true } }); expect(repaired.status).toBe(200); expect(repaired.body).toMatchObject({ [field]: true });
    } else {
      expect(r.body).toMatchObject({ detail: [{ type: "bool_type", loc: ["body", field], msg: "Input should be a valid boolean", input: null }] });
      const after = await api("GET", "/sponsors/1"); expect(after.status).toBe(200); expect(after.body).toEqual(before.body);
    }
  });
  test("delete returns empty 204 and repeat or update missing returns exact 404", async () => {
    const token = await mod(); const r = await api("DELETE", "/sponsors/1", { token }); expect(r.status).toBe(204); expect(r.text).toBe("");
    for (const method of ["DELETE", "PUT"]) { const missing = await api(method, "/sponsors/1", { token, ...(method === "PUT" ? { json: {} } : {}) }); expect(missing.status).toBe(404); expect(missing.body).toEqual({ detail: "ID 1 olan sponsor bulunamadı" }); }
  });
  test("all writes and geocode require approved staff", async () => {
    for (const [method, path, json] of [["POST", "/sponsors/", { name: "Name", category: "Kafe" }], ["PUT", "/sponsors/1", {}], ["DELETE", "/sponsors/1", undefined], ["POST", "/sponsors/geocode", { address: "Kadıköy" }]] as const) {
      const r = await api(method, path, { ...(json ? { json } : {}) }); expect(r.status).toBe(401); expect(r.body).toEqual({ detail: "Not authenticated" });
      const denied = await api(method, path, { token: await signedToken(SEED.pending), ...(json ? { json } : {}) }); expect(denied.status).toBe(403);
    }
  });
  test("geocode validates short address before contacting upstream", async () => {
    const r = await api("POST", "/sponsors/geocode", { token: await mod(), json: { address: "ab" } }); expect(r.status).toBe(422);
    expect(r.body).toMatchObject({ detail: [{ type: "string_too_short", loc: ["body", "address"], msg: "String should have at least 3 characters", input: "ab" }] });
  });
});
