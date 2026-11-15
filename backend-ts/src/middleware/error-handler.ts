import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "../app";
import { validationError } from "../lib/validation";
import { logSecurityEvent } from "../security/security-log";
import { resolveClientIp } from "../security/ip";
import { applySecurityHeaders } from "../security/headers";
import type { Logger } from "pino";
import { HttpError } from "../lib/http-error";
import { sendJsonResponse } from "../lib/public-cache";
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

export function errorHandler(logger: Logger): ErrorHandler<AppEnv> {
  return async (error, c) => {
    if (error instanceof HTTPException && (error.status === 400 || error.status === 415)) {
      const override = c.get("bodyInvalid");
      if (override) error = override;
      else if (error.status === 400) error = validationError([{ type: "json_invalid", loc: ["body"], msg: "JSON decode error", input: {} }]);
      else if (c.req.path === "/auth/login") error = validationError(["username", "password"].map(field => ({ type: "missing", loc: ["body", field], msg: "Field required", input: null })));
      else error = validationError([{ type: "model_attributes_type", loc: ["body"], msg: "Input should be a valid dictionary or object to extract fields from", input: await c.req.text() }]);
    }
    const code = readErrorCode(error);
    const pg = code !== undefined && Object.hasOwn(PG_ERRORS, code) ? PG_ERRORS[code] : undefined;
    const mapped = error instanceof HttpError ? error : pg ? new HttpError(pg[0], pg[1]) : new HttpError(500, "Internal Server Error");
    const kind = mapped.status === 429 ? (typeof mapped.detail === "object" && mapped.detail !== null && "error" in mapped.detail && String(mapped.detail.error).includes("failed logins") ? "login_ip_limit" : "rate_limit")
      : mapped.status === 413 ? "body_too_large" : mapped.status === 414 ? "url_too_long" : mapped.status === 503 && mapped.detail === "Service Unavailable" ? "handler_timeout"
      : mapped.status === 401 && typeof mapped.detail === "string" && mapped.detail.includes("dakika kilitlendi") ? "lockout" : null;
    if (kind) logSecurityEvent(logger, { kind, ip: c.get("clientIp") ?? resolveClientIp(c.req.raw.headers, (c.env as AppEnv["Bindings"] | undefined)?.socketIp), path: c.req.path, status: mapped.status });
    if (mapped.status === 500) logger.error({ err: error }, "Unhandled request error");
    for (const [key, value] of Object.entries(mapped.headers ?? {})) c.header(key, value);
    const response = sendJsonResponse(c, JSON.stringify(mapped.status === 429 ? mapped.detail : { detail: mapped.detail }), { status: mapped.status });
    applySecurityHeaders(response.headers, { forwardedProto: c.req.header("X-Forwarded-Proto"), isDocs: c.req.path === "/docs" || c.req.path.startsWith("/docs/") });
    return response;
  };
}
