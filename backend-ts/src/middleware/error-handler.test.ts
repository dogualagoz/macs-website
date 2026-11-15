import { expect, test } from "bun:test";
import { Hono } from "hono";
import { Writable } from "node:stream";
import pino from "pino";
import { DrizzleQueryError } from "drizzle-orm/errors";
import type { AppEnv } from "../app";
import { errorHandler, readErrorCode } from "./error-handler";
test("wrapped DB errors never log bindings", async () => {
 const logs: string[] = [];
 const logger = pino({}, new Writable({ write(chunk: Buffer, _encoding, done) { logs.push(chunk.toString()); done(); } }));
 const email = "private@example.com", hash = "$2b$12$privateHashNeverLog";
 const app = new Hono<AppEnv>(); app.onError(errorHandler(logger));
 app.get("/users/:id", c => { c.set("requestId", "safe-id"); throw new DrizzleQueryError("insert into users values ($1,$2)", [email, hash], Object.assign(new Error(email + hash), { code: "08006" })); });
 expect((await app.request("/users/123")).status).toBe(500);
 const output = logs.join("");
 for (const secret of [email, hash, "insert into", "stack"]) expect(output).not.toContain(secret);
 expect(JSON.parse(logs[0] ?? "{}")).toMatchObject({ reqId: "safe-id", errorName: "DrizzleQueryError", code: "08006", path: "/users/:redacted" });
});
test("PG codes are bounded SQLSTATE classifications", () => {
 expect(readErrorCode({ code: "private@example.com" })).toBeUndefined();
 expect(readErrorCode({ cause: { code: "23505" } })).toBe("23505");
});
