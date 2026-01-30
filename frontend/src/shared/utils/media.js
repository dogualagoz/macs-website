/**
 * Media Helper
 * Handles URL transformations for images
 */

import env from '../config/env';

const PRODUCTION_URL = env.productionUrl;

export const getMediaUrl = (url, name = 'User') => {
  // 1. Durum: URL yoksa
  if (!url) {
    if (name === 'Project' || name === 'Event' || name === 'Sponsor') {
      return '/assets/images/img_source_code.png';
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff&size=128`;
  }

  // 2. Durum: Zaten tam URL ise (http/https)
  if (typeof url === 'string' && url.startsWith('http')) {
    return url;
  }

  // 3. Durum: Frontend asset'leri
  const isFrontendAsset = typeof url === 'string' && (url.startsWith('/assets') || url.startsWith('assets') || url.startsWith('/images') || url.startsWith('images'));
  if (isFrontendAsset) {
    return url.startsWith('/') ? url : `/${url}`;
  }

  // 4. Durum: Backend dosyaları
  let path = url.startsWith('/') ? url : `/${url}`;
  
  // /static prefix'ini kaldır (production'da /static yok)
  if (path.startsWith('/static/')) {
    path = path.replace('/static', '');
  }
  
  // Production'da production URL ekle, development'ta relative path kullan
  if (env.isProduction) {
    return `${PRODUCTION_URL}${path}`;
  }
  
  // Development'ta production URL'den çek (lokal backend'de resim yok)
  return `${PRODUCTION_URL}${path}`;
};
