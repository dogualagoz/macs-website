import { registerBenchmarkWarmup } from "./lib/cache-warmup";
import { DEFAULT_SECURITY_CONFIG } from "./security/config";
import { localDiskStorage } from "./lib/storage";
import { findUserByEmail, serializeUser } from "./modules/users/queries";
import { createApp } from "./app";
import { parseEnv } from "./config/env";
import { createDb } from "./db/client";
import { createLogger } from "./lib/logger";
import { createResponseCache } from "./lib/cache";

try {
  const env = parseEnv(process.env);
  const logger = createLogger(env.LOG_LEVEL);
  const database = createDb(env.DATABASE_URL);
  const cache = createResponseCache({ max: 500, ttlMs: 60_000, now: Date.now, enabled: env.RESPONSE_CACHE, logger });
  const deps = { cache, storage: localDiskStorage(env.UPLOAD_DIR), env, logger, ...database,
    loadUser: (email: string) => findUserByEmail(database.db, email).then(row => row ? serializeUser(row) : null) };
  const app = createApp(deps);
  registerBenchmarkWarmup(deps);
  const server = Bun.serve({ port: env.PORT, idleTimeout: DEFAULT_SECURITY_CONFIG.idleTimeoutSec,
    maxRequestBodySize: Math.max(env.MAX_UPLOAD_SIZE + DEFAULT_SECURITY_CONFIG.uploadOverheadBytes, DEFAULT_SECURITY_CONFIG.maxBodyBytes),
    fetch: (req, server) => app.fetch(req, { socketIp: server.requestIP(req)?.address }) });
  void cache.warmupStartup();
  logger.info({ port: server.port }, "Server listening");
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
    void (async () => {
      await server.stop(false);
      await cache.drain();
      await database.sql.end({ timeout: 5 });
    })().catch((error: unknown) => { logger.error({ err: error }, "Shutdown failed"); process.exitCode = 1; }).finally(() => { clearTimeout(timeout); });
  };
  process.once("SIGTERM", () => { shutdown("SIGTERM"); });
  process.once("SIGINT", () => { shutdown("SIGINT"); });
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
