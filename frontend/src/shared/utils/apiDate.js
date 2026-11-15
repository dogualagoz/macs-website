/**
 * API tarih yardımcıları.
 *
 * Backend zaman damgalarını offset'siz UTC olarak döndürüyor
 * ("2026-11-20T15:00:00" = UTC 15:00 = İstanbul 18:00). `new Date()` offset'siz
 * bir ISO metnini YEREL saat sanıyor; bu yüzden ham `new Date(event.start_time)`
 * tarayıcının saat dilimine göre kayıyor. Tüm okumalar buradan geçmeli.
 */

export const SITE_TIMEZONE = 'Europe/Istanbul';

// Türkiye 2016'dan beri yaz saati uygulamıyor, sabit UTC+3.
const SITE_UTC_OFFSET = '+03:00';

const HAS_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * API'den gelen tarihi Date'e çevirir. Geçersiz ya da boşsa null döner.
 * @param {string|number|Date|null|undefined} value
 * @returns {Date|null}
 */
export function parseApiDate(value) {
  if (value === null || value === undefined || value === '') return null;

  let date;
  if (value instanceof Date) {
    date = new Date(value.getTime());
  } else if (typeof value === 'number') {
    date = new Date(value);
  } else {
    const text = String(value).trim().replace(' ', 'T');
    if (DATE_ONLY.test(text)) {
      date = new Date(`${text}T00:00:00Z`);
    } else {
      date = new Date(HAS_OFFSET.test(text) ? text : `${text}Z`);
    }
  }

  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Bitiş (yoksa başlangıç) zamanı geçmişte mi?
 * Tarih okunamıyorsa geçmiş sayılmaz.
 */
export function isPastApiDate(value, now = new Date()) {
  const date = parseApiDate(value);
  return date !== null && date.getTime() < now.getTime();
}

/** Sıralama için ms değeri; okunamayan tarih en sona düşer. */
export function apiDateValue(value) {
  const date = parseApiDate(value);
  return date === null ? Number.POSITIVE_INFINITY : date.getTime();
}

/**
 * API tarihini <input type="datetime-local"> değerine çevirir (İstanbul saati).
 * @returns {string} "YYYY-MM-DDTHH:mm" ya da ''
 */
export function toSiteDateTimeInput(value) {
  const date = parseApiDate(value);
  if (date === null) return '';

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SITE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/**
 * <input type="datetime-local"> değerini (İstanbul saati) API'ye gidecek
 * offset'li ISO metnine çevirir. Boş girdi için null.
 */
export function siteDateTimeInputToApi(value) {
  if (!value) return null;
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return `${withSeconds}${SITE_UTC_OFFSET}`;
}
