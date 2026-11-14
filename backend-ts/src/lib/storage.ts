import { mkdirSync } from "node:fs";
import { readdir, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

export interface Storage {
  save(filename: string, data: Uint8Array): Promise<void>;
  remove(filename: string): Promise<void>;
  publicUrl(filename: string): string;
  list(): Promise<string[]>;
  path(filename: string): string;
}
export interface UploadedFile { originalname: string; buffer: Buffer; size: number }

export function localDiskStorage(dir: string): Storage {
  const root = resolve(dir);
  mkdirSync(root, { recursive: true });
  const filename = (name: string): string => {
    if (!name || name === "." || name === ".." || basename(name) !== name) throw new Error("Invalid storage filename");
    return name;
  };
  const path = (name: string): string => join(root, filename(name));
  return {
    async save(name, data) {
      const target = path(name);
      try { await writeFile(target, data); }
      catch (error: unknown) { await rm(target, { force: true }); throw error; }
    },
    async remove(name) { await rm(path(name), { force: true }); },
    publicUrl: name => `/uploads/${filename(name)}`,
    async list() { return (await readdir(root, { withFileTypes: true })).filter(entry => entry.isFile()).map(entry => entry.name).sort(); },
    path,
  };
}
