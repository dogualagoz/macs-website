import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import type { OpenAPIObject } from "openapi3-ts/oas31";
import { z } from "zod";
import type { RouteMeta } from "./route";

extendZodWithOpenApi(z);
export type { OpenAPIObject } from "openapi3-ts/oas31";

const tags = [
  { name: "authentication", description: "User authentication and authorization. Includes login, registration, and token management." },
  { name: "events", description: "Event management operations. Create, update, delete events and manage event categories." },
  { name: "members", description: "Club member management. View members, leaderboard, and project contributions." },
  { name: "projects", description: "Project management and CRUD operations. Includes project categories and team member management." },
  { name: "sponsors", description: "Sponsor management. Create, update sponsors and manage sponsor categories." },
  { name: "users", description: "User account management. Profile updates, password changes, and user administration." },
  { name: "system", description: "System utilities. File uploads, health checks, and system information." },
];

export function toOpenApiPath(path: string): string {
  return path.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, "{$1}");
}

function parameters(schema: z.ZodType | undefined): z.ZodObject | undefined {
  if (schema === undefined) return undefined;
  if (!(schema instanceof z.ZodObject)) throw new Error("OpenAPI parameters must use object schemas");
  return schema;
}

export function buildOpenApiDocument(routes: ReadonlyArray<RouteMeta>): OpenAPIObject {
  const registry = new OpenAPIRegistry();
  registry.registerComponent("securitySchemes", "OAuth2PasswordBearer", {
    type: "oauth2", flows: { password: { tokenUrl: "auth/login", scopes: {} } },
  });
  registry.register("HTTPValidationError", z.object({ detail: z.array(z.object({
    type: z.string(), loc: z.array(z.union([z.string(), z.number()])), msg: z.string(), input: z.unknown().optional(),
  })) }));
  const validationResponse = registry.registerComponent("responses", "HTTPValidationError", {
    description: "Validation Error", content: { "application/json": { schema: { $ref: "#/components/schemas/HTTPValidationError" } } },
  });
  for (const meta of routes) {
    const status = meta.status ?? 200;
    const body = meta.upload ? {
      required: true, content: { "multipart/form-data": { schema: {
        type: "object" as const, required: [meta.upload.field], properties: { [meta.upload.field]: { type: "string" as const, format: "binary" } },
      } } },
    } : meta.body ? {
      required: true, content: { [meta.bodyKind === "form" ? "application/x-www-form-urlencoded" : "application/json"]: { schema: meta.body } },
    } : undefined;
    registry.registerPath({
      method: meta.method, path: toOpenApiPath(meta.path), tags: [meta.tag], summary: meta.summary,
      ...(meta.auth === undefined ? {} : { security: [{ OAuth2PasswordBearer: [] }] }),
      request: { params: parameters(meta.params), query: parameters(meta.query), ...(body ? { body } : {}) },
      responses: {
        [status]: { description: status === 204 ? "No Content" : "Successful Response",
          ...(status !== 204 && meta.response ? { content: { [meta.responseMediaType ?? "application/json"]: { schema: meta.response } } } : {}),
        },
        ...(meta.params || meta.query || meta.body || meta.upload ? { 422: validationResponse.ref } : {}),
      },
    });
  }
  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: "3.1.0", info: { title: "MACS API", version: "1.0.0", description: "MACS Kulübü Web Sitesi Backend API - RESTful API for managing club events, projects, members, and sponsors." }, tags,
  });
}
