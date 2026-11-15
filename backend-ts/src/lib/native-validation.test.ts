import { expect, test } from "bun:test";
import { createRoute } from "@hono/zod-openapi";
import request from "../../test/helpers/http";
import { z } from "zod";
import { createApp } from "../app";
import type { AppDeps } from "../app";
import { parseEnv } from "../config/env";
import type { AuthUser } from "../middleware/auth";
import type { FastApiErrorItem } from "./validation";
import { HttpError } from "./http-error";
import { signAccessToken } from "./jwt";
import { testDeps } from "../../test/helpers/app";
import { limitBodySize } from "../security/request-guards";
import { route } from "../../test/helpers/native-route";

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
  expect(r.headers["content-type"]).toBeUndefined(); expect(r.headers["content-length"]).toBeUndefined();
});
test("handler returning null sends JSON null", async () => {
  const app = createApp(deps(), (router, d) => { route(router, d, { ...base, handler: () => Promise.resolve(null) }); });
  const r = await request(app).post("/test");
  expect(r.status).toBe(200);
  expect(r.text).toBe("null");
  expect(r.headers["content-type"]).toContain("application/json");
});
test("Response leaves ownership with handler", async () => {
  const app = createApp(deps(), (router, d) => { route(router, d, { ...base, handler: () => Promise.resolve(new Response("zip-bytes", { headers: { "Content-Type": "application/zip" } })) }); });
  const r = await request(app).post("/test"); expect(r.text).toBe("zip-bytes");
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

test("unauthenticated text body precedes media type validation", async () => {
  const app = createApp(deps(), (router, d) => { route(router, d, { ...base, auth: "user", body: z.object({ email: z.string() }), handler: () => Promise.resolve(null) }); });
  const r = await request(app).post("/test").type("text/plain").send("{");
  expect(r.status).toBe(401);
  expect(r.headers["www-authenticate"]).toBe("Bearer");
});

test("rate limit precedes auth and params/query/body validation", async () => {
  const d = deps(); d.env = { ...d.env, RATELIMIT_ENABLED: true };
  const app = createApp(d, (app, d) => {
    route(app, d, { ...base, path: "/order/:id", auth: "user", rateLimit: { limit: 1, windowMs: 60000, label: "1 per 1 minute" }, params: z.object({ id: z.coerce.number() }), query: z.object({ q: z.string() }), body: z.object({ email: z.string() }), handler: () => Promise.resolve(null) });
  });
  const first = await request(app).post("/order/bad").type("application/json").send("{");
  expect(first.status).toBe(401);
  const limited = await request(app).post("/order/bad").type("text/plain").send("{");
  expect(limited.status).toBe(429);
  expect(limited.body).toEqual({ error: "Rate limit exceeded: 1 per 1 minute" });
  const authorized = await signAccessToken({ sub: user.email, role: "moderator" }, env.JWT_SECRET_KEY, 60, now);
  const path = await request(app).post("/order/bad").set("X-Real-IP", "192.0.2.21").auth(authorized, { type: "bearer" }).send({});
  expect(path.status).toBe(422); expect((path.body as { detail: FastApiErrorItem[] }).detail[0]?.loc).toEqual(["path", "id"]);
  const query = await request(app).post("/order/1").set("X-Real-IP", "192.0.2.22").auth(authorized, { type: "bearer" }).send({});
  expect(query.status).toBe(422); expect((query.body as { detail: FastApiErrorItem[] }).detail[0]?.loc).toEqual(["query", "q"]);
  const body = await request(app).post("/order/1?q=valid").set("X-Real-IP", "192.0.2.23").auth(authorized, { type: "bearer" }).send({});
  expect(body.status).toBe(422); expect((body.body as { detail: FastApiErrorItem[] }).detail[0]?.loc).toEqual(["body", "email"]);
});

test("native OpenAPI hook retains raw input; JSON errors and overrides match FastAPI", async () => {
  const app = createApp(deps(), app => {
    for (const override of [false, true]) {
      app.openapi(createRoute({ method: "post", path: override ? "/native-override" : "/native", middleware: [async (c, next) => { if (override) c.set("bodyInvalid", new HttpError(400, "Override")); await next(); }, limitBodySize()], request: { body: { required: true, content: { "application/json": { schema: z.object({ email: z.string() }) } } } }, responses: { 200: { description: "OK" } } }), c => c.json({ ok: true }));
    }
  });
  const badField = await request(app).post("/native").send({ email: 42 });
  expect(badField.status).toBe(422);
  expect(badField.body).toEqual({ detail: [{ type: "string_type", loc: ["body", "email"], msg: "Input should be a valid string", input: 42 }] });
  const malformed = await request(app).post("/native").type("application/json").send("{");
  expect(malformed.status).toBe(422); expect((malformed.body as { detail: FastApiErrorItem[] }).detail[0]?.type).toBe("json_invalid");
  for (const body of ["{", "{}"]) {
    const override = await request(app).post("/native-override").type("application/json").send(body);
    expect(override.status).toBe(400); expect(override.body).toEqual({ detail: "Override" });
  }
  const media = await request(app).post("/native").type("text/plain").send("data");
  expect(media.status).toBe(422); expect((media.body as { detail: FastApiErrorItem[] }).detail[0]?.type).toBe("model_attributes_type");
});

test("native param and query failures are tested separately (F11 validator ordering)", async () => {
  // @hono/zod-openapi runs route.middleware before validators, then query before
  // params. Legacy routes explicitly retain params -> query -> body ordering.
  const app = createApp(deps(), app => {
    app.openapi(createRoute({ method: "get", path: "/native/{id}", request: { params: z.object({ id: z.string().regex(/^\d+$/) }), query: z.object({ q: z.string() }) }, responses: { 200: { description: "OK" } } }), c => c.json({ ok: true }));
    app.openapi(createRoute({ method: "post", path: "/native-empty", request: { body: { required: true, content: { "application/json": { schema: z.object({ email: z.string() }) } } } }, responses: { 200: { description: "OK" } } }), c => c.json({ ok: true }));
  });
  const param = await request(app).get("/native/bad?q=valid");
  expect(param.status).toBe(422);
  expect((param.body as { detail: FastApiErrorItem[] }).detail[0]?.loc).toEqual(["path", "id"]);
  const query = await request(app).get("/native/1");
  expect(query.status).toBe(422);
  expect((query.body as { detail: FastApiErrorItem[] }).detail[0]?.loc).toEqual(["query", "q"]);
  const empty = await request(app).post("/native-empty");
  expect(empty.status).toBe(422);
  expect((empty.body as { detail: FastApiErrorItem[] }).detail[0]?.type).toBe("missing");
});

test("legacy JSON route maps non-JSON media to a model_attributes_type 422", async () => {
  const app = createApp(deps(), (app, d) => { route(app, d, { ...base, body: z.object({ email: z.string() }), handler: () => Promise.resolve(null) }); });
  const response = await request(app).post("/test").type("text/plain").send("plain body");
  expect(response.status).toBe(422);
  expect(response.body).toEqual({ detail: [{ type: "model_attributes_type", loc: ["body"], msg: "Input should be a valid dictionary or object to extract fields from", input: "plain body" }] });
});

 test("legacy JSON media types are case insensitive", async () => {
  const app = createApp(deps(), (router, d) => {
    route(router, d, { ...base, body: z.object({ value: z.string() }), handler: ({ body }) => Promise.resolve(body) });
  });
  const r = await app.request("/test", { method: "POST", headers: { "Content-Type": "Application/JSON" }, body: '{"value":"ok"}' });
  expect(r.status).toBe(200); expect(await r.json()).toEqual({ value: "ok" });
});
