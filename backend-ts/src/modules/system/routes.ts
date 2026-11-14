import type { Router } from "express";
import type { AppDeps } from "../../app";
import { route } from "../../lib/route";

export function registerSystemRoutes(router: Router, deps: AppDeps): void {
  route(router, deps, {
    method: "get", path: "/", domain: "system", tag: "System", summary: "Welcome",
    handler: () => Promise.resolve({ message: "MACS Kulubu Web Sitesine hosgeldiniz!" }),
  });
  route(router, deps, {
    method: "get", path: "/health", domain: "system", tag: "System", summary: "Liveness",
    handler: () => Promise.resolve({ status: "ok" }),
  });
}
