import { z } from "zod";
import type { AppRouter, AppDeps } from "../../app";
import { registerRouteMetadata } from "../../lib/route";
import { sendJsonResponse } from "../../lib/public-cache";
export function registerSystemRoutes(app: AppRouter, deps: AppDeps): void {
  for (const [path, summary, body] of [["/", "Welcome", { message: "MACS Kulubu Web Sitesine hosgeldiniz!" }], ["/health", "Liveness", { status: "ok" }]] as const) {
    registerRouteMetadata(app, deps, { method: "get", path, domain: "system", tag: "system", summary, response: path === "/" ? z.object({ message: z.string() }) : z.object({ status: z.literal("ok") }) });
    app.get(path, c => sendJsonResponse(c, JSON.stringify(body)));
  }
  registerRouteMetadata(app, deps, { method: "get", path: "/health/ready", domain: "system", tag: "system", summary: "Readiness", response: z.object({ status: z.literal("ok") }) });
  app.get("/health/ready", async c => {
    const query = deps.sql`SELECT 1`;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([query, new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          void query.cancel().catch((error: unknown) => { deps.logger.warn({ err: error }, "Failed to cancel readiness query"); });
          reject(new Error("Readiness timed out"));
        }, 2000);
      })]);
      return sendJsonResponse(c, JSON.stringify({ status: "ok" }));
    } catch { return sendJsonResponse(c, JSON.stringify({ status: "unavailable" }), { status: 503 }); }
    finally { clearTimeout(timer); }
  });
}
