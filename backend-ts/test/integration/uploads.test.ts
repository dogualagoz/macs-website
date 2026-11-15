import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import pino from "pino";
import { ReadStream } from "node:fs";
import { Writable } from "node:stream";
import { ZipArchive } from "archiver";
import { randomBytes } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { get, request as nodeRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request, { serveEphemeral } from "../helpers/http";
import { createApp } from "../../src/app";
import { signAccessToken } from "../../src/lib/jwt";
import { parseEnv } from "../../src/config/env";
import { testDeps, TEST_DATABASE_URL, TEST_JWT_SECRET } from "../helpers/app";
import { tokenFor } from "../helpers/auth";
import { normalizeZip } from "../../contract/normalize";
import sharp from "sharp";

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 112, 97, 121]);
let dir: string;
let deps: ReturnType<typeof testDeps>;
const missing = { detail: [{ type: "missing", loc: ["body", "file"], msg: "Field required", input: null }] };
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "macs-upload-"));
  await mkdir(join(dir, "uploads"));
  deps = testDeps({ env: parseEnv({ DATABASE_URL: TEST_DATABASE_URL, JWT_SECRET_KEY: TEST_JWT_SECRET, STATIC_DIR: dir, UPLOAD_DIR: join(dir, "uploads"), RATELIMIT_ENABLED: "false" }),
    loadUser: email => Promise.resolve({ id: 1, email, full_name: "Staff", role: email.startsWith("admin") ? "admin" : "moderator", status: "approved", is_active: true, last_login: null, failed_login_attempts: 0, password_changed_at: null }) });
});
afterEach(async () => { await deps.sql.end({ timeout: 1 }); await rm(dir, { recursive: true, force: true }); });
const upload = async (name: string, bytes: Buffer) => request(createApp(deps)).post("/api/upload/").auth(await tokenFor("mod@example.com", "moderator"), { type: "bearer" }).attach("file", bytes, name);

