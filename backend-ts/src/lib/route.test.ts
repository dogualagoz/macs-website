import { expect, test } from "bun:test";
import express from "express";
import { get } from "node:http";
import request from "supertest";
import { z } from "zod";
import { createApp } from "../app";
import type { AppDeps } from "../app";
import { parseEnv } from "../config/env";
import type { AuthUser } from "../middleware/auth";
import { HttpError } from "./http-error";
import { signAccessToken } from "./jwt";
import { testDeps } from "../../test/helpers/app";
import { route, STREAMED } from "./route";

const now = new Date("2026-11-14T00:00:00Z");
const env = parseEnv({ DATABASE_URL: "postgresql://u:p@db/x", JWT_SECRET_KEY: "x".repeat(32), NODE_ENV: "test" });
const user: AuthUser = { id: 1, email: "mod@example.com", full_name: "Mod", role: "moderator", status: "approved", is_active: true, last_login: null, failed_login_attempts: 0, password_changed_at: null };
const deps = (): AppDeps => testDeps({ env, now: () => now, loadUser: (email) => Promise.resolve(email === user.email ? user : null) });
const base = { method: "post", path: "/test", domain: "events", tag: "Events", summary: "Test" } as const;

test("order: 401 precedes 422, including malformed JSON", async () => {
  const app = createApp(deps(), (router, d) => {
    route(router, d, { ...base, auth: ["admin"], body: z.object({ email: z.string() }), handler: () => Promise.resolve({ ok: true }) });
  });
  for (const body of ["{}", "{"]) {
    const r = await request(app).post("/test").set("Content-Type", "application/json").send(body);
    expect(r.status).toBe(401);
    expect(r.body).toEqual({ detail: "Not authenticated" });
    expect(r.headers["www-authenticate"]).toBe("Bearer");
  }
});
test("order: 403 precedes 422", async () => {
  const app = createApp(deps(), (router, d) => {
    route(router, d, { ...base, auth: ["admin"], body: z.object({ email: z.string() }), handler: () => Promise.resolve({ ok: true }) });
  });
  const token = await signAccessToken({ sub: user.email, role: "admin" }, env.JWT_SECRET_KEY, 60, now);
  const r = await request(app).post("/test").auth(token, { type: "bearer" }).send({});
  expect(r.status).toBe(403);
  expect(r.body).toEqual({ detail: "Bu işlem için yetkiniz yok" });
});
test("bodyInvalid overrides malformed JSON and schema failure", async () => {
  const app = createApp(deps(), (router, d) => {
    route(router, d, { ...base, body: z.object({ email: z.string() }), bodyInvalid: new HttpError(400, "Geçersiz istek gövdesi"), handler: () => Promise.resolve(null) });
  });
  for (const body of ["{", "{}"]) {
    const r = await request(app).post("/test").set("Content-Type", "application/json").send(body);
    expect(r.status).toBe(400);
    expect(r.body).toEqual({ detail: "Geçersiz istek gövdesi" });
  }
});
test("malformed field produces the entire FastAPI body", async () => {
  const app = createApp(deps(), (router, d) => {
    route(router, d, { ...base, body: z.object({ email: z.string() }), handler: () => Promise.resolve(null) });
  });
  const r = await request(app).post("/test").send({ email: 42 });
  expect(r.status).toBe(422);
  expect(r.body).toEqual({ detail: [{ type: "string_type", loc: ["body", "email"], msg: "Input should be a valid string", input: 42 }] });
});
test("status 204 skips serialization and sends empty body", async () => {
  const app = createApp(deps(), (router, d) => {
    route(router, d, { ...base, status: 204, handler: () => Promise.resolve({ toJSON() { throw new Error("must not serialize"); } }) });
  });
  const r = await request(app).post("/test");
  expect(r.status).toBe(204);
  expect(r.text).toBe("");
});
test("handler returning null sends JSON null", async () => {
  const app = createApp(deps(), (router, d) => { route(router, d, { ...base, handler: () => Promise.resolve(null) }); });
  const r = await request(app).post("/test");
  expect(r.status).toBe(200);
  expect(r.text).toBe("null");
  expect(r.headers["content-type"]).toContain("application/json");
});
test("STREAMED leaves response ownership with the handler", async () => {
  const app = createApp(deps(), (router, d) => {
    route(router, d, { ...base, handler: ({ res }) => { res.type("application/zip"); setImmediate(() => { res.end("zip-bytes"); }); return Promise.resolve(STREAMED); } });
  });
  const r = await request(app).post("/test").buffer(true);
  expect(r.status).toBe(200);
  expect(r.headers["content-type"]).toContain("application/zip");
  expect(r.text).toBe("zip-bytes");
});
test("extra query params are ignored and parsed inputs reach handler", async () => {
  const app = createApp(deps(), (router, d) => {
    route(router, d, { ...base, method: "get", path: "/test/:id", params: z.object({ id: z.coerce.number() }), query: z.object({ q: z.string().optional() }), handler: ({ params, query }) => Promise.resolve({ params, query }) });
  });
  const r = await request(app).get("/test/3?q=hello&foo=1");
  expect(r.status).toBe(200);
  expect(r.body).toEqual({ params: { id: 3 }, query: { q: "hello" } });
});
test("form bodies are parsed before validation", async () => {
  const app = createApp(deps(), (router, d) => {
    route(router, d, { ...base, bodyKind: "form", body: z.object({ username: z.string() }), handler: ({ body }) => Promise.resolve(body) });
  });
  const r = await request(app).post("/test").type("form").send({ username: "mod@example.com" });
  expect(r.status).toBe(200);
  expect(r.body).toEqual({ username: "mod@example.com" });
});
test("per-app registry includes metadata and remains independent", () => {
  const first = deps(); const second = deps();
  createApp(first, (router, d) => {
    route(router, d, { ...base, auth: "user", bodyKind: "form", handler: () => Promise.resolve(null) });
    route(router, d, { ...base, path: "/upload", upload: { field: "file", maxBytes: 1024 }, handler: () => Promise.resolve(null) });
  });
  createApp(second);
  const login = first.routeRegistry.find((r) => r.path === "/test");
  expect(login?.method).toBe("post");
  expect(login?.domain).toBe("events");
  expect(login?.auth).toBe("user");
  expect(login?.bodyKind).toBe("form");
  expect(first.routeRegistry.find((r) => r.path === "/upload")?.upload).toEqual({ field: "file", maxBytes: 1024 });
  expect(second.routeRegistry.some((r) => r.path === "/test" || r.path === "/upload")).toBe(false);
  const router = express.Router();
  route(router, second, { ...base, path: "/second", handler: () => Promise.resolve(null) });
  expect(first.routeRegistry.some((r) => r.path === "/second")).toBe(false);
});


