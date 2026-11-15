import { randomUUID } from "node:crypto";
import { rename, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

sharp.cache(false);

/**
 * Responsive WebP variants of uploaded images, generated on first request.
 *
 * `/uploads/<uuid>-<width>.webp` is derived from `/uploads/<uuid>.<ext>` and written next to it, so the
 * static handler serves it from disk afterwards. Doing it lazily means images uploaded before this feature
 * need no migration, and only widths the frontend actually asks for are ever produced.
 *
 * Only the fixed widths below are accepted: an attacker cannot make the server produce arbitrary sizes,
 * so the worst case is three small files per upload.
 */
export const VARIANT_WIDTHS = [480, 960, 1600] as const;
const VARIANT_PATTERN = /^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-(480|960|1600)\.webp$/;
const SOURCE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;
const MAX_INPUT_PIXELS = 50_000_000;
const WEBP_QUALITY = 75;

export interface VariantRequest { id: string; width: number }

/** Parses `/<uuid>-<width>.webp`; anything else (including other widths) is not a variant. */
export function parseVariantPath(relative: string): VariantRequest | null {
  const match = VARIANT_PATTERN.exec(relative);
  if (!match?.[1] || !match[2]) return null;
  return { id: match[1], width: Number(match[2]) };
}

async function findSource(root: string, id: string): Promise<string | null> {
  for (const ext of SOURCE_EXTENSIONS) {
    const candidate = join(root, `${id}${ext}`);
    const info = await stat(candidate).catch(() => null);
    if (info?.isFile()) return candidate;
  }
  return null;
}

const inFlight = new Map<string, Promise<boolean>>();

/**
 * Makes sure `<root>/<id>-<width>.webp` exists. Returns false when there is no source image or it cannot be
 * decoded (animated, too large, corrupt); the caller then answers 404 and the frontend falls back to the
 * original URL. Concurrent requests for the same variant share one encode. Never throws.
 */
export function ensureVariant(root: string, request: VariantRequest): Promise<boolean> {
  const target = join(root, `${request.id}-${String(request.width)}.webp`);
  const pending = inFlight.get(target);
  if (pending) return pending;
  const job = generate(root, request, target).finally(() => inFlight.delete(target));
  inFlight.set(target, job);
  return job;
}

async function generate(root: string, request: VariantRequest, target: string): Promise<boolean> {
  if ((await stat(target).catch(() => null))?.isFile()) return true;
  const source = await findSource(root, request.id);
  if (!source) return false;

  let output: Buffer;
  try {
    const image = sharp(source, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS });
    const meta = await image.metadata();
    if ((meta.pages ?? 1) > 1) return false;
    output = await image
      .rotate()
      .resize({ width: request.width, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer();
  } catch {
    return false;
  }

  // Write to a temp name and rename: a reader never sees a half-written file.
  const temp = join(root, `.${request.id}-${String(request.width)}.${randomUUID()}.tmp`);
  try {
    await writeFile(temp, output);
    await rename(temp, target);
    return true;
  } catch {
    await unlink(temp).catch(() => undefined);
    return false;
  }
}
