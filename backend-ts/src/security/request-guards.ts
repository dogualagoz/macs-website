import type { MiddlewareHandler } from "hono";
import { HttpError } from "../lib/http-error";
import { MAX_JSON_BODY_BYTES } from "./config";
import type { SecurityConfig } from "./config";

export function validateRequestHead(req: Request, rawTarget: string, config: SecurityConfig): void {
  if (req.method === "TRACE" || req.method === "CONNECT") throw new HttpError(405, "Method Not Allowed");
  if (rawTarget.length > config.maxUrlLength) throw new HttpError(414, "URI Too Long");
  let path = rawTarget.split("?")[0] ?? "";
  for (;;) {
    if (path.includes("..") || path.includes("\0")) throw new HttpError(400, "Bad Request");
    let decoded: string;
    try { decoded = decodeURIComponent(path); } catch { throw new HttpError(400, "Bad Request"); }
    if (decoded === path) break;
    path = decoded;
  }
  let count = 0; let bytes = 0;
  const encoder = new TextEncoder();
  for (const [name, value] of req.headers) {
    count++; bytes += encoder.encode(name).byteLength + encoder.encode(value).byteLength + 4;
    if (count > config.maxHeaderCount || bytes > config.maxHeaderBytes) throw new HttpError(431, "Request Header Fields Too Large");
  }
}
export async function readBoundedBody(req: Request, maxBytes: number): Promise<Uint8Array<ArrayBuffer>> {
  const tooLarge = () => new HttpError(413, "İstek gövdesi çok büyük");
  const length = req.headers.get("Content-Length");
  if (length !== null && /^\d+$/.test(length) && Number(length) > maxBytes) {
    try { await req.body?.cancel(); } finally { throw tooLarge(); }
  }
  if (!req.body) return new Uint8Array();
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = []; let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.byteLength > maxBytes - total) { try { await reader.cancel(); } finally { throw tooLarge(); } }
      total += value.byteLength; chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}
export function limitBodySize(maxBytes = MAX_JSON_BODY_BYTES): MiddlewareHandler {
  return async (c, next) => {
    const original = c.req.raw;
    const bytes = await readBoundedBody(original, maxBytes);
    if (original.method !== "GET" && original.method !== "HEAD") c.req.raw = new Request(original, { body: bytes });
    await next();
  };
}
export async function withHandlerTimeout<T>(ms: number, run: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([Promise.resolve().then(run), new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => { reject(new HttpError(503, "Service Unavailable")); }, ms);
    })]);
  } finally { clearTimeout(timer); }
}
