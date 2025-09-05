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
  if (imageUrl.startsWith('http')) return imageUrl;
  
  // Backend'den gelen /static ile başlayan URL'leri backend base URL'i ile birleştir
  if (imageUrl.startsWith('/static')) {
    try {
      const RAW_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');
      return BASE_URL + imageUrl;
    } catch (_e) {
      return imageUrl; // en kötü senaryo
    }
  }
  
  // Diğer durumlarda public klasöründen al
  return process.env.PUBLIC_URL + imageUrl;
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
