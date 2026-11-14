import type { Request, Response } from "express";
import { weakEtag } from "../lib/cache";

export function sendJson(req: Request, res: Response, status: number, body: string, options: { public: boolean; etag?: string }): void {
  const eligible = options.public && req.method === "GET" && req.headers.authorization === undefined && status === 200;
  res.status(status);
  if (eligible) {
    const etag = options.etag ?? weakEtag(body);
    res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=300").set("ETag", etag).vary("Origin");
    const opaque = etag.replace(/^W\//, "");
    if (req.get("If-None-Match")?.split(",").some(tag => tag.trim() === "*" || tag.trim().replace(/^W\//, "") === opaque)) {
      res.status(304).end(); return;
    }
  } else {
    res.set("Cache-Control", "no-store");
    res.removeHeader("ETag"); res.removeHeader("X-Cache");
  }
  if (status === 204) { res.end(); return; }
  // end() avoids Express's implicit freshness check turning no-store responses into 304s.
  res.type("application/json").set("Content-Length", Buffer.byteLength(body).toString()).end(body);
}
