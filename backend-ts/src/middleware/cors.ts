import type { MiddlewareHandler } from "hono";
import type { Env } from "../config/env";
export const createCors = (env: Env): MiddlewareHandler => async (c, next) => {
  const origin = c.req.header("Origin");
  if (origin && env.CORS_ORIGINS.includes(origin)) c.header("Access-Control-Allow-Origin", origin);
  c.header("Access-Control-Allow-Credentials", "true");
  if (c.req.method === "OPTIONS") {
    c.header("Access-Control-Max-Age", "600");
    c.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
    c.header("Access-Control-Allow-Headers", c.req.header("Access-Control-Request-Headers") ?? "");
    c.header("Vary", "Origin, Access-Control-Request-Headers");
    return c.body(null, 200);
  }
  await next();
  const vary = c.res.headers.get("Vary");
  c.res.headers.set("Vary", [...new Set([...(vary?.split(/,\s*/) ?? []), "Origin"])].join(", "));
};
