import { rejects } from "node:assert/strict";
import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { localDiskStorage } from "./storage";
import { matchesSignature, saveImage } from "../modules/uploads/service";

let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), "macs-storage-")); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

test("local disk creates directory, saves bytes, sorted flat regular files only, removes idempotently", async () => {
  const storage = localDiskStorage(join(dir, "nested", "uploads"));
  expect(await storage.list()).toEqual([]);
  await storage.save("z.png", Buffer.from("z")); await storage.save("a.png", Buffer.from("a"));
  await mkdir(storage.path("subdir")); await symlink(storage.path("a.png"), storage.path("link"));
  expect(await storage.list()).toEqual(["a.png", "z.png"]); expect(isAbsolute(storage.path("a.png"))).toBe(true);
  expect(await readFile(storage.path("a.png"), "utf8")).toBe("a"); expect(storage.publicUrl("a.png")).toBe("/uploads/a.png");
  await storage.remove("a.png"); await storage.remove("a.png"); expect(await storage.list()).toEqual(["z.png"]);
});
test("localDiskStorage rejects traversal on every method", async () => {
  const storage = localDiskStorage(dir);
  for (const name of ["../x.png", "a/b.png", "/x.png", "", ".", ".."]) {
    expect(() => storage.path(name)).toThrow(); expect(() => storage.publicUrl(name)).toThrow();
    await rejects(storage.save(name, Buffer.from("x"))); await rejects(storage.remove(name));
  }
});
test.each([
  [".jpg", Buffer.from([255, 216, 255]), true], [".jpeg", Buffer.from([255, 216, 255]), true],
  [".png", Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), true],
  [".gif", Buffer.from("GIF87a"), true], [".gif", Buffer.from("GIF89a"), true],
  [".webp", Buffer.from("RIFF1234WEBP"), true], [".webp", Buffer.from("RIFF1234WAVE"), false],
  [".webp", Buffer.from("RIFF1234WEB"), false], [".png", Buffer.from([137, 80, 78]), false],
  [".png", Buffer.from("MZ not a png"), false], [".bmp", Buffer.from("BM"), false], [".toString", Buffer.from("x"), false],
] as const)("signature %s %p → %p", (ext, bytes, expected) => { expect(matchesSignature(ext, bytes)).toBe(expected); });
test("saveImage lowercases extension and validates before any write", async () => {
  const storage = localDiskStorage(dir); const buffer = Buffer.from("GIF89apayload");
  for (const originalname of ["x", "x.sh", "x.png"]) {
    await rejects(saveImage(storage, { originalname, buffer, size: buffer.length }), { status: 400 });
    expect(await storage.list()).toEqual([]);
  }
  const result = await saveImage(storage, { originalname: "FOTO.GIF", buffer, size: buffer.length });
  expect(result.url).toMatch(/^\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.gif$/);
  expect(await readFile(storage.path(result.url.slice(9)))).toEqual(buffer);
});
