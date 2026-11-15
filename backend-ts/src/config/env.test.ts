import { expect, test } from "bun:test";
import { DEFAULT_ORIGINS, parseEnv, parseRunMigrations } from "./env";

const base = { DATABASE_URL: "postgresql://u:p@db:5432/x", JWT_SECRET_KEY: "x".repeat(32) };

test("parseEnv applies defaults", () => {
  expect(parseEnv(base)).toEqual({
    NODE_ENV: "development",
    PORT: 8000,
    DATABASE_URL: base.DATABASE_URL,
    JWT_SECRET_KEY: base.JWT_SECRET_KEY,
    ACCESS_TOKEN_EXPIRE_MINUTES: 60,
    ADMIN_SECRET_KEY: null,
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15,
    MIN_PASSWORD_LENGTH: 6,
    MAX_UPLOAD_SIZE: 5242880,
    IMAGE_OPTIMIZE: true,
    IMAGE_MAX_DIMENSION: 1920,
    UPLOAD_DIR: "static/uploads",
    STATIC_DIR: "static",
    CORS_ORIGINS: [...DEFAULT_ORIGINS],
    LOG_LEVEL: "info",
    RATELIMIT_ENABLED: true,
    RESPONSE_CACHE: true,
    RUN_MIGRATIONS: true,
    DOCS_ENABLED: true,
    NOMINATIM_USER_AGENT: "MACS-Website/1.0 (contact@macs.com)",
  });
});

test("parseEnv disables DOCS_ENABLED by default in production and enables otherwise", () => {
  expect(parseEnv({ ...base, NODE_ENV: "development" }).DOCS_ENABLED).toBe(true);
  expect(parseEnv({ ...base, NODE_ENV: "test" }).DOCS_ENABLED).toBe(true);
  expect(parseEnv({ ...base, NODE_ENV: "production" }).DOCS_ENABLED).toBe(false);
  expect(parseEnv({ ...base, NODE_ENV: "production", DOCS_ENABLED: "true" }).DOCS_ENABLED).toBe(true);
  expect(parseEnv({ ...base, NODE_ENV: "development", DOCS_ENABLED: "false" }).DOCS_ENABLED).toBe(false);
  expect(() => parseEnv({ ...base, DOCS_ENABLED: "invalid" })).toThrow("Invalid environment");
});

test("parseEnv fails fast without JWT_SECRET_KEY", () => {
  expect(() => parseEnv({ DATABASE_URL: base.DATABASE_URL })).toThrow(/JWT_SECRET_KEY/);
});

test("parseEnv normalizes an empty ADMIN_SECRET_KEY to disabled", () => {
  expect(parseEnv({ ...base, ADMIN_SECRET_KEY: "" }).ADMIN_SECRET_KEY).toBeNull();
});

test("parseEnv merges CORS_ORIGINS without duplicates", () => {
  const env = parseEnv({ ...base, CORS_ORIGINS: " https://a.test , https://macsclub.com.tr,https://a.test," });
  expect(env.CORS_ORIGINS).toEqual([...DEFAULT_ORIGINS, "https://a.test"]);
});

test("parseEnv accepts uppercase LOG_LEVEL", () => {
  expect(parseEnv({ ...base, LOG_LEVEL: "INFO" }).LOG_LEVEL).toBe("info");
});

