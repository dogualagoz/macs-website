/**
 * Admin panelinden gelen dış bağlantılar (kayıt formu, yol tarifi, GitHub,
 * canlı demo) doğrudan <a href>'e basılıyor. Backend bu alanlarda şema
 * doğrulamıyor ve React 18 `javascript:` URL'lerini engellemiyor, yalnızca
 * uyarı veriyor. Bu yüzden her dış bağlantı buradan geçer: yalnızca http(s)
 * kabul edilir, şemasız alan adları https'e tamamlanır, geri kalanı null olur.
 */

const SCHEME = /^([a-z][a-z0-9+.-]*):/i;
const ALLOWED_SCHEMES = new Set(['http', 'https']);
// Şemasız girişlerde en azından "alan.adı" görünümü aranır (boşluk yok).
const BARE_HOST = /^[^\s/?#]+\.[^\s/?#]+(?:[/?#]\S*)?$/;

/**
 * @param {unknown} value
 * @returns {string|null} Güvenli mutlak http(s) URL'i ya da null
 */
export function safeExternalUrl(value) {
  if (typeof value !== 'string') return null;
  // Tarayıcılar şemadaki kontrol karakterlerini ve boşlukları yok sayıyor
  // ("java\tscript:"), kontrol de aynı normalizasyonla yapılmalı.
  // eslint-disable-next-line no-control-regex
  const trimmed = value.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (!trimmed) return null;

  let candidate;
  const scheme = trimmed.match(SCHEME);
  if (scheme) {
    if (!ALLOWED_SCHEMES.has(scheme[1].toLowerCase())) return null;
    candidate = trimmed;
  } else if (trimmed.startsWith('//')) {
    candidate = `https:${trimmed}`;
  } else if (BARE_HOST.test(trimmed)) {
    candidate = `https://${trimmed}`;
  } else {
    return null;
  }

  try {
    const url = new URL(candidate);
    return ALLOWED_SCHEMES.has(url.protocol.replace(':', '')) && url.hostname ? url.href : null;
  } catch {
    return null;
  }
}

/** Form doğrulaması: boş geçerli, dolu ise güvenli URL olmalı. */
export function isValidOptionalUrl(value) {
  return !value || !String(value).trim() || safeExternalUrl(value) !== null;
}
