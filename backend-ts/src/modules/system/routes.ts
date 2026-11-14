import type { Router } from "express";
import type { AppDeps } from "../../app";
import { route, STREAMED } from "../../lib/route";

export function registerSystemRoutes(router: Router, deps: AppDeps): void {
  route(router, deps, {
    method: "get", path: "/", domain: "system", tag: "System", summary: "Welcome",
    handler: () => Promise.resolve({ message: "MACS Kulubu Web Sitesine hosgeldiniz!" }),
  });
  route(router, deps, {
    method: "get", path: "/health", domain: "system", tag: "System", summary: "Liveness",
    handler: () => Promise.resolve({ status: "ok" }),
  });
  route(router, deps, {
    method: "get", path: "/health/ready", domain: "system", tag: "System", summary: "Readiness",
    handler: async ({ res }) => {
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
        res.set("Cache-Control", "no-store").status(200).json({ status: "ok" });
      } catch {
        res.set("Cache-Control", "no-store").status(503).json({ status: "unavailable" });
      } finally { clearTimeout(timer); }
      return STREAMED;
    },
  });
}
