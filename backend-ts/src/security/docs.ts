import type { AppRouter, AppDeps } from "../app";
import { z } from "@hono/zod-openapi";
// swagger-ui-dist ships the browser assets without TypeScript declarations.
import { createRequire } from "node:module";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const swagger = require("swagger-ui-dist") as { getAbsoluteFSPath(): string };
const tags = [
  { name: "authentication", description: "User authentication and authorization. Includes login, registration, and token management." },
  { name: "events", description: "Event management operations. Create, update, delete events and manage event categories." },
  { name: "members", description: "Club member management. View members, leaderboard, and project contributions." },
  { name: "projects", description: "Project management and CRUD operations. Includes project categories and team member management." },
  { name: "sponsors", description: "Sponsor management. Create, update sponsors and manage sponsor categories." },
  { name: "users", description: "User account management. Profile updates, password changes, and user administration." },
  { name: "system", description: "System utilities. File uploads, health checks, and system information." },
];

export function registerDocs(app: AppRouter, deps: AppDeps): void {
  app.openAPIRegistry.registerComponent("securitySchemes", "OAuth2PasswordBearer", { type: "oauth2", flows: { password: { tokenUrl: "auth/login", scopes: {} } } });
  app.openAPIRegistry.register("HTTPValidationError", z.object({ detail: z.array(z.object({ type: z.string(), loc: z.array(z.union([z.string(), z.number()])), msg: z.string(), input: z.unknown().optional() })) }));
  app.openAPIRegistry.registerComponent("responses", "HTTPValidationError", { description: "Validation Error", content: { "application/json": { schema: { $ref: "#/components/schemas/HTTPValidationError" } } } });
  if (!deps.env.DOCS_ENABLED) return;
  app.get("/openapi.json", c => { c.header("Cache-Control", "no-store"); return c.json(app.getOpenAPI31Document({ openapi: "3.1.0", info: { title: "MACS API", version: "1.0.0", description: "MACS Kulübü Web Sitesi Backend API - RESTful API for managing club events, projects, members, and sponsors." }, tags })); });
  app.use("/docs*", async (c, next) => { c.header("Cache-Control", "no-store"); await next(); });
  app.get("/docs", c => c.redirect(`/docs/${new URL(c.req.url).search}`, 301));
  app.get("/docs/", c => {
    c.header("Cache-Control", "no-store");
    return c.html('<!doctype html><html><head><title>MACS API</title><link rel="stylesheet" href="./swagger-ui.css"><link rel="icon" href="./favicon-32x32.png"><link rel="icon" href="./favicon-16x16.png"></head><body><div id="swagger-ui"></div><script src="./swagger-ui-bundle.js"></script><script src="./swagger-ui-standalone-preset.js"></script><script src="./swagger-ui-init.js"></script></body></html>');
  });
  app.get("/docs/:asset", async c => {
    if (c.req.param("asset") === "swagger-ui-init.js") return c.body('SwaggerUIBundle({url:"/openapi.json",dom_id:"#swagger-ui",presets:[SwaggerUIBundle.presets.apis,SwaggerUIStandalonePreset],layout:"StandaloneLayout"})', 200, { "Content-Type": "application/javascript" });
    const file = Bun.file(join(swagger.getAbsoluteFSPath(), c.req.param("asset")));
    if (!await file.exists()) return c.notFound();
    c.header("Cache-Control", "no-store"); c.header("Content-Type", file.type);
    return c.body(file.stream());
  });
}
