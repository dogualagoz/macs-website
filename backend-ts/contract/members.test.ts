import { beforeEach, describe, expect, test } from "bun:test";
import { api, resetState, SEED, signedToken } from "./client";

const keys = ["full_name", "profile_image", "id", "is_active", "created_at"].sort();
const ids = (body: unknown) => (body as { id: number }[]).map(row => row.id);
const mod = () => signedToken(SEED.mod);

describe("members contract", () => {
  beforeEach(resetState);
  test("default list includes inactive members with exact shape and microsecond timestamps", async () => {
    const r = await api("GET", "/members"); expect(r.status).toBe(200); expect(ids(r.body)).toEqual([4, 3, 2, 1]);
    for (const row of r.body as object[]) expect(Object.keys(row).sort()).toEqual(keys);
    expect((r.body as object[])[3]).toEqual({ full_name: "Ayşe Yılmaz", profile_image: null, id: 1, is_active: true, created_at: "2026-01-01T12:00:00.123456Z" });
  });
  test.each([["is_active=true", [4, 2, 1]], ["is_active=false", [3]], ["is_active=t", [4, 2, 1]], ["is_active=n", [3]], ["search=ayşe", [1]], ["skip=1&limit=2", [3, 2]], ["search=missing", []]] as const)("list query %s", async (query, expected) => {
    const r = await api("GET", `/members?${query}`); expect(r.status).toBe(200); expect(ids(r.body)).toEqual([...expected]);
  });
  test.each([["limit=201", "limit", "less_than_equal"], ["skip=-1", "skip", "greater_than_equal"], ["is_active=garbage", "is_active", "bool_parsing"]])("invalid query %s", async (query, field, type) => {
    const r = await api("GET", `/members?${query}`); expect(r.status).toBe(422); expect(r.body).toMatchObject({ detail: [{ type, loc: ["query", field] }] });
  });
  test("leaderboard counts only active undeleted projects and includes projectless active member", async () => {
    const r = await api("GET", "/members/leaderboard"); expect(r.status).toBe(200);
    expect((r.body as { id: number; project_count: number; total_contributions: number }[]).map(({ id, project_count, total_contributions }) => ({ id, project_count, total_contributions }))).toEqual([
      { id: 1, project_count: 2, total_contributions: 6 }, { id: 2, project_count: 1, total_contributions: 2 }, { id: 4, project_count: 0, total_contributions: 0 },
    ]);
    for (const row of r.body as object[]) expect(Object.keys(row).sort()).toEqual([...keys, "project_count", "total_contributions"].sort());
    const limited = await api("GET", "/members/leaderboard?limit=1"); expect(limited.status).toBe(200); expect(ids(limited.body)).toEqual([1]);
    for (const limit of [0, 101]) expect((await api("GET", `/members/leaderboard?limit=${String(limit)}`)).status).toBe(422);
  });
  test("member stats count all memberships including deleted and inactive projects", async () => {
    const r = await api("GET", "/members/1/stats"); expect(r.status).toBe(200); expect(r.body).toMatchObject({ id: 1, project_count: 3, total_contributions: 15 });
    const inactiveProject = await api("GET", "/members/2/stats"); expect(inactiveProject.status).toBe(200); expect(inactiveProject.body).toMatchObject({ project_count: 2, total_contributions: 9 });
    const empty = await api("GET", "/members/4/stats"); expect(empty.status).toBe(200); expect(empty.body).toMatchObject({ project_count: 0, total_contributions: 0 });
  });
  test("member projects return ordered memberships and exact shape", async () => {
    const r = await api("GET", "/members/1/projects"); expect(r.status).toBe(200); expect(r.body).toEqual([
      { member_id: 1, role: "Lead", contribution_count: 5, id: 1, project_id: 1 },
      { member_id: 1, role: null, contribution_count: 1, id: 3, project_id: 2 },
      { member_id: 1, role: "Dev", contribution_count: 9, id: 5, project_id: 4 },
    ]);
    const empty = await api("GET", "/members/4/projects"); expect(empty.status).toBe(200); expect(empty.body).toEqual([]);
  });
  test("every public GET ignores garbage Authorization", async () => {
    for (const path of ["/members", "/members/leaderboard", "/members/1", "/members/1/stats", "/members/1/projects"]) {
      const r = await api("GET", path, { token: "garbage" }); expect(r.status).toBe(200);
    }
  });
  test.each(["/members/999", "/members/999/stats", "/members/999/projects"])("missing member %s", async path => {
    const r = await api("GET", path); expect(r.status).toBe(404); expect(r.body).toEqual({ detail: "Üye bulunamadı" });
  });
  test("invalid member ID reports path location", async () => {
    const r = await api("GET", "/members/abc"); expect(r.status).toBe(422); expect(r.body).toMatchObject({ detail: [{ type: "int_parsing", loc: ["path", "member_id"], input: "abc" }] });
  });
  test("create uses active default, allows inactive names and rejects duplicate active names", async () => {
    const token = await mod(); const r = await api("POST", "/members", { token, json: { full_name: "Yeni Üye" } }); expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ full_name: "Yeni Üye", profile_image: null, id: 5, is_active: true }); expect(Object.keys(r.body as object).sort()).toEqual(keys);
    expect((r.body as { created_at: string }).created_at).toMatch(/Z$/);
    const duplicate = await api("POST", "/members", { token, json: { full_name: "Ayşe Yılmaz" } }); expect(duplicate.status).toBe(400); expect(duplicate.body).toEqual({ detail: "'Ayşe Yılmaz' isimli aktif bir üye zaten mevcut" });
    const inactive = await api("POST", "/members", { token, json: { full_name: "Pasif Üye" } }); expect(inactive.status).toBe(201); expect(inactive.body).toMatchObject({ full_name: "Pasif Üye", is_active: true });
  });
  test("partial update preserves omissions and allows explicit null profile_image", async () => {
    const token = await mod(); const r = await api("PUT", "/members/1", { token, json: { full_name: "Updated", profile_image: "https://example.com/member.png", is_active: "no" } });
    expect(r.status).toBe(200); expect(r.body).toMatchObject({ full_name: "Updated", is_active: false, profile_image: "https://example.com/member.png" });
    const cleared = await api("PUT", "/members/1", { token, json: { profile_image: null } }); expect(cleared.status).toBe(200); expect(cleared.body).toMatchObject({ full_name: "Updated", is_active: false, profile_image: null });
    const empty = await api("PUT", "/members/1", { token, json: {} }); expect(empty.status).toBe(200); expect(empty.body).toEqual(cleared.body);
  });
  test("delete is hard, empty and cannot be repeated", async () => {
    const token = await mod(); const r = await api("DELETE", "/members/1", { token }); expect(r.status).toBe(204); expect(r.text).toBe("");
    for (const method of ["GET", "DELETE", "PUT"]) {
      const missing = await api(method, "/members/1", { token, ...(method === "PUT" ? { json: {} } : {}) }); expect(missing.status).toBe(404); expect(missing.body).toEqual({ detail: "Üye bulunamadı" });
    }
  });
  test("mutations require approved staff", async () => {
    for (const [method, path, json] of [["POST", "/members", { full_name: "Name" }], ["PUT", "/members/1", {}], ["DELETE", "/members/1", undefined]] as const) {
      const r = await api(method, path, { ...(json ? { json } : {}) }); expect(r.status).toBe(401); expect(r.body).toEqual({ detail: "Not authenticated" });
      const denied = await api(method, path, { token: await signedToken(SEED.pending), ...(json ? { json } : {}) }); expect(denied.status).toBe(403);
    }
  });
  test("body validation reports missing and wrong string/boolean types", async () => {
    const token = await mod(); const missing = await api("POST", "/members", { token, json: {} }); expect(missing.status).toBe(422); expect(missing.body).toMatchObject({ detail: [{ type: "missing", loc: ["body", "full_name"] }] });
    const wrong = await api("POST", "/members", { token, json: { full_name: 1 } }); expect(wrong.status).toBe(422); expect(wrong.body).toMatchObject({ detail: [{ type: "string_type", loc: ["body", "full_name"] }] });
    const flag = await api("PUT", "/members/1", { token, json: { is_active: "1.0" } }); expect(flag.status).toBe(422); expect(flag.body).toMatchObject({ detail: [{ type: "bool_parsing", loc: ["body", "is_active"] }] });
  });
});
