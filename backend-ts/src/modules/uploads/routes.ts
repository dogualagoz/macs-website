import { ZipArchive } from "archiver";
import { createReadStream } from "node:fs";
import type { ReadStream } from "node:fs";
import type { Router } from "express";
import { z } from "zod";
import type { AppDeps } from "../../app";
import { HttpError } from "../../lib/http-error";
import { perHour, perMinute } from "../../middleware/rate-limit";
import { route, STREAMED } from "../../lib/route";
import { saveImage } from "./service";

export function registerUploadRoutes(router: Router, deps: AppDeps): void {
  const base = { domain: "uploads", tag: "system" } as const;
  route(router, deps, { ...base, method: "post", path: "/api/upload/", summary: "Resim yükle", auth: ["admin", "moderator"],
    upload: { field: "file", maxBytes: deps.env.MAX_UPLOAD_SIZE }, rateLimit: perMinute(20), response: z.object({ url: z.string() }),
    handler: ({ file }) => {
      if (!file) throw new Error("Upload middleware requires file");
      return saveImage(deps.storage, file);
    } });
  route(router, deps, { ...base, method: "get", path: "/api/upload/download-all", summary: "Yüklemeleri ZIP olarak indir", auth: ["admin"],
    rateLimit: perHour(3),
    handler: async ({ req, res }) => {
      const files = await deps.storage.list();
      if (!files.length) throw new HttpError(404, "Yüklenecek dosya bulunamadı");
      if (res.destroyed) return STREAMED;
      // archiver 8 exposes ZipArchive instead of the former archiver('zip') factory.
      const archive = new ZipArchive();
      const sources = new Set<ReadStream>();
      let stopped = false;
      const cleanup = (): void => {
        if (stopped) return;
        stopped = true;
        archive.unpipe(res);
        archive.abort();
        for (const source of sources) source.destroy();
        archive.destroy();
        req.off("aborted", cleanup);
        res.off("close", cleanup);
      };
      const fail = (error: Error): void => {
        if (stopped) return;
        deps.logger.error({ err: error, reqId: req.requestId }, "ZIP stream failed");
        cleanup();
        if (res.headersSent) res.destroy(error);
        else { res.removeHeader("Content-Disposition"); res.status(500).type("application/json").json({ detail: "Internal Server Error" }); }
      };
      req.once("aborted", cleanup);
      res.once("close", cleanup);
      archive.on("error", fail);
      archive.on("warning", fail);
      const timestamp = (deps.now?.() ?? new Date()).toISOString().replace(/[-:]/g, "").replace("T", "_").slice(0, 15);
      res.type("application/zip");
      res.set("Content-Disposition", `attachment; filename="macs_uploads_${timestamp}.zip"`);
      archive.pipe(res);
      try {
        for (const name of files) {
          const source = createReadStream(deps.storage.path(name));
          sources.add(source);
          source.once("close", () => sources.delete(source));
          source.on("error", fail);
          archive.append(source, { name });
        }
        void archive.finalize().catch((error: unknown) => { fail(error instanceof Error ? error : new Error(String(error))); });
      } catch (error: unknown) { fail(error instanceof Error ? error : new Error(String(error))); }
      return STREAMED;
    } });
}
