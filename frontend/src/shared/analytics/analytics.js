// Google Analytics 4 (gtag.js), Consent Mode v2 ile.
//
// - Yalnızca production build'de çalışır; development/test'te her çağrı no-op.
// - Varsayılan tüm izinler denied. Ziyaretçi "Kabul et" demeden gtag.js
//   indirilmez, Google'a hiçbir istek gitmez.
// - Reklam izinleri (ad_storage, ad_user_data, ad_personalization) hiç
//   istenmez, hep denied kalır.
// - Sayfa görüntülemeleri GA4'ün kendisi gönderir: config ilk page_view'i,
//   Enhanced Measurement'ın "tarayıcı geçmişi olaylarına göre sayfa
//   değişiklikleri" ayarı SPA rota değişimlerini (pushState/popstate) sayar.
//   Kod ayrıca page_view göndermez; gönderseydi her sayfa iki kez sayılırdı.
// - /admin ve /login izlenmez: bu rotalarda gtag.js hiç yüklenmez, daha önce
//   yüklendiyse GA'nın kill switch'i (window['ga-disable-<ID>']) açılır.
//   Kill switch, GA'nın geçmiş dinleyicisinden ÖNCE güncellenmeli: bunun için
//   gtag.js yüklenmeden history.pushState/replaceState sarılır ve popstate
//   dinleyicisi eklenir (bkz. installHistoryGuard). GA kendi sarmalayıcısını
//   bunların üstüne kurar, dolayısıyla yeni URL'yi gördüğünde anahtar zaten
//   doğru konumdadır.
// - Kayıtlı onayla açılışta gtag.js, sayfanın başlığı gelene kadar
//   bekletilir (bkz. pageTitle.js); yoksa ilk page_view index.html'in
//   varsayılan başlığıyla giderdi. Bekleme sürerken /admin ya da /login'e
//   geçilirse iptal edilir, izlenen bir sayfaya dönüşte yeniden başlar.
// - Onay yoksa ya da geri çekildiyse kill switch de açık: gtag.js yüklü kalsa
//   bile (kabul → reddet) çerezsiz ping dahil hiçbir istek gitmez.
// - GTM kullanılmıyor: container içeriği bilinmiyor, gtag ile birlikte çift
//   sayım riski var.

import env from '../config/env';
import { CONSENT_DENIED, CONSENT_GRANTED, readConsent, writeConsent } from './consent';
import { waitForTitleChange } from './pageTitle';

// Measurement ID public bir değer; tarayıcıya zaten gönderiliyor.
export const GA_MEASUREMENT_ID = 'G-YEQ7P91BTC';
export const GTAG_SCRIPT_SRC = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;

// GA'nın resmi kapatma anahtarı: true iken gtag hiçbir hit göndermez.
export const GA_DISABLE_KEY = `ga-disable-${GA_MEASUREMENT_ID}`;

// React Router v6 yolları büyük/küçük harf duyarsız eşler (/Admin de paneli
// açar), bu yüzden `i`.
const UNTRACKED_PATH = /^\/(admin|login)(\/|$)/i;

let enabledOverride = null;
let initialized = false;
let granted = false;
let loaded = false;
let historyGuard = null;
let cancelPendingLoad = null;
// index.html'deki başlık: modül React render'ından önce yüklenir.
let bootTitle = typeof document === 'undefined' ? '' : document.title;
// Son gezinmede ayrılınan sayfanın başlığı (ya da /admin, /login'de görülen
// son başlık). Kayıtlı onayla /admin veya /login'den public sayfaya geçişte
// bekleme bu başlığa göre yapılır: react-helmet-async yeni sayfanın başlığını
// rota effect'inden önce yazmış olabilir, o anki document.title temel
// alınırsa başlık "hiç değişmez" ve yükleme süre sınırına kadar gecikir.
let departureTitle = null;

function currentPath() {
  return window.location.pathname;
}

function isEnabled() {
  return enabledOverride === null ? env.isProduction : enabledOverride;
}

// gtag.js dataLayer'daki öğelerin Arguments nesnesi olmasını bekler; dizi
// push edilirse komutlar yok sayılır. Bu yüzden rest parametre değil.
function gtag() {
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
}

// React Router yolu çözülmüş (decode) hâliyle eşler: /%61dmin de paneli açar.
export function isUntrackedPath(path) {
  let pathname = String(path || '').split(/[?#]/)[0];
  try {
    pathname = decodeURI(pathname);
  } catch {
    // Bozuk kaçış dizisi: ham yol denenir.
  }
  return UNTRACKED_PATH.test(pathname);
}

function cancelPending() {
  if (cancelPendingLoad) cancelPendingLoad();
  cancelPendingLoad = null;
}

function injectScript() {
  if (loaded) return;
  cancelPending();
  const script = document.createElement('script');
  script.async = true;
  script.src = GTAG_SCRIPT_SRC;
  document.head.appendChild(script);
  loaded = true;
  gtag('js', new Date());
  // send_page_view varsayılan (true): config bulunulan sayfayı bir kez sayar.
  gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });
}

