import { apiDateValue, isPastApiDate } from './apiDate';

const endOf = (event) => event.end_time || event.start_time || event.date;
const startOf = (event) => event.start_time || event.date;

/**
 * Etkinlikleri bugüne yakınlığa göre sıralar:
 * önce yaklaşan/devam eden etkinlikler (en yakın başlangıç önce),
 * sonra geçmiş etkinlikler (en yeni biten önce).
 * Tarihi okunamayan etkinlikler en sona düşer. Girdi değiştirilmez.
 *
 * @template T
 * @param {T[]} events
 * @param {Date} [now]
 * @returns {T[]}
 */
export function sortEventsByProximity(events, now = new Date()) {
  const upcoming = [];
  const past = [];

  events.forEach((event) => {
    (isPastApiDate(endOf(event), now) ? past : upcoming).push(event);
  });

  upcoming.sort((a, b) => apiDateValue(startOf(a)) - apiDateValue(startOf(b)));
  past.sort((a, b) => apiDateValue(endOf(b)) - apiDateValue(endOf(a)));

  return [...upcoming, ...past];
}
