import express from "express";
import type { Express, Router } from "express";
import type { Logger } from "pino";
import type { Db, Sql, QueryCounter } from "./db/client";
import type { Env } from "./config/env";
import type { RouteMeta } from "./lib/route";
import type { Storage } from "./lib/storage";
import type { LoadUserByEmail } from "./middleware/auth";
import { bodyParsers } from "./middleware/body";
import { createCors } from "./middleware/cors";
import { errorHandler } from "./middleware/error-handler";
import { notFound } from "./middleware/not-found";
import { requestId } from "./middleware/request-id";
import { securityHeaders } from "./middleware/security-headers";
import { registerAuthRoutes } from "./modules/auth/routes";
import type { FetchImpl } from "./modules/sponsors/service";
import { registerProjectRoutes } from "./modules/projects/routes";
import { registerMemberRoutes } from "./modules/members/routes";
import { registerSponsorRoutes } from "./modules/sponsors/routes";
import { registerEventRoutes } from "./modules/events/routes";
import { registerUserRoutes } from "./modules/users/routes";
import { registerSystemRoutes } from "./modules/system/routes";
import { registerUploadRoutes } from "./modules/uploads/routes";

export interface AppDeps {
  storage: Storage;
  env: Env;
  db: Db;
  sql: Sql;
  counter: QueryCounter;
  logger: Logger;
  routeRegistry: RouteMeta[];
  loadUser: LoadUserByEmail;
  now?: () => Date;
  fetchImpl?: FetchImpl;
}

export function createApp(deps: AppDeps, registerRoutes?: (router: Router, deps: AppDeps) => void): Express {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.disable("etag");
  app.use(requestId);
  app.use((req, res, next) => {
    const start = performance.now();
    res.once("finish", () => {
      deps.logger.info({ reqId: req.requestId, method: req.method, path: req.path, status: res.statusCode, ms: performance.now() - start }, "Request completed");
    });
    next();
  });
  app.use(securityHeaders);
  app.use(createCors(deps.env));
  app.use(bodyParsers);
  const staticOptions = { index: false, dotfiles: "ignore", fallthrough: true } as const;
  app.use("/uploads", express.static(deps.env.UPLOAD_DIR, staticOptions));
  app.use("/static", express.static(deps.env.STATIC_DIR, staticOptions));
  const router = express.Router();
  registerSystemRoutes(router, deps);
  registerAuthRoutes(router, deps);
  registerUserRoutes(router, deps);
  registerEventRoutes(router, deps);
  registerMemberRoutes(router, deps);
  registerSponsorRoutes(router, deps);
  registerProjectRoutes(router, deps);
  registerUploadRoutes(router, deps);
  registerRoutes?.(router, deps);
  app.use(router);
  app.use(notFound(deps.routeRegistry));
  app.use(errorHandler(deps.logger));
  return app;
}
