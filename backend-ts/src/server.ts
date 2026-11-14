import { findUserByEmail } from "./modules/users/repo";
import { serializeUser } from "./modules/users/serializer";
import { createApp } from "./app";
import { parseEnv } from "./config/env";
import { createDb } from "./db/client";
import { createLogger } from "./lib/logger";

try {
  const env = parseEnv(process.env);
  const logger = createLogger(env.LOG_LEVEL);
  const database = createDb(env.DATABASE_URL);
  const app = createApp({ env, logger, routeRegistry: [], ...database,
    loadUser: email => findUserByEmail(database.db, email).then(row => row ? serializeUser(row) : null) });
  const server = app.listen(env.PORT);
  server.once("listening", () => {
    logger.info({ port: env.PORT }, "Server listening");
  });
  server.on("error", (error: Error) => {
    logger.error({ err: error }, "Server failed to listen");
    void database.sql.end({ timeout: 5 }).finally(() => { process.exit(1); });
  });

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Shutting down");
    const timeout = setTimeout(() => {
      logger.error("Graceful shutdown timed out");
      process.exit(1);
    }, 10_000);
    timeout.unref();
    server.close((error) => {
      if (error) {
        logger.error({ err: error }, "Failed to close HTTP server");
        process.exitCode = 1;
      }
      void database.sql.end({ timeout: 5 }).catch((dbError: unknown) => {
        logger.error({ err: dbError }, "Failed to close database pool");
        process.exitCode = 1;
      }).finally(() => { clearTimeout(timeout); });
    });
  };
  process.once("SIGTERM", () => { shutdown("SIGTERM"); });
  process.once("SIGINT", () => { shutdown("SIGINT"); });
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
