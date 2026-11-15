import type { AppRouter, AppDeps } from "../app";
import { buildOpenApiDocument } from "../lib/openapi";
// swagger-ui-dist ships the browser assets without TypeScript declarations.
import { createRequire } from "node:module";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const swagger = require("swagger-ui-dist") as { getAbsoluteFSPath(): string };
export function registerDocs(app: AppRouter, deps: AppDeps): void {
  const document = buildOpenApiDocument(deps.routeRegistry);
  for (const [name, value] of Object.entries(document.components?.schemas ?? {})) app.openAPIRegistry.registerComponent("schemas", name, value);
  for (const [name, value] of Object.entries(document.components?.responses ?? {})) app.openAPIRegistry.registerComponent("responses", name, value);
  for (const [name, value] of Object.entries(document.components?.securitySchemes ?? {})) app.openAPIRegistry.registerComponent("securitySchemes", name, value);
  if (!deps.env.DOCS_ENABLED) return;
  app.get("/openapi.json", c => { c.header("Cache-Control", "no-store"); return c.json(app.getOpenAPI31Document({ openapi: "3.1.0", info: document.info, tags: document.tags ?? [] })); });
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
