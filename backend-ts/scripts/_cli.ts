import { createInterface, emitKeypressEvents } from "node:readline";
import type { Key } from "node:readline";
import { z } from "zod";
import { parseEnv } from "../src/config/env";
import type { Env } from "../src/config/env";
import { createDb } from "../src/db/client";
import type { Db } from "../src/db/client";
import { HttpError } from "../src/lib/http-error";

class CliError extends Error {}

export function parseArgs<T>(schema: z.ZodType<T>, argv: string[]): T {
  // Check every flag before parsing so rejected passwords are never echoed in errors.
  if (argv.some(arg => /^--[^=]*password/i.test(arg))) {
    throw new CliError("password must be provided via stdin");
  }
  const values: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg || !/^--[a-z]+(?:-[a-z]+)*$/.test(arg)) throw new CliError("arguments: expected --kebab-case flags");
    const key = arg.slice(2).replaceAll("-", "_");
    if (Object.hasOwn(values, key)) throw new CliError(`${key}: duplicate flag`);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) values[key] = true;
    else { values[key] = next; i++; }
  }
  // Zod's default object mode strips unknown keys; enforce strict CLI input here.
  const inputSchema: z.ZodType = schema;
  if (inputSchema instanceof z.ZodObject) {
    const shape: object = inputSchema.shape;
    const unknownKeys = Object.keys(values).filter(key => !Object.hasOwn(shape, key));
    if (unknownKeys.length > 0) throw new CliError(`${unknownKeys.join(", ")}: unknown flag`);
  } else throw new CliError("arguments: object schema required");
  const result: z.ZodSafeParseResult<T> = schema.safeParse(values);
  if (!result.success) {
    throw new CliError(result.error.issues.map(issue => {
      const field = issue.code === "unrecognized_keys" ? issue.keys.join(", ") : issue.path.join(".") || "arguments";
      return `${field}: ${issue.code === "unrecognized_keys" ? "unknown flag" : issue.message}`;
    }).join("\n"));
  }
  return result.data;
}

export async function readPasswordFromStdin(): Promise<string> {
  const input = process.stdin;
  if (!input.isTTY) {
    const reader = createInterface({ input, crlfDelay: Infinity });
    try {
      for await (const line of reader) return line;
      throw new CliError("password: stdin is empty");
    } finally { reader.close(); input.pause(); }
  }
  const wasRaw = input.isRaw;
  emitKeypressEvents(input);
  input.setRawMode(true);
  input.resume();
  try {
    return await new Promise<string>((resolve, reject) => {
      let password: string | undefined;
      let characters: string[] = [];
      const cleanup = () => {
        input.off("keypress", onKey);
        input.off("end", cancel);
        input.off("error", cancel);
      };
      const cancel = () => { cleanup(); process.stderr.write("\n"); reject(new CliError("password: input cancelled")); };
      const onKey = (text: string | undefined, key: Key) => {
        if (key.ctrl && (key.name === "c" || key.name === "d")) { cancel(); return; }
        if (key.name === "return" || key.name === "enter") {
          process.stderr.write("\n");
          const answer = characters.join("");
          characters = [];
          if (password === undefined) { password = answer; process.stderr.write("Confirm password: "); }
          else {
            cleanup();
            if (password !== answer) reject(new CliError("password: confirmation does not match"));
            else resolve(password);
          }
        } else if (key.name === "backspace") characters.pop();
        else if (text && !key.ctrl && !key.meta && !/[\x00-\x1f\x7f]/.test(text)) characters.push(text);
      };
      input.on("keypress", onKey);
      input.once("end", cancel);
      input.once("error", cancel);
      process.stderr.write("Password: ");
    });
  } finally {
    input.setRawMode(wasRaw);
    input.pause();
  }
}

export async function runCli<T>(schema: z.ZodType<T>, action: (db: Db, env: Env, args: T) => Promise<string>): Promise<void> {
  let database: ReturnType<typeof createDb> | undefined;
  try {
    if (!process.env.DATABASE_URL) throw new CliError("DATABASE_URL is required");
    // Never print parseEnv's validation input or a database driver's error details.
    let env: Env;
    try { env = parseEnv(process.env); }
    catch { throw new CliError("Invalid environment: check DATABASE_URL, JWT_SECRET_KEY and configured settings"); }
    const args = parseArgs(schema, process.argv.slice(2));
    database = createDb(env.DATABASE_URL, { max: 1 });
    const output = await action(database.db, env, args);
    await database.sql.end({ timeout: 1 });
    database = undefined;
    process.stdout.write(`${output}\n`);
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = error.status === 404 ? 2 : 1;
    } else {
      // Only our own validation errors are printable; driver errors may contain secrets.
      const message = error instanceof CliError ? error.message : "database operation failed";
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    }
  } finally {
    if (database) await database.sql.end({ timeout: 1 }).catch(() => { process.exitCode = 1; });
  }
}
