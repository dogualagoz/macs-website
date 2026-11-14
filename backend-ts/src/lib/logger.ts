import pino from "pino";
import type { Logger } from "pino";
import type { Env } from "../config/env";

export function createLogger(level: Env["LOG_LEVEL"]): Logger {
  return pino({ level }, pino.destination({ dest: 1, sync: true }));
}