test("auth runs before multipart parsing, including oversized or malformed multipart", async () => {
  const app = createApp(deps);
  const tooLarge = await request(app).post("/api/upload/").attach("file", Buffer.alloc(5242881), "x.png");
  expect(tooLarge.status).toBe(401);
  const malformed = await request(app).post("/api/upload/").set("Content-Type", "multipart/form-data; boundary=bad").send("broken");
  expect(malformed.status).toBe(401);
  expect(await readdir(deps.env.UPLOAD_DIR)).toEqual([]);
});
test("rejected upload leaves no file behind: extension, signature, size", async () => {
  for (const [name, bytes, status, detail] of [["x.sh", png, 400, "Sadece resim dosyaları yüklenebilir (jpg, jpeg, png, gif, webp)"], ["x.png", Buffer.from("bad"), 400, "Dosya içeriği geçerli bir resim değil"], ["x.png", Buffer.concat([png, Buffer.alloc(5242880)]), 413, "Dosya çok büyük. Sınır: 5 MB"]] as const) {
    const response = await upload(name, bytes);
    expect(response.status).toBe(status); expect(response.body).toEqual({ detail });
    expect(await readdir(deps.env.UPLOAD_DIR)).toEqual([]);
  }
});
test("native multipart maps wrong or missing field to exact FastAPI 422 and distinguishes extra files", async () => {
  const token = await tokenFor("mod@example.com", "moderator");
  const app = createApp(deps);
  for (const r of [request(app).post("/api/upload/").auth(token, { type: "bearer" }).attach("dosya", png, "x.png"), request(app).post("/api/upload/").auth(token, { type: "bearer" }).field("description", "no file"), request(app).post("/api/upload/").auth(token, { type: "bearer" }).send({})]) {
    const response = await r; expect(response.status).toBe(422); expect(response.body).toEqual(missing);
  }
  for (const field of ["file", "dosya"]) {
    const response = await request(app).post("/api/upload/").auth(token, { type: "bearer" }).attach("file", png, "first.png").attach(field, png, "second.png");
    expect(response.status).toBe(400); expect(response.body).toEqual({ detail: "Too many files" });
  }
  expect(await readdir(deps.env.UPLOAD_DIR)).toEqual([]);
});
test("valid uppercase upload is UUID v4, served from both paths; static missing, dotfiles and directories are 404", async () => {
  const app = createApp(deps);
  const r = await request(app).post("/api/upload/").auth(await tokenFor("mod@example.com", "moderator"), { type: "bearer" }).attach("file", png, "FOTO.PNG");
  expect(r.status).toBe(200); const { url } = r.body as { url: string };
  expect(url).toMatch(/^\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$/);
  for (const path of [url, `/static${url}`]) { const served = await request(app).get(path); expect(served.status).toBe(200); expect(served.body).toEqual(png); }
  await writeFile(join(deps.env.UPLOAD_DIR, ".hidden"), "secret");
  for (const path of ["/uploads/missing.png", "/static/uploads/missing.png", "/uploads/.hidden", "/static/uploads/.hidden", "/uploads/"]) {
    const response = await request(app).get(path); expect(response.status).toBe(404); expect(response.body).toEqual({ detail: "Not Found" });
  }
});
test("large photo upload is resized to IMAGE_MAX_DIMENSION, keeps format and extension; IMAGE_OPTIMIZE=false stores bytes untouched", async () => {
  const raw = Buffer.alloc(2600 * 1800 * 3);
  let seed = 7;
  for (let i = 0; i < raw.length; i++) { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; raw[i] = seed >>> 24; }
  const photo = await sharp(raw, { raw: { width: 2600, height: 1800, channels: 3 } }).blur(1.5).jpeg({ quality: 95 }).toBuffer();
  expect(photo.length).toBeLessThanOrEqual(deps.env.MAX_UPLOAD_SIZE);

  const optimized = await upload("foto.jpg", photo);
  expect(optimized.status).toBe(200);
  const { url } = optimized.body as { url: string };
  expect(url).toMatch(/^\/uploads\/[0-9a-f-]{36}\.jpg$/);
  const stored = await readFile(join(deps.env.UPLOAD_DIR, url.slice("/uploads/".length)));
  expect(stored.length).toBeLessThan(photo.length);
  const meta = await sharp(stored).metadata();
  expect([meta.format, meta.width, meta.height]).toEqual(["jpeg", 1920, 1329]);

  deps.env.IMAGE_OPTIMIZE = false;
  const untouched = await upload("foto.jpg", photo);
  expect(untouched.status).toBe(200);
  const raw2 = await readFile(join(deps.env.UPLOAD_DIR, (untouched.body as { url: string }).url.slice("/uploads/".length)));
  expect(raw2.equals(photo)).toBe(true);
});
test("responsive WebP variants are built on first request and served from disk; other widths and missing ids 404", async () => {
  const app = createApp(deps);
  const photo = await sharp({ create: { width: 1800, height: 1200, channels: 3, background: "#07132b" } }).png().toBuffer();
  const { url } = (await upload("poster.png", photo)).body as { url: string };
  const id = url.slice("/uploads/".length, -".png".length);

  const first = await request(app).get(`/uploads/${id}-480.webp`);
  expect(first.status).toBe(200);
  expect(first.headers["content-type"]).toBe("image/webp");
  expect((await sharp(first.body as Buffer).metadata()).width).toBe(480);
  expect(await readdir(deps.env.UPLOAD_DIR)).toContain(`${id}-480.webp`);
  expect((await request(app).get(`/uploads/${id}-480.webp`)).status).toBe(200);

  for (const path of [`/uploads/${id}-500.webp`, "/uploads/00000000-0000-4000-8000-000000000000-480.webp", `/static/uploads/${id}-960.webp`]) {
    expect((await request(app).get(path)).status).toBe(404);
  }
  expect(await readdir(deps.env.UPLOAD_DIR)).not.toContain(`${id}-960.webp`);
});
test("size exactly at configured max succeeds; max + 1 reports floored MB", async () => {
  deps.env.MAX_UPLOAD_SIZE = 12; const bytes = Buffer.concat([png, Buffer.alloc(1)]);
  expect((await upload("x.png", bytes)).status).toBe(200);
  const r = await upload("x.png", Buffer.concat([bytes, Buffer.alloc(1)]));
  expect(r.status).toBe(413); expect(r.body).toEqual({ detail: "Dosya çok büyük. Sınır: 0 MB" });
});
test("download-all empty dir and admin authorization", async () => {
  const app = createApp(deps);
  expect((await request(app).get("/api/upload/download-all")).status).toBe(401);
  const mod = await request(app).get("/api/upload/download-all").auth(await tokenFor("mod@example.com", "moderator"), { type: "bearer" });
  expect(mod.status).toBe(403); expect(mod.body).toEqual({ detail: "Bu işlem için yetkiniz yok" });
  const empty = await request(app).get("/api/upload/download-all").auth(await tokenFor("admin@example.com", "admin"), { type: "bearer" });
  expect(empty.status).toBe(404); expect(empty.body).toEqual({ detail: "Yüklenecek dosya bulunamadı" });
});
test("ZIP contains every uploaded filename at root, UTC filename, no appended JSON or double send", async () => {
  deps.now = () => new Date("2026-11-14T23:59:58Z");
  const app = createApp(deps); await writeFile(join(deps.env.UPLOAD_DIR, "a.png"), png); await writeFile(join(deps.env.UPLOAD_DIR, "b.png"), "second");
  const r = await request(app).get("/api/upload/download-all").auth(await signAccessToken({ sub: "admin@example.com", role: "admin" }, TEST_JWT_SECRET, 60, deps.now()), { type: "bearer" });
  expect(r.status).toBe(200); expect(r.headers["content-type"]).toBe("application/zip"); expect(r.headers["content-disposition"]).toBe('attachment; filename="macs_uploads_20261114_235958.zip"');
  const bytes = r.body as Buffer; expect(bytes.subarray(0, 4)).toEqual(Buffer.from([80, 75, 3, 4]));
  expect(normalizeZip(bytes)).toEqual([{ name: "a.png", data: png.toString("base64") }, { name: "b.png", data: Buffer.from("second").toString("base64") }]);
});
test("real ZIP stream aborts and closes on client disconnect mid-stream", async () => {
  const app = createApp(deps); await writeFile(join(deps.env.UPLOAD_DIR, "large.png"), randomBytes(8 * 1024 * 1024));
  const abort = spyOn(ZipArchive.prototype, "abort"); const destroy = spyOn(ZipArchive.prototype, "destroy");
  const sourceDestroy = spyOn(ReadStream.prototype, "destroy");
  const server = serveEphemeral(app); const address = { port: server.port };
  const token = await tokenFor("admin@example.com", "admin");
  try {
    await new Promise<void>((resolve, reject) => {
      const client = get({ hostname: "127.0.0.1", port: address.port, path: "/api/upload/download-all", headers: { Authorization: `Bearer ${token}` } }, res => {
        if (res.statusCode !== 200) { res.resume(); reject(new Error(`ZIP status ${String(res.statusCode)}`)); return; }
        res.once("data", () => { res.destroy(); resolve(); }); res.on("error", reject);
      }); client.on("error", reject);
    });
    // Allow the server's response-close event to run after the TCP close.
    for (let i = 0; i < 100 && abort.mock.calls.length === 0; i++) await new Promise(resolve => setTimeout(resolve, 5));
    expect(abort).toHaveBeenCalled(); expect(destroy).toHaveBeenCalled(); expect(sourceDestroy).toHaveBeenCalled();
    expect(await readdir(deps.env.UPLOAD_DIR)).toEqual(["large.png"]);
  } finally { abort.mockRestore(); destroy.mockRestore(); sourceDestroy.mockRestore(); await server.stop(true); }
});

