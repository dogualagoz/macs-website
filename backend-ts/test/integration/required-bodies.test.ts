import { afterAll, beforeEach, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { createApp } from "../../src/app";
import { testDeps } from "../helpers/app";
import { seedDb } from "../helpers/db";
import { tokenFor } from "../helpers/auth";
import request from "../helpers/http";

const deps = testDeps();
const seed = await readFile(new URL("../../contract/seed.sql", import.meta.url), "utf8");
afterAll(async () => { await deps.sql.end({ timeout: 1 }); });
beforeEach(async () => { await seedDb(deps.sql, seed); });
const missing = { detail: [{ type: "missing", loc: ["body"], msg: "Field required", input: null }] };

test("auth registration requires body; empty login form reports missing credentials", async () => {
  const app = createApp(deps);
  for (const path of ["/auth/register", "/auth/register/admin"]) {
    const r = await request(app).post(path);
    expect(r.status).toBe(422); expect(r.body).toEqual(missing);
    expect(r.headers["cache-control"]).toBe("no-store");
  }
  const r = await request(app).post("/auth/login");
  expect(r.status).toBe(422);
  expect(r.body).toEqual({ detail: ["username", "password"].map(field => ({
    type: "missing", loc: ["body", field], msg: "Field required", input: null,
  })) });
});

test("users body routes require body while query-only profile PUT accepts none", async () => {
  const app = createApp(deps); const token = await tokenFor("admin@example.com", "admin");
  for (const [method, path] of [["post", "/users/me/change-password"], ["patch", "/users/2/access"]] as const) {
    const r = await request(app)[method](path).auth(token, { type: "bearer" });
    expect(r.status).toBe(422); expect(r.body).toEqual(missing);
  }
  const r = await request(app).put("/users/me").auth(token, { type: "bearer" });
  expect(r.status).toBe(200); expect(r.body).toMatchObject({ id: 1, full_name: "Test Kullanıcı 1" });
});

test("sponsors create, partial update and geocode require body without Content-Type", async () => {
  const app = createApp(deps); const token = await tokenFor("mod@example.com", "moderator");
  for (const [method, path] of [["post", "/sponsors/"], ["put", "/sponsors/1"], ["post", "/sponsors/geocode"]] as const) {
    const r = await request(app)[method](path).auth(token, { type: "bearer" });
    expect(r.status).toBe(422); expect(r.body).toEqual(missing);
  }
  expect((await request(app).put("/sponsors/1").auth(token, { type: "bearer" }).send({})).status).toBe(200);
});

test("members create and partial update require body without Content-Type", async () => {
  const app = createApp(deps); const token = await tokenFor("mod@example.com", "moderator");
  for (const [method, path] of [["post", "/members"], ["put", "/members/1"]] as const) {
    const r = await request(app)[method](path).auth(token, { type: "bearer" });
    expect(r.status).toBe(422); expect(r.body).toEqual(missing);
  }
  expect((await request(app).put("/members/1").auth(token, { type: "bearer" }).send({})).status).toBe(200);
});

test("uploads missing body reports missing file without Content-Type", async () => {
  const token = await tokenFor("mod@example.com", "moderator");
  const r = await request(createApp(deps)).post("/api/upload/").auth(token, { type: "bearer" });
  expect(r.status).toBe(422);
  expect(r.body).toEqual({ detail: [{ type: "missing", loc: ["body", "file"], msg: "Field required", input: null }] });
});
