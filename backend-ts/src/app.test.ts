import { afterAll, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  const first = await request(app).get("/").set("X-Forwarded-For", "192.0.2.1");
  expect(first.status).toBe(200);
  expect((await request(app).get("/").set("X-Forwarded-For", "192.0.2.2")).status).toBe(200);
  expect((await request(app).get("/").set("X-Forwarded-For", "192.0.2.3")).status).toBe(429);
  expect((await request(app).get("/").set("X-Real-IP", "192.0.2.3")).status).toBe(200);
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


test("normalizing Content-Type preserves caller Request headers", async () => {
  const req = new Request("http://localhost/auth/register", { method: "POST", headers: { "Content-Type": "Application/JSON" }, body: "{}" });
  await app.fetch(req);
  expect(req.headers.get("Content-Type")).toBe("Application/JSON");
});
test("HEAD on a missing docs asset remains 404 rather than 405, and notFound precompiles route regexes once", async () => {
  expect((await app.request("/docs/missing.js", { method: "HEAD" })).status).toBe(404);
  const isolatedDeps = testDeps({ env });
  try {
    const isolatedApp = createApp(isolatedDeps);
    isolatedApp.routes.length = 0;
    const methodNotAllowed = await isolatedApp.request("/health", { method: "POST" });
    expect(methodNotAllowed.status).toBe(405);
    expect(methodNotAllowed.headers.get("Allow")).toBe("GET");
  } finally {
    await isolatedDeps.sql.end();
  }
});
test("static and uploads mounts enforce resolved-prefix containment", async () => {
  for (const path of ["/uploads/%2f", "/static/%2f"]) {
    const res = await app.request(path);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ detail: "Bad Request" });
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
const EXPECTED_OPERATIONS = [
  ["post", "/auth/register", "authentication", "Kullanıcı kaydı", 200, false],
  ["post", "/auth/register/admin", "authentication", "Admin kaydı", 200, false],
  ["post", "/auth/login", "authentication", "Kullanıcı girişi", 200, false],
  ["get", "/events/categories", "events", "Etkinlik kategorileri", 200, false],
  ["post", "/events/categories", "events", "Kategori oluştur", 201, true],
  ["get", "/events/categories/{category_id}", "events", "Kategori detayı", 200, false],
  ["put", "/events/categories/{category_id}", "events", "Kategori güncelle", 200, true],
  ["delete", "/events/categories/{category_id}", "events", "Kategori sil", 204, true],
  ["get", "/events", "events", "Etkinlik listesi", 200, false],
  ["get", "/events/admin", "events", "Yönetici etkinlik listesi", 200, true],
  ["get", "/events/featured", "events", "Öne çıkan etkinlik", 200, false],
  ["get", "/events/by-slug/{slug}", "events", "Slug ile etkinlik", 200, false],
  ["post", "/events", "events", "Etkinlik oluştur", 201, true],
  ["get", "/events/{event_id}", "events", "Etkinlik detayı", 200, false],
  ["put", "/events/{event_id}", "events", "Etkinlik güncelle", 200, true],
  ["delete", "/events/{event_id}", "events", "Etkinliği arşivle", 200, true],
  ["delete", "/events/{event_id}/hard", "events", "Etkinliği kalıcı sil", 204, true],
  ["get", "/members", "members", "Üye listesi", 200, false],
  ["get", "/members/leaderboard", "members", "Üye sıralaması", 200, false],
  ["get", "/members/{member_id}", "members", "Üye detayı", 200, false],
  ["get", "/members/{member_id}/stats", "members", "Üye istatistikleri", 200, false],
  ["get", "/members/{member_id}/projects", "members", "Üyenin proje üyelikleri", 200, false],
  ["post", "/members", "members", "Üye oluştur", 201, true],
  ["put", "/members/{member_id}", "members", "Üye güncelle", 200, true],
  ["delete", "/members/{member_id}", "members", "Üye sil", 204, true],
  ["get", "/projects/categories", "projects", "Proje kategorileri", 200, false],
  ["post", "/projects/categories", "projects", "Kategori oluştur", 201, true],
  ["get", "/projects/categories/{category_id}", "projects", "Kategori detayı", 200, false],
  ["put", "/projects/categories/{category_id}", "projects", "Kategori güncelle", 200, true],
  ["delete", "/projects/categories/{category_id}", "projects", "Kategori sil", 204, true],
  ["get", "/projects", "projects", "Proje listesi", 200, false],
  ["get", "/projects/admin", "projects", "Yönetici proje listesi", 200, true],
  ["get", "/projects/featured", "projects", "Öne çıkan proje", 200, false],
  ["get", "/projects/by-slug/{slug}", "projects", "Slug ile proje", 200, false],
  ["post", "/projects", "projects", "Proje oluştur", 201, true],
  ["get", "/projects/{project_id}", "projects", "Proje detayı", 200, false],
  ["put", "/projects/{project_id}", "projects", "Proje güncelle", 200, true],
  ["delete", "/projects/{project_id}", "projects", "Projeyi arşivle", 204, true],
  ["delete", "/projects/{project_id}/hard", "projects", "Projeyi kalıcı sil", 204, true],
  ["get", "/projects/{project_id}/members", "projects", "Proje üyeleri", 200, false],
  ["post", "/projects/{project_id}/members", "projects", "Projeye üye ekle", 201, true],
  ["put", "/projects/{project_id}/members/{member_id}", "projects", "Proje üyesini güncelle", 200, true],
  ["delete", "/projects/{project_id}/members/{member_id}", "projects", "Proje üyesini çıkar", 204, true],
  ["get", "/sponsors/", "sponsors", "Sponsor listesi", 200, false],
  ["get", "/sponsors/categories", "sponsors", "Sponsor kategorileri", 200, false],
  ["post", "/sponsors/geocode", "sponsors", "Adres koordinatları", 200, true],
  ["get", "/sponsors/{sponsor_id}", "sponsors", "Sponsor detayı", 200, false],
  ["post", "/sponsors/", "sponsors", "Sponsor oluştur", 201, true],
  ["put", "/sponsors/{sponsor_id}", "sponsors", "Sponsor güncelle", 200, true],
  ["delete", "/sponsors/{sponsor_id}", "sponsors", "Sponsor sil", 204, true],
  ["get", "/", "system", "Welcome", 200, false],
  ["get", "/health", "system", "Liveness", 200, false],
  ["get", "/health/ready", "system", "Readiness", 200, false],
  ["post", "/api/upload/", "system", "Resim yükle", 200, true],
  ["get", "/api/upload/download-all", "system", "Yüklemeleri ZIP olarak indir", 200, true],
  ["get", "/users/me", "users", "Profil", 200, true],
  ["put", "/users/me", "users", "Profil güncelle", 200, true],
  ["post", "/users/me/change-password", "users", "Şifre değiştir", 200, true],
  ["delete", "/users/me", "users", "Hesabımı sil", 200, true],
  ["get", "/users", "users", "Kullanıcı listesi", 200, true],
  ["get", "/users/{user_id}", "users", "Kullanıcı detayı", 200, true],
  ["patch", "/users/{user_id}/access", "users", "Erişim ayarları", 200, true],
  ["delete", "/users/{user_id}", "users", "Kullanıcı sil", 200, true],
] as const;

test("all 63 operations document tags and responses", () => {
  const doc = document();
  expect(EXPECTED_OPERATIONS).toHaveLength(63);
  expect(Object.values(doc.paths ?? {}).flatMap(path => ["get", "post", "put", "patch", "delete"].flatMap(method => (path[method as "get"] ? [path[method as "get"]] : [])))).toHaveLength(63);
  for (const [method, path, tag, summary, status, secured] of EXPECTED_OPERATIONS) {
    const operation = doc.paths?.[path]?.[method];
    expect(operation?.summary).toBe(summary);
    expect(operation?.tags).toEqual([tag]);
    const response = operation?.responses?.[String(status)] as ResponseObject | undefined;
    expect(response).toBeDefined();
    if (status !== 204) expect(response && "content" in response && response.content).toBeTruthy();
    else expect(response && "content" in response).toBe(false);
    expect(operation?.security).toEqual(secured ? [{ OAuth2PasswordBearer: [] }] : undefined);
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

test("HEAD ZIP authenticates and lists but never resolves or opens file paths", async () => {
  const { signAccessToken } = await import("./lib/jwt");
  const admin = { id: 1, email: "head@example.com", full_name: "Admin", role: "admin", status: "approved", is_active: true, last_login: null, failed_login_attempts: 0, password_changed_at: null };
  const deps = testDeps({ env, loadUser: () => Promise.resolve(admin) });
  deps.storage = { ...deps.storage, list: () => Promise.resolve(["missing-file.png"]), path: () => { throw new Error("HEAD must not open files"); } };
  try {
    const token = await signAccessToken({ sub: admin.email, role: "admin" }, env.JWT_SECRET_KEY, 60, new Date());
    const response = await createApp(deps).request("/api/upload/download-all", { method: "HEAD", headers: { Authorization: `Bearer ${token}` } });
    expect(response.status).toBe(200); expect(await response.text()).toBe("");
    expect(response.headers.get("Content-Type")).toBe("application/zip");
  } finally { await deps.sql.end(); }
});

test("E2: /uploads, /static, and /health* bypass global limiter, preserve guards/headers, and sustained API abuse hits 429", async () => {
  const root = mkdtempSync(join(tmpdir(), "macs-e2-"));
  const uploadDir = join(root, "uploads");
  const staticDir = join(root, "static");
  mkdirSync(uploadDir, { recursive: true });
  mkdirSync(staticDir, { recursive: true });
  writeFileSync(join(uploadDir, "img.png"), Buffer.from([137, 80, 78, 71]));
  writeFileSync(join(staticDir, "app.css"), "body{}");
  const natEnv = { ...env, RATELIMIT_ENABLED: true, UPLOAD_DIR: uploadDir, STATIC_DIR: staticDir };
  const tightDeps = testDeps({ env: natEnv, security: { globalRateLimit: { ratePerMin: 1, burst: 5 } }, now: () => new Date("2026-11-15T00:00:00Z") });
  const defaultDeps = testDeps({ env: natEnv, now: () => new Date("2026-11-15T00:00:00Z") });
  try {
    const tightApp = createApp(tightDeps);
    for (let i = 0; i < 40; i++) {
      const up = await request(tightApp).get("/uploads/img.png").set("X-Real-IP", "198.51.100.10");
      expect(up.status).toBe(200);
      expect(up.headers["x-content-type-options"]).toBe("nosniff");
    }
    expect((await request(tightApp).get("/static/app.css").set("X-Real-IP", "198.51.100.10")).status).toBe(200);
    for (let i = 0; i < 10; i++) {
      expect((await request(tightApp).get("/health").set("X-Real-IP", "198.51.100.10")).status).toBe(200);
      expect((await request(tightApp).get("/health/ready").set("X-Real-IP", "198.51.100.10")).status).toBe(503);
    }
    // Request head guard still blocks exempt prefixes
    expect((await request(tightApp).get(`/uploads/${"a".repeat(2100)}`).set("X-Real-IP", "198.51.100.10")).status).toBe(414);
    // All 5 API burst tokens remain intact after 40+ exempt hits
    for (let i = 0; i < 5; i++) {
      expect((await request(tightApp).get("/").set("X-Real-IP", "198.51.100.10")).status).toBe(200);
    }
    expect((await request(tightApp).get("/").set("X-Real-IP", "198.51.100.10")).status).toBe(429);

    // Browser-like burst under default limits (10 API calls + 40 upload images) succeeds, while >200 sustained API hits return 429
    const defaultApp = createApp(defaultDeps);
    for (let i = 0; i < 10; i++) expect((await request(defaultApp).get("/").set("X-Real-IP", "198.51.100.20")).status).toBe(200);
    for (let i = 0; i < 40; i++) expect((await request(defaultApp).get("/uploads/img.png").set("X-Real-IP", "198.51.100.20")).status).toBe(200);
    for (let i = 0; i < 190; i++) expect((await request(defaultApp).get("/").set("X-Real-IP", "198.51.100.20")).status).toBe(200);
    const abused = await request(defaultApp).get("/").set("X-Real-IP", "198.51.100.20");
    expect(abused.status).toBe(429);
    expect(abused.body).toEqual({ error: "Rate limit exceeded: 1200 per 1 minute" });
  } finally {
    rmSync(root, { recursive: true, force: true });
    await tightDeps.sql.end();
    await defaultDeps.sql.end();
  }
});

test("D1: HEAD parity on /uploads/* and /static/* via Bun.serve matches GET headers without body or full read", async () => {
  const root = mkdtempSync(join(tmpdir(), "macs-d1-"));
  const uploadDir = join(root, "uploads");
  const staticDir = join(root, "static");
  mkdirSync(uploadDir, { recursive: true });
  mkdirSync(staticDir, { recursive: true });
  const pngBytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]);
  const cssBytes = Buffer.from("body { color: red; }\n");
  writeFileSync(join(uploadDir, "logo.png"), pngBytes);
  writeFileSync(join(staticDir, "site.css"), cssBytes);
  const deps = testDeps({ env: { ...env, UPLOAD_DIR: uploadDir, STATIC_DIR: staticDir } });
  const testApp = createApp(deps);
  const server = Bun.serve({ port: 0, fetch: req => testApp.fetch(req) });
  try {
    for (const [path, expectedBytes, expectedType] of [
      ["/uploads/logo.png", pngBytes, "image/png"],
      ["/static/site.css", cssBytes, "text/css"],
    ] as const) {
      const getRes = await fetch(`${server.url}${path.slice(1)}`);
      const headRes = await fetch(`${server.url}${path.slice(1)}`, { method: "HEAD" });
      const getBody = Buffer.from(await getRes.arrayBuffer());
      const headBody = Buffer.from(await headRes.arrayBuffer());
      expect(getRes.status).toBe(200);
      expect(headRes.status).toBe(200);
      expect(getBody).toEqual(expectedBytes);
      expect(headBody.byteLength).toBe(0);
      expect(headRes.headers.get("Content-Type")).toBe(expectedType);
      expect(headRes.headers.get("Content-Type")).toBe(getRes.headers.get("Content-Type"));
      expect(headRes.headers.get("Content-Length")).toBe(String(expectedBytes.byteLength));
      expect(headRes.headers.get("Content-Length")).toBe(getRes.headers.get("Content-Length"));
      expect(headRes.headers.get("Cache-Control")).toBe(getRes.headers.get("Cache-Control"));
    }
    expect((await fetch(`${server.url}uploads/missing.png`, { method: "HEAD" })).status).toBe(404);
    expect((await fetch(`${server.url}static/.secret`, { method: "HEAD" })).status).toBe(404);
  } finally {
    await server.stop(true);
    rmSync(root, { recursive: true, force: true });
    await deps.sql.end();
  }
});
