import type { AppRouter, AppEnv } from "../app";
import type { NotFoundHandler } from "hono";
import { sendJsonResponse } from "../lib/public-cache";
export function notFound(app: AppRouter): NotFoundHandler<AppEnv> {
  const routes = app.routes.filter(r => r.method !== "ALL" && !r.path.includes("*")).map(r => ({ method: r.method, pattern: new RegExp(`^${r.path.split("/").map(part => part.startsWith(":") ? "[^/]+" : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("/")}/?$`) }));
  return c => {
    const methods = [...new Set(routes.filter(r => r.pattern.test(c.req.path)).map(r => r.method))].sort();
    if (methods.includes(c.req.method === "HEAD" ? "GET" : c.req.method)) return sendJsonResponse(c, JSON.stringify({ detail: "Not Found" }), { status: 404 });
    if (methods.length) c.header("Allow", methods.join(", "));
    return sendJsonResponse(c, JSON.stringify({ detail: methods.length ? "Method Not Allowed" : "Not Found" }), { status: methods.length ? 405 : 404 });
  };
}
