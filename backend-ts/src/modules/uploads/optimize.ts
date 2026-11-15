import sharp, { type Metadata, type Sharp } from "sharp";

// libvips operation cache keeps decoded images in memory between uploads; uploads are rare, memory matters more.
sharp.cache(false);

export interface OptimizeOptions {
  /** Longest edge after resize, in pixels. Smaller images are never enlarged. */
  maxDimension: number;
  /** Images at or below this size and within maxDimension are stored untouched. */
  minBytes: number;
  /** Decompression-bomb guard: images above this pixel count are stored untouched. */
  maxInputPixels?: number;
}

export type OptimizeSkipReason = "skipped-format" | "decode-failed" | "too-many-pixels" | "animated" | "below-threshold" | "not-smaller";
export type OptimizeResult =
  | { buffer: Buffer; optimized: true }
  | { buffer: Buffer; optimized: false; reason: OptimizeSkipReason };

const DEFAULT_MAX_INPUT_PIXELS = 50_000_000;
type OutputFormat = "jpeg" | "png" | "webp";
const FORMATS: Readonly<Record<string, OutputFormat>> = { ".jpg": "jpeg", ".jpeg": "jpeg", ".png": "png", ".webp": "webp" };

function encode(pipeline: Sharp, format: OutputFormat): Sharp {
  switch (format) {
    case "jpeg": return pipeline.jpeg({ quality: 82, mozjpeg: true });
    // palette: libimagequant (pngquant'ın motoru), alfa kanalını korur.
    case "png": return pipeline.png({ palette: true, quality: 80, effort: 7, compressionLevel: 9 });
    case "webp": return pipeline.webp({ quality: 82, effort: 5 });
  }
}

/**
 * Shrinks an already signature-checked upload while keeping its format (and so its extension and URL shape).
 * Never throws: anything it cannot safely process is returned byte-for-byte, matching the pre-optimization behaviour.
 * Output carries no metadata (EXIF/GPS stripped); EXIF orientation is applied to the pixels first.
 */
export async function optimizeImage(input: Buffer, ext: string, options: OptimizeOptions): Promise<OptimizeResult> {
  const format = FORMATS[ext];
  if (!format) return { buffer: input, optimized: false, reason: "skipped-format" };
  const limitInputPixels = options.maxInputPixels ?? DEFAULT_MAX_INPUT_PIXELS;

  let meta: Metadata;
  try { meta = await sharp(input, { failOn: "error", limitInputPixels: false }).metadata(); }
  catch { return { buffer: input, optimized: false, reason: "decode-failed" }; }
  if (meta.width * meta.height > limitInputPixels) return { buffer: input, optimized: false, reason: "too-many-pixels" };
  if ((meta.pages ?? 1) > 1) return { buffer: input, optimized: false, reason: "animated" };

  const longestEdge = Math.max(meta.width, meta.height);
  if (input.length <= options.minBytes && longestEdge <= options.maxDimension) return { buffer: input, optimized: false, reason: "below-threshold" };

  let output: Buffer;
  try {
    const pipeline = sharp(input, { failOn: "error", limitInputPixels })
      .rotate()
      .resize({ width: options.maxDimension, height: options.maxDimension, fit: "inside", withoutEnlargement: true });
    output = await encode(pipeline, format).toBuffer();
  } catch { return { buffer: input, optimized: false, reason: "decode-failed" }; }

  if (output.length >= input.length) return { buffer: input, optimized: false, reason: "not-smaller" };
  return { buffer: output, optimized: true };
}
