import { localDiskStorage } from "../../src/lib/storage";
import { findUserByEmail, serializeUser } from "../../src/modules/users/queries";
import type { AppDeps } from "../../src/app";
import { parseEnv } from "../../src/config/env";
import { createDb } from "../../src/db/client";
import { createLogger } from "../../src/lib/logger";
import { createResponseCache } from "../../src/lib/cache";

export const TEST_JWT_SECRET = "macs-test-only-secret-never-for-production";
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5436/macs_test";

export function testDeps(overrides: Partial<AppDeps> = {}): AppDeps {
  const env = overrides.env ?? parseEnv({ DATABASE_URL: TEST_DATABASE_URL, JWT_SECRET_KEY: TEST_JWT_SECRET, NODE_ENV: "test", LOG_LEVEL: "error", RESPONSE_CACHE: "false" });
  const database = overrides.db && overrides.sql && overrides.counter
    ? { db: overrides.db, sql: overrides.sql, counter: overrides.counter }
    : createDb(env.DATABASE_URL);
  const cache = createResponseCache({ max: 500, ttlMs: 60_000, now: () => overrides.now?.().getTime() ?? Date.now(), enabled: env.RESPONSE_CACHE });
  return { ...database, cache, storage: overrides.storage ?? localDiskStorage(env.UPLOAD_DIR), env, logger: createLogger("error"), routeRegistry: [], loadUser: email => findUserByEmail(database.db, email).then(row => row ? serializeUser(row) : null), ...overrides };
}
