import { z } from "@hono/zod-openapi";
import type { AppDeps, AppRouter } from "../app";
import type { Domain } from "./cache";
import type { Role } from "../middleware/auth";
export interface RouteMeta {
  method: "get" | "post" | "put" | "patch" | "delete";
  path: string;
  domain: Domain;
  tag: string;
  summary: string;
  auth?: "user" | readonly Role[];
  public?: boolean;
  params?: z.ZodType;
  query?: z.ZodType;
  body?: z.ZodType;
  bodyKind?: "json" | "form";
  upload?: { field: string; maxBytes: number };
  status?: number;
  response?: z.ZodType;
  responseMediaType?: string;
}

export function registerRouteMetadata(app: AppRouter, _deps: AppDeps, meta: RouteMeta): void {
  app.openAPIRegistry.registerPath({ method: meta.method, path: meta.path.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, "{$1}"),
    tags: [meta.tag], summary: meta.summary,
    ...(meta.auth ? { security: [{ OAuth2PasswordBearer: [] }] } : {}),
    request: { ...(meta.upload ? { body: { required: true, content: { "multipart/form-data": { schema: z.object({ file: z.string().meta({ format: "binary" }) }) } } } } : {}) },
    responses: { [meta.status ?? 200]: { description: "Successful Response", ...(meta.response ? { content: { [meta.responseMediaType ?? "application/json"]: { schema: meta.response } } } : {}) , }, ...(meta.upload ? { 422: { $ref: "#/components/responses/HTTPValidationError" } } : {}) },
  });
}
