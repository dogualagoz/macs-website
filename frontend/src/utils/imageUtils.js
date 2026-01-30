import env from '../shared/config/env';

/**
 * Resim URL'lerini işleyen merkezi utility fonksiyonları
 */

/**
 * Backend'den gelen resim URL'lerini frontend için doğru formata dönüştürür
 * 
 * @param {string} imageUrl - İşlenecek resim URL'i
 * @param {string} fallbackImage - URL geçersizse kullanılacak varsayılan resim
 * @returns {string} İşlenmiş resim URL'i
 */
export const getImageUrl = (imageUrl, fallbackImage = '/assets/images/img_innovation.png') => {
  // Resim URL'i yoksa varsayılan resmi döndür
  if (!imageUrl) return fallbackImage;
  
  // Eğer URL zaten http ile başlıyorsa olduğu gibi kullan
  if (typeof imageUrl === 'string' && imageUrl.startsWith('http')) return imageUrl;
  
  // Frontend asset'leri (Public klasöründekiler)
  const isFrontendAsset = typeof imageUrl === 'string' && (imageUrl.startsWith('/assets') || imageUrl.startsWith('assets') || imageUrl.startsWith('/images') || imageUrl.startsWith('images'));
  if (isFrontendAsset) {
    return imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  }

  // Backend'den gelen dosyalar - HER ZAMAN production URL kullan
  let path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  
  // /static/uploads -> /uploads olarak normalize et (production'da /static yok)
  if (path.startsWith('/static/')) {
    path = path.replace('/static', '');
  }
  
  return `${env.productionUrl}${path}`;
};

/**
 * Resim yüklenemediğinde çalışacak hata işleyici
 * 
 * @param {Event} event - Resim hata olayı
 * @param {string} fallbackImage - Hata durumunda gösterilecek varsayılan resim
 */
export const handleImageError = (event, fallbackImage = '/assets/images/img_innovation.png') => {
  event.target.onerror = null; // Sonsuz döngüyü önle
  event.target.src = fallbackImage;
};
