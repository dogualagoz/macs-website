/**
 * Media Helper
 * Handles URL transformations for images
 */

import env from '../config/env';

const AVATAR_BG = '#0D8ABC';
const AVATAR_FG = '#FFFFFF';

/**
 * İsmin baş harflerinden (en fazla iki) avatar üretir.
 *
 * Eskiden ui-avatars.com'a istek atılıyordu: her üyenin adı üçüncü taraf
 * bir servise gidiyordu ve servis yavaşladığında avatarlar boş kalıyordu.
 * Artık tarayıcıda SVG data URI olarak üretiliyor.
 *
 * Hem "görsel hiç yok" hem de "görsel var ama yüklenemedi" durumunda aynı
 * yedeğin kullanılabilmesi için ayrı fonksiyon. Çıktı tırnak ve parantez
 * içermez; CSS'te tırnaksız url(...) içinde de güvenle kullanılabilir.
 */
export const getInitialsAvatar = (name = 'User') => {
  const initials = String(name || '')
    .trim()
    .split(/\s+/)
    .map((word) => Array.from(word).find((char) => /\p{L}|\p{N}/u.test(char)) || '')
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toLocaleUpperCase('tr-TR') || '?';

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">` +
    `<rect width="128" height="128" fill="${AVATAR_BG}"/>` +
    `<text x="64" y="64" dy=".35em" text-anchor="middle" fill="${AVATAR_FG}" ` +
    `font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="600">${initials}</text>` +
    `</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const FALLBACK_CONTENT_IMAGE = '/assets/images/img_source_code.webp';
const CONTENT_KINDS = new Set(['Project', 'Event', 'Sponsor']);

/**
 * API'den gelen görsel yolunu tarayıcıda açılabilir URL'e çevirir.
 *
 * @param {string|null|undefined} url - Ham yol (/uploads/x.webp, tam URL ya da public asset)
 * @param {string} name - 'Project' | 'Event' | 'Sponsor' ya da kişi adı (avatar yedeği için)
 */
export const getMediaUrl = (url, name = 'User') => {
  // 1. Durum: URL yoksa
  if (!url) {
    return CONTENT_KINDS.has(name) ? FALLBACK_CONTENT_IMAGE : getInitialsAvatar(name);
  }

  if (typeof url !== 'string') return FALLBACK_CONTENT_IMAGE;

  // 2. Durum: Zaten tam URL ya da data URI ise
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:')) {
    return url;
  }

  // 3. Durum: Frontend asset'leri (public/)
  if (/^\/?(assets|images)\//.test(url)) {
    return url.startsWith('/') ? url : `/${url}`;
  }

  // 4. Durum: Backend dosyaları. /static öneki eski backend'den kalma, production'da yok.
  let path = url.startsWith('/') ? url : `/${url}`;
  if (path.startsWith('/static/')) {
    path = path.slice('/static'.length);
  }

  return `${env.apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')}${path}`;
};
