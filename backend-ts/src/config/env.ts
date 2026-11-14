import { z } from "zod";

export const DEFAULT_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8080",
  "https://macsclub.com.tr",
  "https://www.macsclub.com.tr",
] as const;

const positiveInteger = z.coerce.number().int().positive();
const booleanFlag = z.string()
  .transform((value) => value.toLowerCase())
  .pipe(z.enum(["true", "on", "1", "false", "off", "0"]))
  .transform((value) => value === "true" || value === "on" || value === "1");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: positiveInteger.max(65535).default(8000),
  DATABASE_URL: z.url().refine((value) => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return ["postgres:", "postgresql:"].includes(url.protocol) && url.hostname.length > 0;
  }, "Must be a postgres:// or postgresql:// URL with a host"),
  JWT_SECRET_KEY: z.string().min(16),
  ACCESS_TOKEN_EXPIRE_MINUTES: positiveInteger.default(60),
  ADMIN_SECRET_KEY: z.string().optional().transform((value) => value === "" ? null : value ?? null),
  MAX_LOGIN_ATTEMPTS: positiveInteger.default(5),
  LOCKOUT_DURATION: positiveInteger.default(15),
  MIN_PASSWORD_LENGTH: positiveInteger.default(6),
  MAX_UPLOAD_SIZE: positiveInteger.default(5242880),
  UPLOAD_DIR: z.string().min(1).default("static/uploads"),
  STATIC_DIR: z.string().min(1).default("static"),
  CORS_ORIGINS: z.string().optional().transform((value) => [
    ...new Set([...DEFAULT_ORIGINS, ...(value ?? "").split(",").map((origin) => origin.trim()).filter(Boolean)]),
  ]),
  LOG_LEVEL: z.string().transform((value) => value.toLowerCase())
    .pipe(z.enum(["debug", "info", "warn", "error"])).default("info"),
  RATELIMIT_ENABLED: booleanFlag.default(true),
  RESPONSE_CACHE: booleanFlag.default(true),
  NOMINATIM_USER_AGENT: z.string().min(1).default("MACS-Website/1.0 (contact@macs.com)"),
  RUN_MIGRATIONS: booleanFlag.default(true),
});

export interface Env {
  NODE_ENV: "development" | "test" | "production";
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET_KEY: string;
  ACCESS_TOKEN_EXPIRE_MINUTES: number;
  ADMIN_SECRET_KEY: string | null;
  MAX_LOGIN_ATTEMPTS: number;
  LOCKOUT_DURATION: number;
  MIN_PASSWORD_LENGTH: number;
  MAX_UPLOAD_SIZE: number;
  UPLOAD_DIR: string;
  STATIC_DIR: string;
  CORS_ORIGINS: string[];
  LOG_LEVEL: "debug" | "info" | "warn" | "error";
  RATELIMIT_ENABLED: boolean;
  RESPONSE_CACHE: boolean;
  NOMINATIM_USER_AGENT: string;
  RUN_MIGRATIONS: boolean;
}

export function parseEnv(raw: Record<string, string | undefined>): Env {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  }
  return parsed.data;
}
