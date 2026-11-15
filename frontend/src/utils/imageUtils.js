import { getInitialsAvatar, getMediaUrl } from '../shared/utils/media';

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
  if (!imageUrl) return fallbackImage;
  return getMediaUrl(imageUrl, 'Project');
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

/**
 * Avatar yüklenemediğinde baş harfli yedeğe düşer.
 *
 * getMediaUrl/getImageUrl yedeği yalnızca URL BOŞKEN üretiyor. Yol dolu ama
 * dosya sunucuda yoksa (404) <img> kırılır ve tarayıcı alt metnini kutunun
 * içine sıkıştırır. Bu yüzden avatar basan her <img> onError taşımalı.
 *
 * @param {Event} event - Resim hata olayı
 * @param {string} name - Baş harfi alınacak isim
 */
export const handleAvatarError = (event, name = 'User') => {
  event.target.onerror = null; // sonsuz döngüyü önle
  event.target.src = getInitialsAvatar(name);
};
