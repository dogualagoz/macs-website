import type { Context } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import type { AppDeps } from "../app";
import { cacheKey, toCachedResponse, selectEncoding } from "./cache";
import type { CachedResponse, Domain } from "./cache";

function respond(c: Context, value: CachedResponse, isPublic: boolean): Response {
  c.header("Cache-Control", isPublic ? "public, max-age=30, stale-while-revalidate=300" : "no-store");
  c.header("Vary", "Accept-Encoding, Origin");
  if (isPublic) {
    c.header("ETag", value.etag);
    const opaque = value.etag.replace(/^W\//, "");
    if (c.req.header("If-None-Match")?.split(",").some(t => t.trim() === "*" || t.trim().replace(/^W\//, "") === opaque)) return c.newResponse(null, 304);
  } else { c.header("ETag", undefined); c.header("X-Cache", undefined); }
  const encoding = selectEncoding(c.req.header("Accept-Encoding")) ?? "identity";
  const bytes = encoding === "br" ? value.br : encoding === "gzip" ? value.gzip : null;
  c.header("Content-Encoding", bytes ? encoding : undefined);
  c.header("Content-Type", "application/json; charset=utf-8");
  const body = bytes ?? value.raw;
  c.header("Content-Length", String(body.byteLength));
  return c.newResponse(value.status === 204 ? null : body as Uint8Array<ArrayBuffer>, value.status as StatusCode);
}
export function sendJsonResponse(c: Context, bodyText: string, opts: { status?: number; isPublic?: boolean; etag?: string } = {}): Response {
  const value = toCachedResponse(opts.status ?? 200, bodyText);
  return respond(c, { ...value, etag: opts.etag ?? value.etag }, opts.isPublic === true && c.req.method === "GET" && c.req.header("Authorization") === undefined && value.status === 200);
}
export async function publicCachedJson(c: Context, deps: AppDeps, opts: { domain: Domain; canonicalPath: string; query: Record<string, unknown>; load: () => Promise<string> }): Promise<Response> {
  if (c.req.method !== "GET" || c.req.header("Authorization") !== undefined) return sendJsonResponse(c, await opts.load());
  const value = await deps.cache.getOrLoad(cacheKey(opts.canonicalPath, opts.query), opts.domain, async () => ({ status: 200, bodyText: await opts.load(), cacheable: true }));
  c.header("X-Cache", value.hit ? "HIT" : "MISS");
  return respond(c, value, true);
}
