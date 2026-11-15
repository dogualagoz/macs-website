import type { AppRouter, AppEnv } from "../app";
import type { NotFoundHandler } from "hono";
import { sendJsonResponse } from "../lib/public-cache";
export function notFound(app: AppRouter): NotFoundHandler<AppEnv> {
  return c => {
    const methods = [...new Set(app.routes.filter(r => r.method !== "ALL" && !r.path.includes("*") && new RegExp(`^${r.path.split("/").map(part => part.startsWith(":") ? "[^/]+" : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("/")}/?$`).test(c.req.path)).map(r => r.method))].sort();
    if (methods.includes(c.req.method)) return sendJsonResponse(c, JSON.stringify({ detail: "Not Found" }), { status: 404 });
    if (methods.length) c.header("Allow", methods.join(", "));
    return sendJsonResponse(c, JSON.stringify({ detail: methods.length ? "Method Not Allowed" : "Not Found" }), { status: methods.length ? 405 : 404 });
  };
}
