import { ZipArchive } from "archiver";
import { open } from "node:fs/promises";
import type { ReadStream } from "node:fs";
import { PassThrough } from "node:stream";
import { z } from "zod";
import type { AppDeps, AppRouter } from "../../app";
import { HttpError } from "../../lib/http-error";
import { registerRouteMetadata } from "../../lib/route-metadata";
import { authenticate, requireRoles } from "../../middleware/auth";
import { perHour, perMinute, routeRateLimit } from "../../security/rate-limit";
import { limitBodySize } from "../../security/request-guards";
import { validationError } from "../../lib/validation";
import { sendJsonResponse } from "../../lib/public-cache";
import { saveImage } from "./service";

export function registerUploadRoutes(app: AppRouter, deps: AppDeps): void {
  const base = { tag: "system" } as const;
  registerRouteMetadata(app, deps, { ...base, method: "post", path: "/api/upload/", summary: "Resim yükle", auth: ["admin", "moderator"], upload: true, response: z.object({ url: z.string() }) });
  app.post("/api/upload", routeRateLimit(deps, perMinute(20)), async (c, next) => {
    const user = await authenticate(c.req.raw, deps.env, deps.loadUser, deps.now?.() ?? new Date());
    requireRoles(user, ["admin", "moderator"]);
    await next();
  }, limitBodySize(deps.env.MAX_UPLOAD_SIZE + (deps.security?.uploadOverheadBytes ?? 262144)), async c => {
    const bytes = await c.req.arrayBuffer();
    let form: FormData;
    try {
      if (!(c.req.header("Content-Type") ?? "").toLowerCase().startsWith("multipart/form-data")) form = new FormData();
      else form = await new Request(c.req.url, { method: "POST", headers: c.req.raw.headers, body: bytes }).formData();
    } catch { throw new HttpError(400, "There was an error parsing the body"); }
    const files = [...new Set(form.keys())].flatMap(key => form.getAll(key)).filter(entry => entry instanceof File);
    if (files.length > 1) throw new HttpError(400, "Too many files");
    const file = form.get("file");
    if (!(file instanceof File)) throw validationError([{ type: "missing", loc: ["body", "file"], msg: "Field required", input: null }]);
    if (file.size > deps.env.MAX_UPLOAD_SIZE) throw new HttpError(413, `Dosya çok büyük. Sınır: ${String(Math.floor(deps.env.MAX_UPLOAD_SIZE / 1048576))} MB`);
    return sendJsonResponse(c, JSON.stringify(await saveImage(deps.storage, { originalname: file.name, size: file.size, buffer: Buffer.from(await file.arrayBuffer()) })));
  });
  registerRouteMetadata(app, deps, { ...base, method: "get", path: "/api/upload/download-all", summary: "Yüklemeleri ZIP olarak indir", auth: ["admin"], response: z.string().meta({ format: "binary" }), responseMediaType: "application/zip" });
  app.get("/api/upload/download-all", routeRateLimit(deps, perHour(3)), async c => {
    const user = await authenticate(c.req.raw, deps.env, deps.loadUser, deps.now?.() ?? new Date());
    requireRoles(user, ["admin"]);
    const files = await deps.storage.list();
    if (!files.length) throw new HttpError(404, "Yüklenecek dosya bulunamadı");
    if (c.req.method === "HEAD") return c.newResponse(null, 200, { "Content-Type": "application/zip", "Cache-Control": "no-store" });
    const archive = new ZipArchive();
    const pt = new PassThrough();
    const sources = new Set<ReadStream>();
    let stopped = false;
    const cleanup = () => {
      if (stopped) return;
      stopped = true; archive.unpipe(pt); archive.abort(); archive.destroy();
      for (const source of sources) source.destroy();
      pt.destroy();
    };
    try {
      for (const name of files) {
        const handle = await open(deps.storage.path(name), "r");
        const source = handle.createReadStream(); sources.add(source);
      }
      let index = 0;
      for (const source of sources) {
        archive.append(source, { name: files[index++] ?? "" });
      }
    } catch (error) { deps.logger.error({ err: error }, "ZIP stream failed"); cleanup(); throw error; }
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const fail = (error: Error) => { if (stopped) return; deps.logger.error({ err: error }, "ZIP stream failed"); controller.error(error); cleanup(); };
        archive.on("error", fail); archive.on("warning", fail);
        for (const source of sources) source.on("error", fail);
        pt.on("data", (chunk: Buffer) => { controller.enqueue(chunk); if ((controller.desiredSize ?? 0) <= 0) pt.pause(); });
        pt.on("end", () => { controller.close(); cleanup(); }); pt.on("error", fail);
        archive.pipe(pt); void archive.finalize().catch((error: unknown) => { fail(error instanceof Error ? error : new Error(String(error))); });
      },
      pull() { pt.resume(); }, cancel() { cleanup(); },
    });
    const timestamp = (deps.now?.() ?? new Date()).toISOString().replace(/[-:]/g, "").replace("T", "_").slice(0, 15);
    c.header("Cache-Control", "no-store"); c.header("Content-Type", "application/zip");
    c.header("Content-Disposition", `attachment; filename="macs_uploads_${timestamp}.zip"`);
    return c.body(stream);
  });
}