test("STREAMED allows handler cleanup on client disconnect", async () => {
  let aborted = false;
  let closed: (() => void) | undefined;
  const disconnected = new Promise<void>((resolve) => { closed = resolve; });
  const app = createApp(deps(), (router, d) => {
    route(router, d, { ...base, method: "get", handler: ({ req, res }) => {
      res.type("application/zip");
      req.once("aborted", () => { aborted = !res.writableFinished; res.destroy(); closed?.(); });
      res.write("zip-start");
      res.flushHeaders();
      return Promise.resolve(STREAMED);
    } });
  });
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP server");
    await new Promise<void>((resolve, reject) => {
      const client = get(`http://127.0.0.1:${address.port.toString()}/test`, (response) => {
        response.once("data", () => { response.destroy(); resolve(); });
        response.on("error", reject);
      });
      client.on("error", reject);
    });
    await disconnected;
    expect(aborted).toBe(true);
  } finally {
    await new Promise<void>((resolve, reject) => { server.close((error) => { if (error) reject(error); else resolve(); }); });
  }
});
test("missing body field retains parent input in the entire 422 envelope", async () => {
  const app = createApp(deps(), (router, d) => {
    route(router, d, { ...base, body: z.object({ email: z.string() }), handler: () => Promise.resolve(null) });
  });
  const r = await request(app).post("/test").send({ x: 1 });
  expect(r.status).toBe(422);
  expect(r.body).toEqual({ detail: [{ type: "missing", loc: ["body", "email"], msg: "Field required", input: { x: 1 } }] });
});

test("protected route registration requires an injected user loader", () => {
  const d = deps();
  // @ts-expect-error AppDeps requires a loader even for public-only test applications.
  delete d.loadUser;
  expect(() => createApp(d, (router, appDeps) => {
    route(router, appDeps, { ...base, auth: "user", handler: () => Promise.resolve(null) });
  })).toThrow("Protected routes require loadUser");
});

test("form-only route rejects JSON credentials as missing fields", async () => {
  const app = createApp(deps(), (router, d) => {
    route(router, d, { ...base, bodyKind: "form", body: z.object({ username: z.string() }), handler: ({ body }) => Promise.resolve(body) });
  });
  const r = await request(app).post("/test").send({ username: "mod@example.com" });
  expect(r.status).toBe(422);
  expect(r.body).toEqual({ detail: [{ type: "missing", loc: ["body", "username"], msg: "Field required", input: null }] });
});
