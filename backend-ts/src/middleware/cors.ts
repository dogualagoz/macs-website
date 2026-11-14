import cors from "cors";
import type { RequestHandler } from "express";
import type { Env } from "../config/env";

export const createCors = (env: Env): RequestHandler => cors({
  origin: env.CORS_ORIGINS, credentials: true, maxAge: 600, optionsSuccessStatus: 200,
});
