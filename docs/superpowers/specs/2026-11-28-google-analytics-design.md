# Google Analytics (GA4) + çerez onayı — tasarım

## Amaç
Siteye kaç kişinin girdiğini görmek. Sayılar GA4 panelinden okunur; admin panelinde yalnız GA'ya link olur.

## Yaklaşımlar
1. Kendi sayacımız (backend tablo + admin istatistik sayfası) — elendi.
2. **Google Analytics 4 (seçildi)** — hızlı, zengin panel; KVKK için çerez onay bandı gerekir.
3. VPS'e self-host Umami — elendi (ayrı servis, bakım yükü).
Ek karar: GTM (GTM-K5BHGDT8) yerine gtag.js doğrudan `G-YEQ7P91BTC` ile. GTM container içeriği bilinmiyor; ikisi birlikte çift sayım riski.

## Hedefler
- Onay verilen ziyaretlerde GA4'e sayfa görüntüleme (SPA rota değişimleri dahil).
- KVKK uyumlu bant: Kabul / Reddet. Onaysız hiçbir Google isteği gitmez.
- `/admin/*` ve `/login` izlenmez.
- Footer'da "Çerez tercihleri" ile seçim değiştirilebilir.
- Admin sidebar'da "İstatistikler" → https://analytics.google.com/ (yeni sekme).

## Hedef dışı
- Panel içinde grafik/sayı (GA Data API) yok.
- Reklam/kişiselleştirme izni istenmez (ad_storage, ad_user_data, ad_personalization hep denied).
- Yeni npm bağımlılığı yok.

## Kısıtlar
- Measurement ID public; koda sabit. Development'ta (NODE_ENV !== 'production') yüklenmez.
- Consent Mode v2: varsayılan denied; Kabul → analytics_storage granted, script yüklenir. Reddet → script yüklenmez; önceden kabul edip sonra reddederse analytics_storage denied update + _ga çerezleri silinir.
- Seçim localStorage'da (try/catch); okunamazsa bant gösterilir.
- Mevcut ölü `window.va` pageview kodu ve index.html'deki va stub'ı kaldırılır.

## Uygulayıcıya kalan
Bileşen yerleşimi, stil (mevcut footer/tasarım tokenları), test detayları.
