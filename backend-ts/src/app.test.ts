import { afterAll, expect, test } from "bun:test";
import { z } from "zod";
import request from "../test/helpers/http";
import { route } from "../test/helpers/native-route";
import { createApp } from "./app";
import { parseEnv } from "./config/env";
import { createResponseCache } from "./lib/cache";
import { testDeps } from "../test/helpers/app";

type OpenAPIObject = ReturnType<ReturnType<typeof createApp>["getOpenAPI31Document"]>;
type ResponseObject = { content?: Record<string, { schema?: object }> };
type ParameterObject = { name: string; in: string; required?: boolean };

const env = parseEnv({ DATABASE_URL: "postgresql://u:p@db:5432/x", JWT_SECRET_KEY: "x".repeat(32), NODE_ENV: "test" });
const app = createApp(testDeps({ env }));

test("GET / returns welcome", async () => {
  const response = await request(app).get("/");
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ message: "MACS Kulubu Web Sitesine hosgeldiniz!" });
});

test("GET /health", async () => {
  const response = await request(app).get("/health");
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: "ok" });
});

test("system responses omit framework and automatic cache headers", async () => {
  const response = await request(app).get("/health");
  expect(response.headers["x-powered-by"]).toBeUndefined();
  expect(response.headers.etag).toBeUndefined();
});

test("Hono fetch shell ignores forwarded spoofing", async () => {
  expect(typeof app.fetch).toBe("function");
  const response = await app.request("/health", { headers: { "X-Forwarded-For": "192.0.2.10" } });
  expect(response.status).toBe(200);
  expect(response.headers.get("Server")).toBeNull();
});

test("global and write limiters use real IP and run before route parsing", async () => {
  const deps = testDeps({ env: { ...env, RATELIMIT_ENABLED: true }, security: { globalRateLimit: { ratePerMin: 1, burst: 2 }, writeRateLimit: { ratePerMin: 1, burst: 1 } } });
  const app = createApp(deps);
  const first = await request(app).get("/health").set("X-Forwarded-For", "192.0.2.1");
  expect(first.status).toBe(200);
  expect((await request(app).get("/health").set("X-Forwarded-For", "192.0.2.2")).status).toBe(200);
  expect((await request(app).get("/health").set("X-Forwarded-For", "192.0.2.3")).status).toBe(429);
  expect((await request(app).get("/health").set("X-Real-IP", "192.0.2.3")).status).toBe(200);
  const write = await request(app).post("/auth/register").set("X-Real-IP", "192.0.2.4").type("application/json").send("{");
  expect(write.status).toBe(422);
  const limited = await request(app).post("/auth/register").set("X-Real-IP", "192.0.2.4").send({});
  expect(limited.status).toBe(429);
  expect(limited.body).toEqual({ error: "Rate limit exceeded: 1 per 1 minute" });
  await deps.sql.end();
});
test("handler timeout returns JSON 503 with CORS and security headers", async () => {
  const deps = testDeps({ env, security: { handlerTimeoutMs: 5 } });
  const app = createApp(deps, app => { app.get("/slow", async c => { await new Promise(resolve => setTimeout(resolve, 30)); return c.json({ ok: true }); }); });
  const response = await request(app).get("/slow").set("Origin", env.CORS_ORIGINS[0] ?? "");
  expect(response.status).toBe(503); expect(response.body).toEqual({ detail: "Service Unavailable" });
  expect(response.headers["access-control-allow-origin"]).toBe(env.CORS_ORIGINS[0]);
  expect(response.headers["content-security-policy"]).toBe("default-src 'none'; frame-ancestors 'none'");
  await deps.sql.end();
});
test("production docs are disabled by default, and an explicit override enables them", async () => {
  for (const enabled of [false, true]) {
    const production = parseEnv({ DATABASE_URL: env.DATABASE_URL, JWT_SECRET_KEY: env.JWT_SECRET_KEY, NODE_ENV: "production", ...(enabled ? { DOCS_ENABLED: "true" } : {}) });
    const deps = testDeps({ env: production }); const app = createApp(deps);
    for (const path of ["/docs", "/docs/", "/openapi.json"]) {
      const response = await request(app).get(path);
      expect(response.status).toBe(enabled ? path === "/docs" ? 301 : 200 : 404);
    }
    await deps.sql.end();
  }
});

