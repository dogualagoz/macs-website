import { expect, test } from "bun:test";
import { Writable } from "node:stream";
import pino from "pino";
import { createApp } from "../app";
import { testDeps } from "../../test/helpers/app";
import { createResponseCache } from "./cache";
import { logSecurityEvent } from "../security/security-log";
test("all log sinks redact dynamic paths including failed refreshes", async () => {
 const logs: string[] = [];
 const logger = pino({}, new Writable({ write(chunk: Buffer, _encoding, done) { logs.push(chunk.toString()); done(); } }));
 const path = "/events/by-slug/private@example.com";
 const deps = testDeps({ logger });
 try {
 const app = createApp(deps, app => { app.get("/events/by-slug/:slug", c => c.json({ ok: true })); });
 await app.request(path);
 logSecurityEvent(logger, { kind: "rate_limit", ip: "127.0.0.1", path });
 let fail = false;
 const cache = createResponseCache({ enabled: true, logger });
 await cache.getOrLoad(path + "?", "events", () => {
 if (fail) throw new Error("refresh failed");
 return Promise.resolve({ status: 200, bodyText: "{}", cacheable: true });
 });
 fail = true; cache.invalidate("events"); await cache.drain(); cache.stop();
 expect(logs.join("")).not.toContain("private@example.com");
 const rows = logs.map(line => JSON.parse(line) as Record<string, unknown>);
 for (const msg of ["Request completed", "Cache warmup failed"]) expect(rows.find(row => row.msg === msg)?.path).toBe("/events/by-slug/:redacted");
 expect(rows.find(row => row.event === "security")?.path).toBe("/events/by-slug/:redacted");
 } finally { await deps.sql.end(); }
});
