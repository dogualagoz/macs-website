import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

declare module "express-serve-static-core" {
  interface Request {
    requestId: string;
    bodyParseError?: unknown;
  }
}

export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.get("X-Request-Id");
  req.requestId = incoming !== undefined && /^[A-Za-z0-9._-]{1,64}$/.test(incoming) ? incoming : randomUUID();
  res.set("X-Request-Id", req.requestId);
  next();
};
