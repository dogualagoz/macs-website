import type { Router } from "express";
import type { AppDeps } from "../../app";

export function registerSystemRoutes(router: Router, _deps: AppDeps): void {
  router.get("/", (_req, res) => {
    res.json({ message: "MACS Kulubu Web Sitesine hosgeldiniz!" });
  });
  router.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
}