test("parseEnv parses configured values and postgres URLs", () => {
  expect(parseEnv({
    ...base,
    NODE_ENV: "production",
    PORT: "8010",
    DATABASE_URL: "postgres://u:p@db:5432/x",
    ACCESS_TOKEN_EXPIRE_MINUTES: "120",
    ADMIN_SECRET_KEY: "admin-secret",
    MAX_LOGIN_ATTEMPTS: "8",
    LOCKOUT_DURATION: "30",
    MIN_PASSWORD_LENGTH: "12",
    MAX_UPLOAD_SIZE: "1024",
    IMAGE_OPTIMIZE: "off",
    IMAGE_MAX_DIMENSION: "2560",
    UPLOAD_DIR: "uploads",
    STATIC_DIR: "public",
    LOG_LEVEL: "DEBUG",
    RATELIMIT_ENABLED: "false",
    RESPONSE_CACHE: "off",
    RUN_MIGRATIONS: "0",
    NOMINATIM_USER_AGENT: "Club-Test/contact@example.com",
  })).toEqual({
    NODE_ENV: "production",
    PORT: 8010,
    DATABASE_URL: "postgres://u:p@db:5432/x",
    JWT_SECRET_KEY: base.JWT_SECRET_KEY,
    ACCESS_TOKEN_EXPIRE_MINUTES: 120,
    ADMIN_SECRET_KEY: "admin-secret",
    MAX_LOGIN_ATTEMPTS: 8,
    LOCKOUT_DURATION: 30,
    MIN_PASSWORD_LENGTH: 12,
    MAX_UPLOAD_SIZE: 1024,
    IMAGE_OPTIMIZE: false,
    IMAGE_MAX_DIMENSION: 2560,
    UPLOAD_DIR: "uploads",
    STATIC_DIR: "public",
    CORS_ORIGINS: [...DEFAULT_ORIGINS],
    LOG_LEVEL: "debug",
    RATELIMIT_ENABLED: false,
    RESPONSE_CACHE: false,
    RUN_MIGRATIONS: false,
    DOCS_ENABLED: false,
    NOMINATIM_USER_AGENT: "Club-Test/contact@example.com",
  });
});

test.each(["off", "false", "0"])("parseEnv disables boolean flags for %s", (value) => {
  const env = parseEnv({ ...base, RATELIMIT_ENABLED: value, RESPONSE_CACHE: value, RUN_MIGRATIONS: value });
  expect([env.RATELIMIT_ENABLED, env.RESPONSE_CACHE, env.RUN_MIGRATIONS]).toEqual([false, false, false]);
});

test.each(["on", "true", "1"])("parseEnv enables boolean flags for %s", (value) => {
  const env = parseEnv({ ...base, RATELIMIT_ENABLED: value, RESPONSE_CACHE: value, RUN_MIGRATIONS: value });
  expect([env.RATELIMIT_ENABLED, env.RESPONSE_CACHE, env.RUN_MIGRATIONS]).toEqual([true, true, true]);
});

test.each([
  ["DATABASE_URL", ""],
  ["DATABASE_URL", "https://db.test/x"],
  ["DATABASE_URL", "postgresql://"],
  ["JWT_SECRET_KEY", "short"],
  ["NODE_ENV", "invalid"],
  ["LOG_LEVEL", "trace"],
  ["PORT", "65536"],
  ["PORT", "1.5"],
  ["ACCESS_TOKEN_EXPIRE_MINUTES", "0"],
  ["MAX_LOGIN_ATTEMPTS", "-1"],
  ["LOCKOUT_DURATION", "invalid"],
  ["MIN_PASSWORD_LENGTH", "0"],
  ["MAX_UPLOAD_SIZE", "0"],
  ["IMAGE_OPTIMIZE", "invalid"],
  ["IMAGE_MAX_DIMENSION", "100"],
  ["IMAGE_MAX_DIMENSION", "10000"],
  ["UPLOAD_DIR", ""],
  ["STATIC_DIR", ""],
  ["RATELIMIT_ENABLED", "invalid"],
  ["RESPONSE_CACHE", "invalid"],
  ["RUN_MIGRATIONS", "invalid"],
  ["NOMINATIM_USER_AGENT", ""],
])("parseEnv rejects invalid %s=%s", (key, value) => {
  expect(() => parseEnv({ ...base, [key]: value })).toThrow(key);
});

test("parseEnv requires DATABASE_URL", () => {
  expect(() => parseEnv({ JWT_SECRET_KEY: base.JWT_SECRET_KEY })).toThrow(/DATABASE_URL/);
});

test("parseRunMigrations shares booleanFlag semantics for 0/off/false/1/on/true/unset", () => {
  expect(parseRunMigrations(undefined)).toBe(true);
  for (const disabled of ["0", "off", "false", "OFF", "FALSE"]) {
    expect(parseRunMigrations(disabled)).toBe(false);
  }
  for (const enabled of ["1", "on", "true", "ON", "TRUE"]) {
    expect(parseRunMigrations(enabled)).toBe(true);
  }
  expect(() => parseRunMigrations("invalid")).toThrow(/RUN_MIGRATIONS/);
});
