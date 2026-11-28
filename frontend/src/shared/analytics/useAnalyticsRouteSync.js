import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { syncAnalyticsRoute } from './analytics';

/**
 * Rota değişiminde analitiği bulunulan sayfaya göre ayarlar; page_view
 * göndermez (sayımı GA4'ün kendisi yapar, bkz. analytics.js).
 *
 * - İlk render'da Consent Mode varsayılanını kurar.
 * - Kayıtlı onay varken /admin ya da /login'de açılıp public bir sayfaya
 *   geçilince gtag.js'i o anda yükler; config o sayfayı bir kez sayar.
 * - Kill switch'i pathname'e göre günceller. Gezinme sırasındaki asıl
 *   güncelleme history sarmalayıcısında, GA'nın dinleyicisinden önce yapılır;
 *   bu effect yalnızca güvenlik ağıdır.
 */
export default function useAnalyticsRouteSync() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    syncAnalyticsRoute(pathname);
  }, [pathname]);
}
