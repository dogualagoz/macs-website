import type { AppDeps } from "../../src/app";
import { parseEnv } from "../../src/config/env";
import { createDb } from "../../src/db/client";
import { createLogger } from "../../src/lib/logger";

export const TEST_JWT_SECRET = "macs-test-only-secret-never-for-production";
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5436/macs_test";

export function testDeps(overrides: Partial<AppDeps> = {}): AppDeps {
  const env = overrides.env ?? parseEnv({ DATABASE_URL: TEST_DATABASE_URL, JWT_SECRET_KEY: TEST_JWT_SECRET, NODE_ENV: "test", LOG_LEVEL: "error" });
  const database = overrides.db && overrides.sql && overrides.counter
    ? { db: overrides.db, sql: overrides.sql, counter: overrides.counter }
    : createDb(env.DATABASE_URL);
  return { ...database, env, logger: createLogger("error"), routeRegistry: [], ...overrides };
}
