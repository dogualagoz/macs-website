import type { ErrorRequestHandler } from "express";
import type { Logger } from "pino";
import { HttpError } from "../lib/http-error";
import { sendJson } from "./cache-headers";

const PG_ERRORS: Readonly<Record<string, readonly [number, string]>> = {
  "23505": [409, "Kayıt zaten mevcut"],
  "23503": [409, "Kayıt başka kayıtlar tarafından kullanıldığı için işlem tamamlanamadı"],
  "57014": [503, "Veritabanı zaman aşımı"],
};

export function readErrorCode(error: unknown): string | undefined {
  let current = error;
  for (let depth = 0; depth < 8 && typeof current === "object" && current !== null; depth++) {
    if ("code" in current && typeof current.code === "string" && current.code.length > 0) return current.code;
    current = "cause" in current ? current.cause : undefined;
  }
  return undefined;
}

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, req, res, next) => {
    if (res.headersSent) { next(error); return; }
    let mapped = error instanceof HttpError ? error : undefined;
    if (!mapped) {
      const code = readErrorCode(error);
      const pg = code !== undefined && Object.hasOwn(PG_ERRORS, code) ? PG_ERRORS[code] : undefined;
      if (pg) mapped = new HttpError(pg[0], pg[1]);
    }
    if (!mapped) {
      logger.error({ err: error, reqId: req.requestId }, "Unhandled request error");
      mapped = new HttpError(500, "Internal Server Error");
    }
    if (mapped.headers) res.set(mapped.headers);
    sendJson(req, res, mapped.status, JSON.stringify({ detail: mapped.detail }), { public: false });
  };
}
