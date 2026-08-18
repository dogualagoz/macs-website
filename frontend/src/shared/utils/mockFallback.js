/**
 * Mock veriye düşme kuralı.
 *
 * Backend kapalıyken sayfaların uydurma içerik göstermesi, arızayı hem
 * ziyaretçiden hem ekipten gizliyor: site normal görünüyor, kimse fark
 * etmiyor. Bu yüzden fallback yalnızca geliştirme ortamında açık.
 *
 * Production'da hata, hata olarak gösterilmeli.
 */
export const USE_MOCK_FALLBACK = process.env.NODE_ENV === 'development';
