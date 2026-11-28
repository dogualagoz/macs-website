// Kayıtlı onayla açılan sayfalarda gtag.js, sayfanın <title>'ı gelmeden
// yüklenirse GA4'ün config ile gönderdiği ilk page_view index.html'deki
// varsayılan başlıkla gider: sayfalar React.lazy ile ayrı chunk'ta, gtag.js
// ise tekrar ziyarette tarayıcı önbelleğinden anında gelir. Bu yüzden yükleme
// başlık değişene kadar bekletilir; değişmezse (aynı başlık ya da yavaş ağ)
// süre sınırı dolunca yine yüklenir.

export const TITLE_WAIT_MS = 2000;

/**
 * document.title `previousTitle`dan farklı olunca (ya da `timeoutMs` dolunca)
 * `callback`i bir kez çağırır. Başlık zaten farklıysa hemen çağırır ve null
 * döner (iptal edilecek bekleme yok). Aksi hâlde dönen fonksiyon bekleyişi
 * iptal eder.
 */
export function waitForTitleChange(previousTitle, callback, timeoutMs = TITLE_WAIT_MS) {
  if (document.title !== previousTitle) {
    callback();
    return null;
  }

  let settled = false;
  let observer = null;
  let timer = null;

  const stop = () => {
    settled = true;
    if (observer) observer.disconnect();
    if (timer !== null) clearTimeout(timer);
  };

  const finish = () => {
    if (settled) return;
    stop();
    callback();
  };

  if (typeof MutationObserver === 'function') {
    observer = new MutationObserver(() => {
      if (document.title !== previousTitle) finish();
    });
    // react-helmet-async <title>'ı yerinde günceller ya da yenisini ekler;
    // ikisini de yakalamak için head'in tüm alt ağacı izlenir.
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
  }
  timer = setTimeout(finish, timeoutMs);

  return stop;
}