function setKillSwitch(path) {
  window[GA_DISABLE_KEY] = !granted || isUntrackedPath(path);
}

// gtag.js'i `path` izlenen bir sayfaysa yükler. `titleBaseline` verilirse
// yükleme, document.title bu değerden farklılaşana kadar (en çok
// TITLE_WAIT_MS) bekletilir; bkz. pageTitle.js. "Kabul et" tıklamasında
// başlık zaten hazırdır, hemen yüklenir.
function scheduleLoad(path, titleBaseline) {
  if (!granted || loaded || cancelPendingLoad || isUntrackedPath(path)) return;
  if (titleBaseline === undefined) {
    injectScript();
    return;
  }
  cancelPendingLoad = waitForTitleChange(titleBaseline, () => {
    cancelPendingLoad = null;
    // Bekleme sırasında onay geri çekildiyse ya da /admin, /login'e
    // geçildiyse yüklenmez; izlenen sayfaya dönüşte syncAnalyticsRoute yükler.
    if (granted && !isUntrackedPath(currentPath())) injectScript();
  });
}

function applyGrant(path, titleBaseline) {
  gtag('consent', 'update', { analytics_storage: 'granted' });
  granted = true;
  // Config'in göndereceği ilk page_view'den önce anahtar kapanmalı.
  setKillSwitch(path);
  scheduleLoad(path, titleBaseline);
}

// /admin ya da /login'e girilirken bekleyen yükleme iptal edilir.
function leaveIfUntracked(path) {
  if (isUntrackedPath(path)) cancelPending();
}

// history.pushState/replaceState'in hedef URL'sinin pathname'i. url verilmezse
// adres değişmez.
function targetPath(url) {
  if (url === undefined || url === null) return currentPath();
  try {
    return new URL(String(url), window.location.href).pathname;
  } catch (e) {
    return currentPath();
  }
}

// gtag.js'ten önce kurulur. React Router gezinmeyi window.history üzerinden
// yaptığı için /admin, /login'e geçişte anahtar adres değişmeden açılır;
// public sayfaya dönüşte de GA'nın dinleyicisi çalışmadan kapanır.
function installHistoryGuard() {
  if (historyGuard) return;
  const { history } = window;
  const originalPush = history.pushState;
  const originalReplace = history.replaceState;
  // popstate'te adres değişmiştir ama React henüz yeni sayfayı çizmemiştir:
  // document.title hâlâ ayrılınan sayfanınki. Capture aşaması, aynı window
  // dinleyicilerinden (React Router, GA) önce çalışmayı garantiler.
  const onPopState = () => {
    departureTitle = document.title;
    const path = currentPath();
    setKillSwitch(path);
    leaveIfUntracked(path);
  };

  // Anahtar asıl çağrıdan önce ayarlanır; çağrı hata verirse (ör. farklı
  // origin) adres değişmemiştir, anahtar bulunulan sayfaya geri alınır.
  // Bekleyen yükleme yalnızca adres gerçekten değişince iptal edilir; bekleme
  // asenkron olduğu için asıl çağrı sırasında tetiklenemez.
  const guard = (original) =>
    function guardedHistoryCall(state, unused, url) {
      const path = targetPath(url);
      if (url !== undefined && url !== null) departureTitle = document.title;
      setKillSwitch(path);
      let result;
      try {
        // eslint-disable-next-line prefer-rest-params
        result = original.apply(this, arguments);
      } catch (error) {
        setKillSwitch(currentPath());
        throw error;
      }
      leaveIfUntracked(path);
      return result;
    };
  history.pushState = guard(originalPush);
  history.replaceState = guard(originalReplace);
  window.addEventListener('popstate', onPopState, true);
  historyGuard = { originalPush, originalReplace, onPopState };
}

// GA çerezi otomatik olarak en üst alan adına yazılır (.macsclub.com.tr).
// Public suffix listesi olmadan hangisi olduğu bilinemediği için ana makine
// adının tüm üst alan adları denenir; tarayıcı geçersiz olanları
// (.com.tr gibi) zaten reddeder.
export function cookieDomainsFor(hostname) {
  const labels = hostname.split('.');
  const domains = [hostname];
  for (let i = 0; i < labels.length - 1; i += 1) {
    domains.push(`.${labels.slice(i).join('.')}`);
  }
  return domains;
}

