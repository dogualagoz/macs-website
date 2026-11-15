import { describe, expect, setDefaultTimeout, test } from "bun:test";
import sharp from "sharp";
import { optimizeImage } from "./optimize";

// Megapiksel boyutunda gurultulu goruntu kodlamak paylasimli CI runner'inda 5 sn'lik
// varsayilan limiti asiyor (iki test 5000 ms'de dustu); yerelde ~1 sn.
setDefaultTimeout(30_000);

const opts = { maxDimension: 1920, minBytes: 256 * 1024 };

// Gürültülü içerik: düz renk PNG çok iyi sıkışır, gerçek fotoğrafı temsil etmez. Tohumlu LCG, deterministik.
async function noisy(width: number, height: number): Promise<Buffer> {
  const raw = Buffer.alloc(width * height * 3);
  let seed = 42;
  for (let i = 0; i < raw.length; i++) { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; raw[i] = seed >>> 24; }
  return sharp(raw, { raw: { width, height, channels: 3 } }).png({ compressionLevel: 0 }).toBuffer();
}

describe("optimizeImage", () => {
  test("büyük PNG en fazla maxDimension'a iner, PNG kalır ve küçülür", async () => {
    const input = await noisy(3000, 2000);
    const result = await optimizeImage(input, ".png", opts);
    expect(result.optimized).toBe(true);
    expect(result.buffer.length).toBeLessThan(input.length);
    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe("png");
    expect(Math.max(meta.width, meta.height)).toBe(1920);
    expect(meta.width / meta.height).toBeCloseTo(1.5, 2);
  });

  test("JPEG formatı korunur, EXIF yönü uygulanır ve metadata (GPS dahil) silinir", async () => {
    const input = await sharp(await noisy(1200, 2400)).jpeg({ quality: 100 }).withExif({ IFD3: { GPSLatitudeRef: "N" } }).withMetadata({ orientation: 6 }).toBuffer();
    expect((await sharp(input).metadata()).orientation).toBe(6);
    const result = await optimizeImage(input, ".jpg", { ...opts, minBytes: 0 });
    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
    // Orientation 6 = 90° döndür: 1200x2400 -> 2400x1200 -> sığdırma 1920x960
    expect([meta.width, meta.height]).toEqual([1920, 960]);
  });

  test("WebP formatı korunur", async () => {
    const input = await sharp(await noisy(2500, 2500)).webp({ lossless: true }).toBuffer();
    const result = await optimizeImage(input, ".webp", opts);
    expect(result.optimized).toBe(true);
    expect((await sharp(result.buffer).metadata()).format).toBe("webp");
  });

  test("şeffaf PNG alfa kanalını korur", async () => {
    const input = await sharp({ create: { width: 2400, height: 2400, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: await noisy(1000, 1000), top: 100, left: 100 }]).png({ compressionLevel: 0 }).toBuffer();
    const result = await optimizeImage(input, ".png", opts);
    expect(result.optimized).toBe(true);
    expect((await sharp(result.buffer).metadata()).hasAlpha).toBe(true);
  });

  test("küçük ve maxDimension altındaki görsel olduğu gibi kalır", async () => {
    const input = await sharp(await noisy(200, 200)).png().toBuffer();
    const result = await optimizeImage(input, ".png", opts);
    expect(result).toEqual({ buffer: input, optimized: false, reason: "below-threshold" });
  });

  test("GIF'e (animasyon) dokunulmaz", async () => {
    const input = await sharp(await noisy(2400, 2400)).gif().toBuffer();
    const result = await optimizeImage(input, ".gif", { ...opts, minBytes: 0 });
    expect(result).toEqual({ buffer: input, optimized: false, reason: "skipped-format" });
  });

  test("animasyonlu WebP'ye dokunulmaz", async () => {
    const frame = (background: string) => sharp({ create: { width: 400, height: 400, channels: 3, background } }).png().toBuffer();
    const input = await sharp([await frame("#f00"), await frame("#00f")], { join: { animated: true } }).webp().toBuffer();
    expect((await sharp(input).metadata()).pages).toBe(2);
    const result = await optimizeImage(input, ".webp", { ...opts, minBytes: 0 });
    expect(result).toEqual({ buffer: input, optimized: false, reason: "animated" });
  });

  test("çözülemeyen içerik orijinal byte'larla döner (eski davranış)", async () => {
    const input = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 112, 97, 121]);
    const result = await optimizeImage(input, ".png", { ...opts, minBytes: 0 });
    expect(result).toEqual({ buffer: input, optimized: false, reason: "decode-failed" });
  });

  test("piksel sınırını aşan görsel (decompression bomb) işlenmeden döner", async () => {
    const input = await sharp({ create: { width: 9000, height: 9000, channels: 3, background: "#000" } }).png().toBuffer();
    const result = await optimizeImage(input, ".png", { ...opts, minBytes: 0, maxInputPixels: 50_000_000 });
    expect(result).toEqual({ buffer: input, optimized: false, reason: "too-many-pixels" });
  });

  test("sonuç orijinalden büyükse orijinal kalır", async () => {
    // q20 JPEG, q82 ile yeniden kodlanınca büyür.
    const input = await sharp(await noisy(800, 800)).jpeg({ quality: 20 }).toBuffer();
    const result = await optimizeImage(input, ".jpg", { ...opts, minBytes: 0 });
    expect(result).toEqual({ buffer: input, optimized: false, reason: "not-smaller" });
  });
});
