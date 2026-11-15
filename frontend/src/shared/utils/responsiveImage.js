/**
 * Yuklenen gorseller icin srcset.
 *
 * Backend `/uploads/<uuid>-<480|960|1600>.webp` isteklerini orijinal dosyadan
 * ilk istekte uretip diskten sunuyor (backend-ts/src/modules/uploads/variants.ts).
 * Tarayici `sizes`'a gore en kucuk yeterli genisligi secer; 745 KB'lik bir PNG
 * yerine kartta ~30-60 KB'lik WebP iner.
 *
 * Varyant uretilemezse (eski backend, animasyonlu gorsel, kaynak yok) sunucu
 * 404 doner. withVariantFallback bu durumda srcset'i kaldirip orijinal `src`'ye
 * duser; ancak o da yuklenemezse asil onError (placeholder) calisir.
 */

export const VARIANT_WIDTHS = [480, 960, 1600];

const UPLOAD_PATTERN =
  /^(.*\/uploads\/)([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpe?g|png|webp)$/i;

/** `/uploads/<uuid>.<ext>` degilse (statik asset, dis URL, gif) undefined. */
export function uploadSrcSet(url) {
  if (typeof url !== 'string') return undefined;
  const match = UPLOAD_PATTERN.exec(url);
  if (!match) return undefined;
  const [, prefix, id] = match;
  return VARIANT_WIDTHS.map((w) => `${prefix}${id.toLowerCase()}-${w}.webp ${w}w`).join(', ');
}

/** <img {...responsiveImgProps(url, sizes)} />: srcset uretilemiyorsa bos nesne. */
export function responsiveImgProps(url, sizes) {
  const srcSet = uploadSrcSet(url);
  return srcSet ? { srcSet, sizes } : {};
}

/**
 * Ilk hatada srcset/sizes'i kaldirir; tarayici `src`'yi (orijinal) yeniden
 * dener. Ikinci hatada (ya da srcset yoksa) verilen onError calisir.
 */
export function withVariantFallback(onError) {
  return (event) => {
    const img = event.currentTarget || event.target;
    if (img && img.hasAttribute && img.hasAttribute('srcset')) {
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      return;
    }
    if (onError) onError(event);
  };
}
