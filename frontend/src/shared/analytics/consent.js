// Ziyaretçinin çerez tercihi (KVKK). Tercih yalnızca bu tarayıcıda,
// localStorage'da tutulur. Depolama erişilemezse (gizli pencere, engellenmiş
// site verisi) "henüz seçim yok" sayılır; bant yeniden gösterilir ve hiçbir
// Google isteği gitmez.

export const CONSENT_STORAGE_KEY = 'macs_cookie_consent';
export const CONSENT_GRANTED = 'granted';
export const CONSENT_DENIED = 'denied';

// Footer'daki "Çerez tercihleri" bağlantısı bandı bu olayla yeniden açar.
export const OPEN_PREFERENCES_EVENT = 'macs:open-cookie-preferences';

export function readConsent() {
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === CONSENT_GRANTED || value === CONSENT_DENIED ? value : null;
  } catch {
    return null;
  }
}

export function writeConsent(value) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
    return true;
  } catch {
    return false;
  }
}

export function openCookiePreferences() {
  window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT));
}