test("multipart parser failure returns 400 without writing a file", async () => {
  const response = await request(createApp(deps)).post("/api/upload/").auth(await tokenFor("mod@example.com", "moderator"), { type: "bearer" }).set("Content-Type", "multipart/form-data; boundary=bad").send("broken");
  expect(response.status).toBe(400); expect(response.body).toEqual({ detail: "There was an error parsing the body" });
  expect(await readdir(deps.env.UPLOAD_DIR)).toEqual([]);
});
test("upload 20/minute and download-all 3/hour limits have independent counters", async () => {
  deps.env.RATELIMIT_ENABLED = true; const app = createApp(deps); const mod = await tokenFor("mod@example.com", "moderator"); const admin = await tokenFor("admin@example.com", "admin");
  for (let i = 0; i < 20; i++) expect((await request(app).post("/api/upload/").auth(mod, { type: "bearer" }).attach("file", png, "x.png")).status).toBe(200);
  const limited = await request(app).post("/api/upload/").auth(mod, { type: "bearer" }).attach("file", png, "x.png");
  expect(limited.status).toBe(429); expect(limited.body).toEqual({ error: "Rate limit exceeded: 20 per 1 minute" });
  for (let i = 0; i < 3; i++) expect((await request(app).get("/api/upload/download-all").auth(admin, { type: "bearer" })).status).toBe(200);
  const zipLimited = await request(app).get("/api/upload/download-all").auth(admin, { type: "bearer" });
  expect(zipLimited.status).toBe(429); expect(zipLimited.body).toEqual({ error: "Rate limit exceeded: 3 per 1 hour" });
  expect(await readdir(deps.env.UPLOAD_DIR)).toHaveLength(20);
});
test("ZIP setup error before headers returns JSON 500, logs failure and aborts archive", async () => {
  const logs: string[] = [];
  deps.logger = pino({ level: "error" }, new Writable({ write(chunk: Buffer, _encoding, callback) { logs.push(chunk.toString()); callback(); } }));
  await deps.storage.save("a.png", png);
  const path = spyOn(deps.storage, "path").mockImplementation(() => { throw new Error("Disk unavailable"); });
  const abort = spyOn(ZipArchive.prototype, "abort");
  try {
    const r = await request(createApp(deps)).get("/api/upload/download-all").auth(await tokenFor("admin@example.com", "admin"), { type: "bearer" });
    expect(r.status).toBe(500); expect(r.body).toEqual({ detail: "Internal Server Error" }); expect(r.headers["content-disposition"]).toBeUndefined();
    expect(r.headers["cache-control"]).toBe("no-store"); expect(r.headers.etag).toBeUndefined();
    expect(logs.some(log => log.includes("ZIP stream failed") && log.includes('"errorName":"Error"'))).toBe(true);
    expect(logs.some(log => log.includes("Disk unavailable"))).toBe(false);
    expect(abort).toHaveBeenCalled();
  } finally { path.mockRestore(); abort.mockRestore(); }
});

