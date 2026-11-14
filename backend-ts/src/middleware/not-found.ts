import express from "express";
import type { Request, RequestHandler } from "express";
import { HttpError } from "../lib/http-error";
import type { RouteMeta } from "../lib/route";

export function notFound(registry: readonly RouteMeta[]): RequestHandler {
  const matcher = express.Router();
  const matchedMethods = new WeakMap<Request, Set<string>>();
  for (const meta of registry) {
    matcher.all(meta.path, (req, _res, next) => {
      const methods = matchedMethods.get(req) ?? new Set<string>();
      methods.add(meta.method.toUpperCase());
      matchedMethods.set(req, methods);
      next();
    });
  }
  matcher.use((req, _res, next) => {
    const methods = matchedMethods.get(req);
    matchedMethods.delete(req);
    next(methods
      ? new HttpError(405, "Method Not Allowed", { Allow: [...methods].sort().join(", ") })
      : new HttpError(404, "Not Found"));
  });
  return matcher;
}
