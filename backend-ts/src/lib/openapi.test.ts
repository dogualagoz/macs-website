import { afterAll, expect, test } from "bun:test";
import request from "supertest";
import type { ResponseObject, ParameterObject } from "openapi3-ts/oas31";
import { z } from "zod";
import { createApp } from "../app";
import { testDeps } from "../../test/helpers/app";
import { createResponseCache } from "./cache";
import { route } from "./route";
import { buildOpenApiDocument, toOpenApiPath } from "./openapi";
const deps = testDeps({ cache: createResponseCache({ max: 500, ttlMs: 60_000, now: Date.now, enabled: true }) });
const app = createApp(deps);
afterAll(() => deps.sql.end());
const document = () => buildOpenApiDocument(deps.routeRegistry);
test("OpenAPI 3.1 info matches FastAPI", () => {
  const doc = document();
  expect(doc.openapi).toBe("3.1.0");
  expect(doc.info).toEqual({ title: "MACS API", version: "1.0.0", description: "MACS Kulübü Web Sitesi Backend API - RESTful API for managing club events, projects, members, and sponsors." });
});
test("all 63 operations document tags and responses", () => {
  const doc = document();
  expect(deps.routeRegistry).toHaveLength(63);
  expect(Object.values(doc.paths ?? {}).flatMap(path => Object.keys(path))).toHaveLength(63);
  for (const meta of deps.routeRegistry) {
    const operation = doc.paths?.[toOpenApiPath(meta.path)]?.[meta.method];
    expect(operation?.summary).toBe(meta.summary);
    expect(operation?.tags).toEqual([meta.tag]);
    const response = operation?.responses?.[String(meta.status ?? 200)] as ResponseObject | undefined;
    expect(response).toBeDefined();
    if (meta.status !== 204) expect(response && "content" in response && response.content).toBeTruthy();
    else expect(response && "content" in response).toBe(false);
    expect(operation?.security).toEqual(meta.auth === undefined ? undefined : [{ OAuth2PasswordBearer: [] }]);
  }
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
    expect(buildOpenApiDocument(other.routeRegistry).paths?.["/only-second"]?.get).toBeDefined();
    expect(document().paths?.["/only-second"]).toBeUndefined();
    expect((await request(second).get("/openapi.json")).text).toContain("/only-second");
    expect((await request(app).get("/openapi.json")).text).not.toContain("/only-second");
    expect(deps.routeRegistry).toHaveLength(63);
  } finally { await other.sql.end(); }
});
test("public local Swagger assets and docs bypass cache; redoc 404", async () => {
  for (const path of ["/openapi.json", "/docs/", "/docs/swagger-ui.css", "/docs/swagger-ui-bundle.js", "/docs/swagger-ui-init.js"]) {
    const res = await request(app).get(path);
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.headers["x-cache"]).toBeUndefined();
    if (path === "/docs/") { expect(res.text).toContain("swagger-ui"); expect(res.text).not.toMatch(/https?:\/\/[^"']+\.(js|css)/); }
    if (path.endsWith("init.js")) expect(res.text).toContain("/openapi.json");
  }
  expect(deps.cache.size()).toBe(0);
  expect((await request(app).get("/redoc")).status).toBe(404);
});

test("exact /docs redirects to /docs/ and preserves the raw query string", async () => {
  for (const query of ["", "?url=%2Fopenapi.json&filter=a%20b&filter=c", "?next=https%3A%2F%2Fexample.com%2Fx%3Fy%3D1"]) {
    const res = await request(app).get(`/docs${query}`);
    expect(res.status).toBe(301);
    expect(res.headers["location"]).toBe(`/docs/${query}`);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.headers["x-cache"]).toBeUndefined();
  }
});
test("every relative Swagger HTML asset resolves successfully from /docs/", async () => {
  const html = await request(app).get("/docs/");
  expect(html.status).toBe(200);
  expect(html.headers["content-type"]).toContain("text/html");
  const assets = [...html.text.matchAll(/\b(?:src|href)\s*=\s*["'](\.\/[^"']+)["']/g)].map(match => match[1]);
  expect(assets.length).toBeGreaterThanOrEqual(6);
  for (const asset of assets) {
    const url = new URL(asset ?? "", "http://localhost/docs/");
    expect(url.pathname.startsWith("/docs/")).toBe(true);
    const res = await request(app).get(url.pathname + url.search);
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.headers["x-cache"]).toBeUndefined();
  }
  expect(deps.cache.size()).toBe(0);
});
