import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { HttpError } from "../../lib/http-error";
import type { Storage, UploadedFile } from "../../lib/storage";

export const IMAGE_SIGNATURES: Record<".jpg" | ".jpeg" | ".png" | ".gif" | ".webp", readonly Uint8Array[]> = {
  ".jpg": [Buffer.from([0xff, 0xd8, 0xff])],
  ".jpeg": [Buffer.from([0xff, 0xd8, 0xff])],
  ".png": [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  ".gif": [Buffer.from("GIF87a"), Buffer.from("GIF89a")],
  ".webp": [Buffer.from("RIFF")],
};
function isImageExtension(ext: string): ext is keyof typeof IMAGE_SIGNATURES { return Object.hasOwn(IMAGE_SIGNATURES, ext); }
export function matchesSignature(ext: string, header: Uint8Array): boolean {
  if (!isImageExtension(ext)) return false;
  if (!IMAGE_SIGNATURES[ext].some(signature => signature.length <= header.length && signature.every((byte, i) => byte === header[i]))) return false;
  return ext !== ".webp" || (header.length >= 12 && Buffer.from(header.subarray(8, 12)).equals(Buffer.from("WEBP")));
}
export async function saveImage(storage: Storage, file: UploadedFile): Promise<{ url: string }> {
  const ext = extname(file.originalname).toLowerCase();
  if (!isImageExtension(ext)) throw new HttpError(400, "Sadece resim dosyaları yüklenebilir (jpg, jpeg, png, gif, webp)");
  if (!matchesSignature(ext, file.buffer.subarray(0, 12))) throw new HttpError(400, "Dosya içeriği geçerli bir resim değil");
  const filename = `${randomUUID()}${ext}`;
  await storage.save(filename, file.buffer);
  return { url: storage.publicUrl(filename) };
}
