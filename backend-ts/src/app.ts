import express from "express";
import type { Express } from "express";
import type { Logger } from "pino";
import type { Env } from "./config/env";
import { registerSystemRoutes } from "./modules/system/routes";

export interface AppDeps {
  env: Env;
  logger: Logger;
}

export function createApp(deps: AppDeps): Express {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.disable("etag");
  const router = express.Router();
  registerSystemRoutes(router, deps);
  app.use(router);
  return app;
}