{
const deps = testDeps({ cache: createResponseCache({ max: 500, ttlMs: 60_000, now: Date.now, enabled: true }) });
const docsApp = createApp(deps);
afterAll(() => deps.sql.end());
const docsDocument = await (await docsApp.request("/openapi.json")).text();
const document = () => JSON.parse(docsDocument) as OpenAPIObject;
test("OpenAPI 3.1 info matches FastAPI", () => {
  const doc = document();
  expect(doc.openapi).toBe("3.1.0");
  expect(doc.info).toEqual({ title: "MACS API", version: "1.0.0", description: "MACS Kulübü Web Sitesi Backend API - RESTful API for managing club events, projects, members, and sponsors." });
});
test("all 63 operations document tags and responses", () => {
  const doc = document();
  const operations = Object.values(doc.paths ?? {}).flatMap(path => ["get", "post", "put", "patch", "delete"].flatMap(method => { const operation = path[method as "get"]; return operation ? [operation] : []; }));
  expect(operations).toHaveLength(63);
  for (const operation of operations) {
    expect(operation.summary).toBeTruthy(); expect(operation.tags).toHaveLength(1);
    expect(operation.responses).toBeDefined();
    if (operation.responses?.["204"]) expect(operation.responses["204"]).not.toHaveProperty("content");
    else expect(operation.responses?.["200"] ?? operation.responses?.["201"]).toHaveProperty("content");
  }
  expect(doc.paths?.["/users/me"]?.get?.security).toEqual([{ OAuth2PasswordBearer: [] }]);
  expect(doc.paths?.["/events"]?.get?.security).toBeUndefined();
  expect(doc.paths?.["/events/{event_id}"]).toBeDefined();
  expect(doc.paths?.["/docs"]).toBeUndefined();
  expect(doc.paths?.["/openapi.json"]).toBeUndefined();
});
test("seven described tags and OAuth2 password security", () => {
  const doc = document();
  expect(doc.tags?.map(tag => tag.name).sort()).toEqual(["authentication", "events", "members", "projects", "sponsors", "system", "users"]);
  expect(doc.tags?.every(tag => Boolean(tag.description))).toBe(true);
  expect(doc.components?.securitySchemes?.OAuth2PasswordBearer).toEqual({ type: "oauth2", flows: { password: { tokenUrl: "auth/login", scopes: {} } } });
});
test("form, JSON, multipart binary and ZIP metadata", () => {
  const doc = document();
  const login = doc.paths?.["/auth/login"]?.post?.requestBody;
  expect(login && "content" in login && Object.keys(login.content)).toEqual(["application/x-www-form-urlencoded"]);
  const json = doc.paths?.["/events"]?.post?.requestBody;
  expect(json && "content" in json && Object.keys(json.content)).toEqual(["application/json"]);
  const upload = doc.paths?.["/api/upload/"]?.post?.requestBody;
  expect(upload && "content" in upload && upload.content["multipart/form-data"]?.schema).toEqual({ type: "object", required: ["file"], properties: { file: { type: "string", format: "binary" } } });
  const zip = doc.paths?.["/api/upload/download-all"]?.get?.responses?.["200"] as ResponseObject | undefined;
  expect(zip && "content" in zip && zip.content["application/zip"]?.schema).toEqual({ type: "string", format: "binary" });
});
test("parameters and shared validation response", () => {
  const doc = document();
  expect(doc.paths?.["/events/{event_id}"]?.get?.parameters?.map(p => ({ name: (p as ParameterObject).name, in: (p as ParameterObject).in, required: (p as ParameterObject).required }))).toContainEqual({ name: "event_id", in: "path", required: true });
  expect(doc.paths?.["/events"]?.get?.parameters?.map(p => ({ name: (p as ParameterObject).name, in: (p as ParameterObject).in }))).toContainEqual({ name: "limit", in: "query" });
  expect(doc.paths?.["/auth/login"]?.post?.responses?.["422"]).toEqual({ $ref: "#/components/responses/HTTPValidationError" });
  expect(doc.components?.schemas?.HTTPValidationError).toBeDefined();
});
test("two apps have independent registries and documents", async () => {
  const other = testDeps();
  try {
    const second = createApp(other, (router, own) => { route(router, own, { method: "get", path: "/only-second", domain: "system", tag: "system", summary: "Second app", response: z.string(), handler: () => Promise.resolve("second") }); });
    expect(second.getOpenAPI31Document({ openapi: "3.1.0", info: { title: "Test", version: "1" } }).paths?.["/only-second"]?.get).toBeDefined();
    expect(document().paths?.["/only-second"]).toBeUndefined();
    expect((await request(second).get("/openapi.json")).text).toContain("/only-second");
    expect((await request(docsApp).get("/openapi.json")).text).not.toContain("/only-second");
    expect(Object.values(document().paths ?? {}).flatMap(p => Object.keys(p))).toHaveLength(63);
  } finally { await other.sql.end(); }
});
test("public local Swagger assets and docs bypass cache; redoc 404", async () => {
  for (const path of ["/openapi.json", "/docs/", "/docs/swagger-ui.css", "/docs/swagger-ui-bundle.js", "/docs/swagger-ui-init.js"]) {
    const res = await request(docsApp).get(path);
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.headers["x-cache"]).toBeUndefined();
    if (path === "/docs/") { expect(res.text).toContain("swagger-ui"); expect(res.text).not.toMatch(/https?:\/\/[^"']+\.(js|css)/); }
    if (path.endsWith("init.js")) expect(res.text).toContain("/openapi.json");
  }
  expect(deps.cache.size()).toBe(0);
  expect((await request(docsApp).get("/redoc")).status).toBe(404);
});

test("exact /docs redirects to /docs/ and preserves the raw query string", async () => {
  for (const query of ["", "?url=%2Fopenapi.json&filter=a%20b&filter=c", "?next=https%3A%2F%2Fexample.com%2Fx%3Fy%3D1"]) {
    const res = await request(docsApp).get(`/docs${query}`);
    expect(res.status).toBe(301);
    expect(res.headers["location"]).toBe(`/docs/${query}`);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.headers["x-cache"]).toBeUndefined();
  }
});
test("every relative Swagger HTML asset resolves successfully from /docs/", async () => {
  const html = await request(docsApp).get("/docs/");
  expect(html.status).toBe(200);
  expect(html.headers["content-type"]).toContain("text/html");
  const assets = [...html.text.matchAll(/\b(?:src|href)\s*=\s*["'](\.\/[^"']+)["']/g)].map(match => match[1]);
  expect(assets.length).toBeGreaterThanOrEqual(6);
  for (const asset of assets) {
    const url = new URL(asset ?? "", "http://localhost/docs/");
    expect(url.pathname.startsWith("/docs/")).toBe(true);
    const res = await request(docsApp).get(url.pathname + url.search);
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.headers["x-cache"]).toBeUndefined();
  }
  expect(deps.cache.size()).toBe(0);
});

}