test("Bun socket preserves encoded traversal for request-head rejection", async () => {
  const server = serveEphemeral(createApp(deps));
  try {
    for (const path of ["/uploads/..%2f..%2fpackage.json", "/uploads/a%00.png", "/static/%252e%252e/package.json", "/uploads/a%5cb.png", "/uploads/..%5cpackage.json"]) {
      const response = await new Promise<{ status: number | undefined; body: string }>((resolve, reject) => {
        get({ hostname: "127.0.0.1", port: server.port, path }, res => {
          const chunks: Buffer[] = []; res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => { resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }); });
        }).on("error", reject);
      });
      expect(response.status).toBe(400); expect(JSON.parse(response.body) as object).toEqual({ detail: "Bad Request" });
    }
  } finally { await server.stop(true); }
});

test("Bun normalizes dot segments without exposing files outside static roots", async () => {
  // This existing file is outside UPLOAD_DIR; neither a dot segment nor an
  // encoded separator may make it available through the uploads mount.
  await writeFile(join(dir, "outside-secret.txt"), "outside-upload-root");
  const server = serveEphemeral(createApp(deps));
  try {
    for (const path of ["/static/../package.json", "/static/%2e%2e/package.json", "/uploads/../outside-secret.txt", "/uploads/%2e%2e/outside-secret.txt"]) {
      const response = await socketGet(server.port, path);
      expect(response.status).toBe(404);
      expect(response.body).toBe(JSON.stringify({ detail: "Not Found" }));
      expect(response.body).not.toContain("outside-upload-root");
    }
  } finally { await server.stop(true); }
});
function socketGet(port: number | undefined, path: string): Promise<{ status: number | undefined; body: string }> {
  return new Promise((resolve, reject) => {
    get({ hostname: "127.0.0.1", port, path }, res => {
      const chunks: Buffer[] = []; res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => { resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }); });
    }).on("error", reject);
  });
}
test("chunked multipart exceeding the streaming cap returns 413 without writing files", async () => {
  deps.env.MAX_UPLOAD_SIZE = 1024;
  const server = serveEphemeral(createApp(deps));
  try {
    const token = await tokenFor("mod@example.com", "moderator");
    const response = await new Promise<{ status: number | undefined; body: string }>((resolve, reject) => {
      const client = nodeRequest({ hostname: "127.0.0.1", port: server.port, path: "/api/upload/", method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data; boundary=chunked", "Transfer-Encoding": "chunked" } }, res => {
        const chunks: Buffer[] = []; res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => { resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }); });
      });
      client.on("error", reject);
      client.write('--chunked\r\nContent-Disposition: form-data; name="file"; filename="big.png"\r\nContent-Type: image/png\r\n\r\n');
      client.write(Buffer.alloc(300 * 1024)); client.end("\r\n--chunked--\r\n");
    });
    expect(response.status).toBe(413);
    expect(JSON.parse(response.body) as object).toEqual({ detail: "İstek gövdesi çok büyük" });
    expect(await readdir(deps.env.UPLOAD_DIR)).toEqual([]);
  } finally { await server.stop(true); }
});

test("multipart media type is case insensitive", async () => {
  const original = new Request("http://localhost/api/upload/", { method: "POST", body: (() => { const form = new FormData(); form.set("file", new File([png], "x.png")); return form; })() });
  original.headers.set("Content-Type", (original.headers.get("Content-Type") ?? "").replace("multipart/form-data", "Multipart/Form-Data"));
  original.headers.set("Authorization", `Bearer ${await tokenFor("mod@example.com", "moderator")}`);
  expect((await createApp(deps).request(original)).status).toBe(200);
});
