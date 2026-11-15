import type { Logger } from "pino";
import { classifyErrorFields } from "./middleware/error-handler";

export interface ShutdownTargets {
  logger: Pick<Logger, "info" | "error" | "flush">;
  server: { stop(closeActiveConnections?: boolean): Promise<void> };
  cache: { stop(): void; drain(): Promise<unknown> };
  sql: { end(options?: { timeout?: number }): Promise<void> };
  timeoutMs?: number;
}

export function createShutdownHandler(targets: ShutdownTargets): (signal: string) => void {
  const { logger, server, cache, sql, timeoutMs = 10_000 } = targets;
  let shuttingDown = false;
  return (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Shutting down");
    const timeout = setTimeout(() => {
      logger.error("Graceful shutdown timed out");
      logger.flush();
      process.exit(1);
    }, timeoutMs);
    timeout.unref();
    void (async () => {
      cache.stop();
      await server.stop(false);
      await cache.drain();
      await sql.end({ timeout: 5 });
    })()
      .catch((error: unknown) => {
        logger.error(classifyErrorFields(error), "Shutdown failed");
        process.exitCode = 1;
      })
      .finally(() => {
        logger.flush();
        clearTimeout(timeout);
      });
  };
}
