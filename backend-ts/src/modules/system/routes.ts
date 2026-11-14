import { z } from "zod";
import type { Router } from "express";
import type { AppDeps } from "../../app";
import { route, STREAMED } from "../../lib/route";
import { sendJson } from "../../middleware/cache-headers";

export function registerSystemRoutes(router: Router, deps: AppDeps): void {
  route(router, deps, {
    method: "get", path: "/", domain: "system", tag: "system", summary: "Welcome", response: z.object({ message: z.string() }),
    handler: () => Promise.resolve({ message: "MACS Kulubu Web Sitesine hosgeldiniz!" }),
  });
  route(router, deps, {
    method: "get", path: "/health", domain: "system", tag: "system", summary: "Liveness", response: z.object({ status: z.literal("ok") }),
    handler: () => Promise.resolve({ status: "ok" }),
  });
  route(router, deps, {
    method: "get", path: "/health/ready", domain: "system", tag: "system", summary: "Readiness", response: z.object({ status: z.literal("ok") }),
    handler: async ({ req, res }) => {
      const query = deps.sql`SELECT 1`;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          query,
          new Promise<never>((_resolve, reject) => {
            timer = setTimeout(() => {
              void query.cancel().catch((error: unknown) => {
                deps.logger.warn({ err: error }, "Failed to cancel readiness query");
              });
              reject(new Error("Readiness timed out"));
            }, 2000);
          }),
        ]);
        sendJson(req, res, 200, JSON.stringify({ status: "ok" }), { public: false });
      } catch {
        sendJson(req, res, 503, JSON.stringify({ status: "unavailable" }), { public: false });
      } finally { clearTimeout(timer); }
      return STREAMED;
    },
  });
}
