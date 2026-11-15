import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { ensureVariant, parseVariantPath } from "./variants";

const ID = "0b8c3f4e-1d2a-4b5c-8d9e-0f1a2b3c4d5e";
let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), "macs-variants-")); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe("parseVariantPath", () => {
  test("yalnizca uuid + izinli genislik + .webp kabul edilir", () => {
    expect(parseVariantPath(`/${ID}-480.webp`)).toEqual({ id: ID, width: 480 });
    expect(parseVariantPath(`/${ID}-1600.webp`)).toEqual({ id: ID, width: 1600 });
    for (const path of [`/${ID}-500.webp`, `/${ID}-480.png`, `/${ID}.webp`, `/../${ID}-480.webp`, `/x-480.webp`, `/${ID.toUpperCase()}-480.webp`]) {
      expect(parseVariantPath(path)).toBeNull();
    }
  });
});

describe("ensureVariant", () => {
  test("PNG kaynaktan istenen genislikte WebP uretir; kucuk kaynagi buyutmez", async () => {
    await writeFile(join(root, `${ID}.png`), await sharp({ create: { width: 2000, height: 1000, channels: 3, background: "#07132b" } }).png().toBuffer());
    expect(await ensureVariant(root, { id: ID, width: 480 })).toBe(true);
    const small = await sharp(join(root, `${ID}-480.webp`)).metadata();
    expect([small.format, small.width, small.height]).toEqual(["webp", 480, 240]);

    await writeFile(join(root, `${ID}.png`), await sharp({ create: { width: 300, height: 200, channels: 3, background: "#fff" } }).png().toBuffer());
    expect(await ensureVariant(root, { id: ID, width: 960 })).toBe(true);
    expect((await sharp(join(root, `${ID}-960.webp`)).metadata()).width).toBe(300);
  });

  test("kaynak yoksa, bozuksa ya da animasyonluysa false; gecici dosya kalmaz", async () => {
    expect(await ensureVariant(root, { id: ID, width: 480 })).toBe(false);
    await writeFile(join(root, `${ID}.jpg`), "not an image");
    expect(await ensureVariant(root, { id: ID, width: 480 })).toBe(false);
    await rm(join(root, `${ID}.jpg`));
    // Kareler farkli renkte olmali; ayni kareleri kodlayici tek kareye indiriyor.
    const frame = (background: string) => sharp({ create: { width: 40, height: 40, channels: 3, background } }).png().toBuffer();
    const animated = await sharp([await frame("#f00"), await frame("#00f")], { join: { animated: true } }).webp().toBuffer();
    await writeFile(join(root, `${ID}.webp`), animated);
    expect(await ensureVariant(root, { id: ID, width: 480 })).toBe(false);
    expect((await readdir(root)).sort()).toEqual([`${ID}.webp`]);
  });

  test("ayni varyant icin eszamanli istekler tek kodlama paylasir", async () => {
    await writeFile(join(root, `${ID}.jpg`), await sharp({ create: { width: 1200, height: 800, channels: 3, background: "#123456" } }).jpeg().toBuffer());
    const results = await Promise.all(Array.from({ length: 5 }, () => ensureVariant(root, { id: ID, width: 960 })));
    expect(results).toEqual([true, true, true, true, true]);
    expect((await readdir(root)).sort()).toEqual([`${ID}-960.webp`, `${ID}.jpg`]);
  });
});