function clearGaCookies() {
  const names = document.cookie
    .split(';')
    .map((part) => part.split('=')[0].trim())
    .filter((name) => name === '_ga' || name.startsWith('_ga_'));
  if (names.length === 0) return;

  const expired = 'expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0';
  const domains = cookieDomainsFor(window.location.hostname);
  names.forEach((name) => {
    document.cookie = `${name}=; ${expired}; path=/`;
    domains.forEach((domain) => {
      document.cookie = `${name}=; ${expired}; path=/; domain=${domain}`;
    });
  });
}

// İlk çağrıda Consent Mode varsayılanını kurar. Kayıtlı onay varsa gtag.js
// yalnızca izlenen bir sayfadaysak (başlığı gelince) yüklenir; /admin veya /login'de açılışta
// yüklenmez, ilk public sayfaya geçişte syncAnalyticsRoute yükler.
export function initAnalytics(path = currentPath()) {
  if (!isEnabled() || initialized) return;
  initialized = true;
  setKillSwitch(path);
  installHistoryGuard();
  window.dataLayer = window.dataLayer || [];
  window.gtag = gtag;
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  if (readConsent() === CONSENT_GRANTED && !isUntrackedPath(path)) {
    // İlk açılış: sayfanın başlığı index.html varsayılanından farklılaşınca.
    applyGrant(path, bootTitle);
  }
}

// App her rota değişiminde çağırır (pathname). Kill switch'i rotaya göre
// açar/kapatır; kayıtlı onay varken izlenen bir sayfaya gelindiyse ve gtag.js
// henüz yüklenmediyse yükler.
export function syncAnalyticsRoute(path) {
  if (!isEnabled()) return;
  initAnalytics(path);
  setKillSwitch(path);
  if (isUntrackedPath(path)) {
    departureTitle = document.title;
    cancelPending();
    return;
  }
  // /admin ya da /login'den public sayfaya geçiş: o sayfanın başlığı
  // (lazy chunk) gelince. Temel, ayrılınan sayfanın başlığı.
  const baseline = departureTitle === null ? bootTitle : departureTitle;
  if (granted) {
    // Onay zaten işlendi (bekleme /admin, /login'e geçişte iptal edildi ya
    // da onay orada verildi): consent update tekrarlanmadan yalnızca yükle.
    scheduleLoad(path, baseline);
  } else if (readConsent() === CONSENT_GRANTED) {
    applyGrant(path, baseline);
  }
}

// "Kabul et": tercih kaydedilir, gtag.js yüklenir; config bulunulan sayfayı
// bir kez sayar. Tercih yeniden açılıp tekrar kabul edilirse config tekrar
// çağrılmaz, sayfa yeniden sayılmaz.
// /admin ya da /login'de verilen onay kaydedilir ama gtag.js izlenen ilk
// sayfada yüklenir.
export function grantConsent() {
  writeConsent(CONSENT_GRANTED);
  if (!isEnabled()) return;
  initAnalytics();
  const path = currentPath();
  // Tıklama, sayfa çizilmişken gelir: başlık beklemesi varsa (onay az önce
  // yazıldığı için initAnalytics kayıtlı onay gibi davrandıysa) hemen yükle.
  if (cancelPendingLoad) {
    cancelPending();
    scheduleLoad(path);
    return;
  }
  if (granted) return;
  applyGrant(path);
}

// "Reddet": gtag.js hiç yüklenmez. Daha önce kabul edilmişse ölçüm
// durdurulur ve GA çerezleri silinir.
export function denyConsent() {
  writeConsent(CONSENT_DENIED);
  if (!isEnabled()) return;
  const wasGranted = granted;
  // Anahtar consent update'ten önce açılır: gtag.js update'i işlerken
  // (ör. consent değişimi ping'i) ölçüm zaten kapalı olmalı.
  granted = false;
  cancelPending();
  setKillSwitch(currentPath());
  if (wasGranted) gtag('consent', 'update', { analytics_storage: 'denied' });
  clearGaCookies();
}

// Yalnızca testler için: production dışında da mantığın çalışmasını sağlar
// ve modül durumunu sıfırlar.
export function setAnalyticsEnabledForTests(value) {
  enabledOverride = value;
}

// Testte bootTitle, sıfırlama anındaki başlık olur (index.html varsayılanı
// yerine).
export function resetAnalyticsForTests() {
  cancelPending();
  bootTitle = document.title;
  departureTitle = null;
  enabledOverride = null;
  initialized = false;
  granted = false;
  loaded = false;
  if (historyGuard) {
    window.history.pushState = historyGuard.originalPush;
    window.history.replaceState = historyGuard.originalReplace;
    window.removeEventListener('popstate', historyGuard.onPopState, true);
    historyGuard = null;
  }
  document.querySelectorAll(`script[src="${GTAG_SCRIPT_SRC}"]`).forEach((node) => node.remove());
  delete window.dataLayer;
  delete window.gtag;
  delete window[GA_DISABLE_KEY];
}
