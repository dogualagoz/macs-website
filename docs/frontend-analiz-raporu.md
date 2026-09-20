# MACS Website — Frontend Analiz Raporu

**Tarih:** 2026-09-04 · **Branch:** `design/tasarim-gelistirme` (çalışma dizinindeki commit'lenmemiş değişikliklerle birlikte)
**Kapsam:** `frontend/` — işlevsel eksikler (Bölüm A) + tasarımsal geliştirme fırsatları (Bölüm B)
**Yöntem:** 4 paralel kod denetimi (routing/sayfalar, veri katmanı, admin panel, UX/SEO/performans) + güncel tasarım doğrulama taraması. `docs/tasarim-raporu.md` (2026-09-02) maddeleri mevcut kod üzerinden tek tek yeniden kontrol edildi — o raporun "Kalmadı" değerlendirmesi kısmen iyimserdi (bkz. §B1).

---

## 0. Özet ve Öncelik Matrisi

Site işlevsel olarak çalışıyor: 7 herkese açık sayfa, gerçek CRUD'lu admin paneli, hazır FastAPI backend'i. Ancak **(1)** birkaç sayfa API boş dönerse production'da sahte veri gösteriyor, **(2)** güvenlik tarafında client-side rol kontrolü kapalı ve kullanıcı onay akışı tıkalı, **(3)** performans/SEO tarafında code-splitting yok, Türkçe karakterler yanlış fontta render oluyor ve sosyal paylaşım kartları boş çıkıyor.

| # | Sorun | Alan | Etki | Öncelik |
|---|-------|------|------|---------|
| 1 | 4 sayfada koşulsuz mock fallback → production'da sahte veri | Veri | Kullanıcıya doğrudan yanlış bilgi | **P0** |
| 2 | `isAdmin = true` — rol kontrolü kapalı; kullanıcı onay UI'ı yok | Güvenlik | Yetki ve kayıt akışı tıkalı | **P0** |
| 3 | Fontlarda latin-ext eksik → ğ/ş/İ sistem fontunda (hero dahil) | Tasarım | Türkçe sitede her başlıkta görünür | **P0** |
| 4 | `macs.card` Tailwind token'ı tanımsız → proje kartları şeffaf | Tasarım | Sessiz görsel bozukluk | **P0** |
| 5 | Code splitting sıfır + mapbox-gl (~1MB) ana bundle'da | Perf | ~1.6MB JS her sayfada | **P0** |
| 6 | Statik HTML'de OG etiketi yok + relative `og:image` + domain karışıklığı | SEO | Paylaşım kartları boş | **P1** |
| 7 | Ekip/Hakkımızda hardcoded; yönetim değişikliği deploy gerektiriyor | Veri | İçerik güncellemesi imkânsız | **P1** |
| 8 | Footer'da ölü linkler (#blog, #resources), 2025 telifi, X ikonu link değil | İçerik | Kırık kullanıcı deneyimi | **P1** |
| 9 | Accent renk bölünmesi (pembe/mavi) — bozuk hover'lar, AA kontrast ihlali | Tasarım | Tutarlılık + erişilebilirlik | **P1** |
| 10 | ~6.4MB kullanılmayan görsel deploy ediliyor | Perf | Gereksiz trafik | **P1** |
| 11 | Admin'de pagination/arama/toast yok; Logs %100 mock | Admin | Yönetim deneyimi zayıf | **P2** |
| 12 | Skip-link yok; proje kartları klavye ile erişilemiyor | A11y | Erişilebilirlik | **P2** |
| 13 | Dark mode / tema stratejisi kodlanmamış | Tasarım | Sayfalar arası tema dağınıklığı | **P2** |
| 14 | Kayıt / şifre-değiştir / Bize Katıl sayfaları yok | Ürün | Eksik beklenen sayfalar | **P2** |

---

# Bölüm A — İşlevsel Eksikler

## A1. Production'a sızan sahte veri (P0)

Kod tabanının kendi kuralı `USE_MOCK_FALLBACK = NODE_ENV === 'development'` (`shared/utils/mockFallback.js:10`) — **dört sayfa bu kuralı yok sayıyor**:

| Sayfa | Koşul | Kanıt | İçerik |
|---|---|---|---|
| Ana sayfa | API boş **veya** hata | `features/home/components/DashBoard.jsx:43-45,63-65` | Sahte etkinlik/proje. Catch bloğu `setError(null)` yaptığı için hata kartı (110-123) **asla render olamaz** |
| Sponsorluk | API boş veya hata | `features/sponsors/pages/SponsorsPage.jsx:49-56,58-62` | "sponsor 1", "açıklama 1…" placeholder'ları |
| Etkinlik detay | herhangi bir hata | `features/events/pages/EventDetailPage.jsx:536-548` | "MACS's LOG 2025" gibi kurgusal etkinlik |
| Proje leaderboard | liste boş | `features/projects/pages/NewProjectsPage.jsx:388` | **Gerçek kişilerin isimleri** + picsum rastgele avatarlar + uydurma proje sayıları |

Ayrıca sahte veri dosyaları birbirinden kopuk: liste sayfası `mockProjects.js` kullanırken (`NewProjectsPage.jsx:5`), detay sayfası farklı bir dosyadan (`mockProjectsData.js:4`) fallback yapıyor — API kapalıyken listedeki bir kart, detayı çözülemeyen slug'a gidebiliyor.

**Hardcoded içerik (API'ye hiç bağlı değil):**
- Yönetim kurulu: `TeamSection.jsx:14-90` — `board_data` + `coordinator_data` dizileri. Oysa `GET /members` public ve hazır.
- Web ekibi: `AboutPage.jsx:14-51` (`websiteTeam`).
- Hakkımızda istatistikleri: "50+ Aktif Üye", "1+ Yıllık Deneyim" (`AboutPage.jsx:292-307`) — `/projeler`'deki canlı StatsCounter ile çelişiyor.
- Etkinlik detay FAQ + butonlar: "Kayıt Ol / Paylaş / Takvime Ekle" butonları işlevsiz (handler yok, `EventDetailPage.jsx:226-231,355-358`).

## A2. Auth ve güvenlik (P0)

- **Rol kontrolü kapalı:** `features/admin/pages/AdminPanel.jsx:24` → `const isAdmin = true;` (yorum: "Gerçek uygulamada bu kontrol aktif edilmelidir"). `ProtectedRoute.js:13` sadece token varlığına bakıyor; JWT'deki `role` claim'i frontend'de hiç okunmuyor. **Giriş yapan herkes `/admin/*` arayüzüne erişiyor** — tek savunma backend 403'leri.
- **Kullanıcı onay ekranı yok:** Kayıtlar "pending" doğuyor (`backend/routers/auth.py:57-59`), onay `PATCH /users/{id}/access` ile yapılıyor (`users.py:140`) — ama frontend'de bu endpoint'i çağıran **hiçbir UI yok**. Kayıt olan hiçbir hesap siteden onaylanamıyor.
- **Ölü/yanlış servis kodu:** `userService.create` → `POST /users` ve `userService.update` → `PUT /users/{id}` backend'de **mevcut olmayan** rotalar.
- **Eksik akışlar (backend hazır, frontend yok):** kayıt formu (`POST /auth/register`), şifre değiştirme (`POST /users/me/change-password`), profil düzenleme (`PUT /users/me`), "şifremi unuttum" (backend'de de yok).
- **Oturum zayıf:** Refresh token yok (backend de vermiyor); 401 → token silme + hard redirect `/login?expired=1` (`apiClient.js:35-39`). Logout sunucuya bildirilmiyor. Sekmeler arası senkron yok (`storage` dinleyicisi yok). `/users/me` başarısızsa kullanıcı yine de `{isAuthenticated:true, token}` set ediliyor (`AuthContext.js:96-100`) — geçerli token + silinmiş hesap kombinasyonu client'ta "giriş yapılmış" görünüyor. `authService`'in `verifyToken/getToken/...` yardımcıları ölü kod; AuthContext aynı işi kendi başına yeniden yazmış.
- `LoginPage.jsx:74` placeholder'ı `admin@macs.com` öneriyor.

## A3. SEO ve paylaşılabilirlik (P1)

- **SPA'nin yapısal eksiği:** `og:title/og:description/og:image` Helmet ile client-side enjekte ediliyor; build edilen `index.html`'de yalnızca `og:site_name`, `twitter:site`, canonical var. WhatsApp/Discord/Telegram unfurler'ları ve JS'siz crawler'lar **boş kart** görüyor. (Çözüm: prerender/SSG veya en azından statik varsayılan OG etiketleri.)
- **Relative og:image:** `SEO.jsx:12` `/assets/images/og-image.jpg` — spec absolute URL ister; birçok scraper düşürür. `twitter:image` de aynı (`:39`).
- **Domain tutarsızlığı:** canonical (`index.html:51`), robots, sitemap ve JSON-LD hep `esogumacs.com`; README/PRD canlı site olarak `macsclub.com.tr` veriyor. Hangisi doğruysa diğeri yanlış — netleştirilmeli.
- Sitemap mevcut `/hakkimizda` rotasını listelemiyor; `/#about` gibi fragment URL'ler içeriyor; detay sayfaları yok.
- JSON-LD telefonu (`index.html:77`: +90 538 329 6386) footer'daki telefondan farklı (`Footer.jsx:34`: +90 533 032 0102) — entity tutarlılığı zedeleniyor.
- Manifest ikonları geçersiz: 170px `img_exclude.png` 192/512 olarak bildirilmiş; `favicon.ico` referanssız; 16/32px ve 180px apple-touch-icon yok.
- Etkinlik detayda `Event` structured data yok (kulüp sitesi için en değerli schema).
- Olumlu: `SEO.jsx` artık 7 herkese açık sayfanın tamamında kullanılıyor; og-image.jpg 1200×630 doğru boyutta; `robots.txt`/`sitemap.xml`/JSON-LD mevcut.

## A4. Performans (P0/P1)

- **Code splitting sıfır:** Tek `React.lazy`/`Suspense` yok (`App.js:6-14` statik import). Mevcut build: `main.js` 586KB + **993KB mapbox chunk'ı** (~1.58MB minified JS, gzip öncesi) **her sayfada** yükleniyor — harita yalnızca `/sponsorluk`'ta, admin sayfaları da ilk bundle'da. Route-level lazy-load ilk JS'i yarıya indirir.
- **Kullanılmayan ağır görseller deploy ediliyor (~6.4MB):** `ekip2.png` (2.68MB), `ekip.png`/`heropicture.png` (1.38MB, byte-identical ikizler), `heroimages/log.jpg` (834KB), `codedrink.jpg` (569KB), `devbreak.jpg` (501KB), `brand/macs-hero-banner.jpg`, `brand/macs-kayit-qr.jpg` — hiçbir bileşen referans vermiyor (bileşenler `.webp` sürümlerini kullanıyor).
- **Font sorunu (ayrıca §B1-3):** latin-ext eksik + 5 ağırlık dosyası byte-identical + preload yok (`public/index.html`'de "Preconnect for Performance" yorumu var ama altında hiçbir link yok).
- **Analytics ölü:** `web-vitals` bağımlılığı kurulu, sıfır çağrı; Vercel analytics script'i `index.html:12`'de yorum satırı, ama pageview shim'i (`App.js:44-52`) aktif — **şu an hiçbir ölçüm toplanmıyor**. `analyticTracker.jsx` de import edilmeyen kopya.
- **Mapbox geocoding bypass:** Backend `POST /sponsors/geocode` (`sponsors.py:151`) hazır; frontend token'ı tarayıcıya gönderip Mapbox'a doğrudan istek atıyor (`sponsorService.js:55-92`).
- Hero LCP CSS `background-image` (`hero.css`) — priority hint alamıyor; JS "preload" React mount'undan sonra çalışıyor.
- nginx cache ayarları iyi (`nginx.conf:30-45`); eksikler: CSP/HSTS header'ları, Brotli, service worker (manifest var ama PWA kurulmamış).

## A5. Eksik sayfalar ve özellikler (P1/P2)

Mevcut rotalar: `/`, `/etkinlikler(+:slug)`, `/projeler(+:id)`, `/sponsorluk`, `/hakkimizda`, `/login`, `/admin/*`. **Hiç yok** (ne rota ne bileşen):

- **Bize Katıl sayfası** — üyelik tamamen dış Google Form'a bağlı (`Header.jsx:57`, `AboutPage.jsx:365`, `NewProjectsPage.jsx:425`). Header'daki tek CTA bu; en beklenen eksik sayfa.
- **İletişim sayfası** — header "İletişim" linki sadece footer'a smooth-scroll (`Header.jsx:18-36`), `/iletisim` rotası yok.
- **Blog/Haberler ve Kaynaklar** — footer'da `href="#blog"` ve `href="#resources"` **ölü linkleri** var (`Footer.jsx:20-21`); hedef id hiçbir yerde yok.
- **Galeri, SSS, etkinlik takvimi görünümü, site geneli arama, ayrı Ekip sayfası** — iz bile yok (arama yalnızca projeler sayfası içinde, `NewProjectsPage.jsx:246-252`).
- **Dark mode** — PRD backlog'unda; şu an yalnızca sayfa-bazlı yamalar (`header-dark` yalnızca /projeler'de). `prefers-color-scheme` hiçbir yerde yok.
- **Toast/bildirim sistemi** — grep: 0 sonuç. Admin mutasyon hataları yalnızca `console.error` (admin Dashboard'da 12 nokta).

Routing kalitesi:
- İç linkler plain `<a href>` → tam sayfa yenileniyor: `Footer.jsx:17-19`, `EventDetailPage.jsx:157`, `Page404.jsx:11`, `ErrorBoundary.jsx:41`.
- `Page404` Türkçe sitede İngilizce ("Oops! …").
- Etkinlik bulunamazsa boş sayfa: `EventDetailPage.jsx:555` `if (!event) return null;` (proje detayı bunu doğru yapıyor: "Proje Bulunamadı" + geri linki).
- `ComingSoon.jsx` orphan + `App.js:77`'deki yorum artık yalan söylüyor (78. satır `SponsorsPage` render ediyor).
- Route param adı `/projeler/:id` ama herkes slug gönderiyor (`App.js:76` vs `NewProjectCard.jsx:16`) — çalışıyor, kafa karıştırıyor.
- `ScrollToTop.jsx:14-16` `history.scrollRestoration='manual'` set ediyor ama konum kaydetmiyor → **geri tuşunda scroll pozisyonu kayboluyor**; 3 ayrı timeout'lu force-scroll hack'i kırılgan.
- `EventSlider.jsx:128` sahte kapasite ("100 Katılımcı") hardcoded.

## A6. Admin panel boşlukları (P1/P2)

CRUD çekirdeği sağlam: 4 içerik tipi (etkinlik/proje/sponsor/üye) için gerçek create/update/delete/toggle/görsel yükleme, `uploadService` → `POST /api/upload/` tam bağlı. Eksikler:

- **Logs %100 mock** (`Logs.jsx:9-10` hardcoded `sampleLogs` + ekranda "örnek veriler" uyarısı; backend'de log router/model'i de yok) — PRD'de "🔄 geliştirilmekte".
- **Users sayfası** liste+silme dışında boş (`Users.jsx:102` `disabled={false} // Geçici olarak tüm butonları aktif yapıyoruz`); onay/rol UI'ı yok (bkz. A2).
- **Tablolarda pagination/arama/filtre yok:** Dashboard `limit:100` çekiyor (`Dashboard.jsx:55,71`), Members/Users komple çekiyor; backend `skip/limit` destekliyor ama UI'da sayfalama yok. Bulk işlem yok.
- **Kategori yönetimi yok:** `useCategories` salt-okunur; event/project kategorilerinin create/update/delete endpoint'leri backend'de hazır, frontend'de çağıran yok. Sponsor formunda kategori listesi hardcoded (`SponsorForm.jsx:28-38`) — oysa `GET /sponsors/categories` + `sponsorService.getCategories()` hazır.
- **Proje-üye endpoint'leri bypass:** `GET/POST /projects/{id}/members` CRUD'u (`projects.py:596-781`) kullanılmıyor; üyeler payload içinde inline gönderiliyor (`useProjectForm.js:121`), yorum: "Backend role bilgisini döndürmeli".
- **Tutarsızlıklar:** MemberForm anında upload yaparken diğer 3 form submit'te upload ediyor; `useMemberForm.js:31` env'i `env.js` yerine kendi başına çözüyor; `media.js:47-51` prod/dev branch'leri birebir aynı (ölü kod); `eventService.getAll` backend'in desteklediği `sort_by/sort_desc`'i iletmiyor.
- Settings, medya kütüphanesi, draft/publish akışı yok (düşük öncelik; istek listesinde).

## A7. Kod hijyeni / ölü kod (P2)

- **Ölü bileşenler:** `ComingSoon.jsx`, `analyticTracker.jsx`, `LogoLoader.jsx` (0 kullanım), `shared/ui/EventCard.jsx`, `shared/ui/ProjectCard.jsx`, `MoreEventCard.jsx` (+CSS), `EventSlider/FeaturedEventCard/ProjectSlider/FeaturedProjectCard` (HomePage'deki section'lar `HomePage.jsx:21-22`'de yorum satırına alınınca ulaşılamaz hale geldi), `shared/components/index.js` barrel'ı.
- **Ölü CSS:** `styles/pages/home.css` (259 satır "speeder" loader CSS'i, hiçbir sınıfı render edilmiyor ama `HomePage.jsx:6`'dan import ediliyor → ana sayfa bundle'ında); `events2.css` adı yanlış (EventDetailPage stilleri); `events.css`'te neredeyse birbirinin kopyası iki `@media (max-width:600px)` bloğu (satır 1-103 ve 104-157) + `!important` yığını.
- `HomePage.jsx:18` `fade-in` sınıfı hiçbir CSS'te tanımlı değil.
- **İki `.container` tanımı** farklı padding'le: `global.css:58-62` vs `App.css:33-37` (App.css sonra yüklendiği için kazanıyor).
- `header.css:217`'de hâlâ ikinci bir `:root` bloğu (`--color: #000000`).
- `--focus-ring` token'ı tanımlı ama 0 kullanım; `--text-on-dark` yalnızca 3 yerde.
- Buton sistemleri: `macs-btn` çekirdek sistemi var (`buttons.css:10-71`) ama **JSX'te tek kullanımı yok** — hâlâ ~25 ayrı buton sınıf ailesi canlıda.
- Z-index: token'lar 5 yerde kullanılmış; hâlâ hardcoded değerler (sponsors.css:660 → 50, admin-reset.css:27 → 9999, slider.css'te 6 değer).
- `EventDetailPage.jsx:561-589` her sayfa yüklenişinde tarayıcıda `console.assert` test süiti çalıştırıyor.
- `.env.example` güncel değil: `localhost:5001/api` yazıyor (yanlış port + backend'de olmayan `/api` prefix'i).
- 46 `console.*` ifadesi (genelde `console.error` — sorun değil ama admin'de kullanıcıya görünmez hata yönetiminin işareti).

## A8. Veri katmanı mimarisi (P2)

- **Global state/cache yok:** react-query/redux/zustand yok; her şey sayfa-bazlı `useState+useEffect`. Ana sayfa mount'ta 6 paralel istek (`DashBoard.jsx:32-39`), projeler sayfası 4 istek atıyor; Home→Events→Home gezinmesi her şeyi yeniden fetch ediyor; admin mutasyonları sonrası invalidate edilecek cache de yok.
- `projectService.getAll` backend'in `le=100` limitini client'ta sıralı 100'lük döngülerle aşıyor (`projectService.js:99-117`) — public listelerde sunucu tarafı pagination yok.
- İyi taraf: `apiClient` 401 yönlendirmesi, `errorHandler.js` Türkçe mesaj eşlemesi (ama yalnızca 4 admin hook'u kullanıyor), ErrorBoundary çift noktadan bağlı.

---

# Bölüm B — Tasarım

## B1. 2 Eylül tasarım raporu maddelerinin güncel durumu

Raporun sondaki "tüm maddeler uygulandı / Kalmadı" değerlendirmesi **kısmen doğru**; kod kontrolü şu tabloyu veriyor:

| # | Madde | Durum | Kanıt (güncel kod) |
|---|-------|-------|--------------------|
| 1 | Tasarım token'ları | 🟡 Kısmen | `global.css:3-25` gerçek token seti var (renk, radius, z, font). Ama spacing skalası yok; `--accent-blue` **pembe** #F2317C tutuyor (isim/renk çelişkisi); `header.css:217`'de ikinci `:root` hâlâ duruyor |
| 2 | Tailwind `macs.*` token'ları | 🔴 Açık | `tailwind.config.js:15-33` yalnızca `macs.accent` tanımlıyor. **`macs.card` yok** ama 4 yerde kullanılıyor (`NewProjectCard.jsx:17,21,66`, `StatsCounter.jsx:39`) → Tailwind bu sınıflar için **hiçbir şey üretmiyor**, kartlar arka plandaki shimmer'ın üzerinde şeffaf. Aynı sayfadaki kardeş kartlar `bg-[#1A2332]/50` kullanıyor (`NewProjectsPage.jsx:244,291,382`) — görünür yüzey tutarsızlığı |
| 3 | Fontlar | 🟡 Kısmen | Self-host Outfit + JetBrains Mono var. **Ama latin-ext yok** (`fonts.css:8,16,24,...` yalnızca latin range) → ğ/ş/İ (U+011F/015F/0130) fallback fontta; **hero başlığındaki "HOŞ GELDİNİZ" dahil**. 5 ağırlık dosyası md5'e göre byte-identical (ya variable font 5× kopya ya 500-800 faux bold). Font preload yok |
| 4 | Odak/reduced-motion | 🟡 Kısmen | Global `:focus-visible` (global.css:42-45) ve `prefers-reduced-motion` (47-56) var. **Skip-to-content linki hâlâ yok** |
| 5 | Hero | ✅ (1 kalıntı) | Koyu scrim (hero.css:51-64), CTA'lar (HeroSection.jsx:104-111), `clamp()` (hero.css:101,114), `100dvh`, `useReducedMotion` ile slider kilidi tamam. Kalıntı: alt başlık **hâlâ 25 kelimelik TAM BÜYÜK HARF** cümle (HeroSection.jsx:100) — raporun ilk okunabilirlik şikayeti |
| 6 | Boş ekran (whileInView) | 🟡 Kısmen | Events/Projects üst bölümü `animate`'e çevrildi (düzeltilmiş). **Ama** AboutPage 10 section'ı hâlâ `hidden:{opacity:0}` + whileInView (`AboutPage.jsx:55-99,152-357`), TeamSection plakaları (`TeamSection.jsx:115-118`) ve NewProjectsPage tab/side/featured/grid bölümleri (`224-326,374-377`) hâlâ opacity:0 başlıyor; fallback yok |
| 7 | Sponsor sayfası | 🟢 Büyük ölçüde | Harita fallback'i + Grid/Map tab'ları + grid kartlarında klavye erişimi eklendi (`SponsorsPage.jsx:336-369,129-151,235-237`). Kalan: yan liste öğeleri `motion.div onClick` (role/tabIndex yok, `:493-499`) — klavye ile haritaya odaklanılamıyor |
| 8 | Login marka | ✅ (artık var) | Navy panel + logo + 44px hedefler (LoginPage.jsx:51-53,101; login.css:95-167). Artık: dosyada birinci nesil gri/Bootstrap kuralları ölü kod olarak duruyor (login.css:1-93); pembe butonun hover'ı **koyu mavi** #003d99 (`:155-160`); focus shadow mavi, border pembe (`:142-146`) |
| 9 | Buton/radius konsolidasyonu | 🟡 Kısmen | `macs-btn` sistemi var ama 0 JSX kullanımı; ~25 buton sınıf ailesi canlıda. Radius token'ları var ve bazı yerlerde kullanılıyor, ama hardcoded radius'lar (24/32/20/12/10/8/6px + `rounded-[2rem]`) sürüyor |
| 10 | Ölü dosyalar | 🟡 Kısmen | Silinmiş: `index.css`, `styles.css`, `main.css`, " 2" kopyaları. **Duruyor:** `home.css` (ölü ama import'lu), `events2.css` (yanlış adla canlı), MoreEventCard, shared/ui EventCard/ProjectCard, `fade-in` tanımsız sınıfı |
| 11 | z-index skalası | 🟡 Kısmen | Token'lar 5 yerde; sponsors.css:660 (50), admin-reset.css:27 (9999), slider.css'te 6 farklı hardcoded değer |
| 12 | Dark mode / tema kilidi | 🔴 Açık | `prefers-color-scheme` sıfır sonuç; tema stratejisi kodlanmamış — events lacivert-bant+beyaz, projects tam koyu shimmer, sponsors/about koyu hero+beyaz gövde, hepsi farklı |

## B2. Tasarım geliştirme fırsatları (öncelik sıralı)

**1. `macs.card`'ı tanımla ve koyu kart yüzeyini tekilleştir (5 satırlık düzeltme, en yüksek görsel etki).**
Projeler akışında üç rakip koyu yüzey var: şeffaf (`bg-macs-card/80` — sınıf yok, `NewProjectCard.jsx:17`), `bg-[#1A2332]/50` (`NewProjectsPage.jsx:244,291,382`), `bg-[#1A2332]/80` (detay, `NewProjectDetailPage.jsx:215,245`). `tailwind.config.js`'e `card` ekle, üçünü buna taşı. Ayrıca `GradientBackground.jsx:43` pembe radyal parlamayı tam hero/stats hizasına koyuyor — `text-gray-400` gövde metni parlak pembe parıltının üstünde düşük kontrastla kalıyor.

**2. Accent bölünmesini çöz (pembe/mavi split-brain).**
`--accent-blue` pembe #F2317C'ye repurpose edilmiş ama tüketiciler mavi varsayıyor:
- Pembe `.macs-btn--accent` hover'ı koyu **mavi** #003d99 (`buttons.css:47-54`);
- Login'de pembe border + **mavi** focus shadow (`login.css:142-146,159`);
- `team.css:12-13` `--blue: var(--accent-blue)` → koordinatör rol metni beyaz zeminde **pembe ~3.8:1** (14px metin, AA 4.5:1 altında);
- Proje detay sayfası tamamen mavi (`bg-blue-600`, `text-blue-300/400` — `NewProjectDetailPage.jsx:120,154,187,...`) ama liste sayfası pembe — **aynı akışın iki yarısı birbirini tutmuyor**;
- Legacy mavi: `.event-category #0052cc` (events.css:473); aynı mavi rozet gradient'i iki dosyada kopya (`events.css:288`, `projects.css:106`).
Çözüm: `--accent` olarak yeniden adlandır, yüzey bazında karar ver, hover'ları düzelt, rozet gradient'ini tekilleştir.

**3. Shimmer'ı tutarlı yay (ya da `PageShell` bileşenine dönüştür).**
GradientBackground tek sayfada kullanılıyor (yalnızca NewProjectsPage). Aynı akışın detay sayfası (`NewProjectDetailPage.jsx:104-110`) düz `bg-[#07132b]` kullanıyor; Events/Sponsors/About/Login her biri kendi el yapımı koyu tedavisini taşıyor (`EventsPage.jsx:40`, `sponsors.css:44`, `skeleton.css:145` aynı bant gradient'inin 3. kopyası, `login.css:96-104`). Bileşen ayrıca `#07132b` ve gradient hex'lerini inline hardcode ediyor (`GradientBackground.jsx:41-44` — token'a bağla) ve SVG filter id'si (`grain-macs-shimmer`, `:59`) tek sayfada ikinci kullanımda çakışır. Öneri: arkaplan + üst padding'i sahiplenen `<PageShell variant="dark">` sarmalayıcısı + `--bg-dark-gradient` token'ı.

**4. Hero'yu bitir (kopya + motion pası).**
- Alt başlık hâlâ 25 kelimelik ALL-CAPS (`HeroSection.jsx:100`).
- Slayt geçişi `duration: 3`sn ve 7sn'de bir otomatik dönüş (`HeroSection.jsx:72`) → zamanın %43'ünde arka plan geçiş ortasında; konvansiyonel aralık 500-800ms.
- Otomatik dönen carousel'da **indikatör/duraklatma kontrolü yok** (WCAG 2.2.2 pause beklentisi).
- İlk boyamada ~200ms düz siyah: `.hero{background-color:#000;opacity:0;animation-delay:.2s}` (`hero.css:17,21-23`) → `#07132b` kullan, delay'i düşür.
- Ana sayfa hero'da scroll işareti yok (projeler sayfasına eklendi, `NewProjectsPage.jsx:201-214`; ana hero'ya değil).
- Hero rozet PNG'leri webp'ye çevrilmemiş (`img_920228…png`, `img_esogulogo_1.png` — HeroSection.jsx:116,122).

**5. Proje kartı klavye erişimini düzelt (a11y commit'lerine göre regresyon).**
`NewProjectCard` `div onClick=navigate` — link yok, role yok, tabIndex yok (`NewProjectCard.jsx:15-17`); h3'te link yok (commit 52d6b4f4 featured kartlara gerçek link ekledi ama buna değil); ArrowRight `button` (`:72-74`) aria-label'sız, hiçbir şey yapmıyor (click div'e bubble oluyor). Featured kartta aynı kalıp (`NewProjectsPage.jsx:320-327`). Çözüm: `<Link>` sarmala ya da overlay link + `aria-label`'lı ok.

**6. framer-motion global reduced-motion CSS'ini umursamıyor → eksik yerlere `useReducedMotion`.**
CSS bloğu yalnızca CSS animasyonlarını öldürüyor; JS animasyonları çalıyor. TeamSection doğru yapıyor (`TeamSection.jsx:115-117`); **AboutPage (10 reveal section) ve NewProjectsPage (tab/sidebar/featured/leaderboard) yapmıyor** — dosya başına tek hook yeterli.

**7. Loading dillerini tekilleştir, yapay 400ms gecikmeyi kaldır.**
Üç paradigma yan yana: layout-eşleşmiş skeleton (Events/Sponsors/Projects listesi — doğru), 12 kanatlı spinner ana sayfa dashboard'ında (`DashBoard.jsx:100-107`), tam ekran spinner proje detayında (`NewProjectDetailPage.jsx:79`) — liste kardeşi skeleton kullanırken. Ayrıca Projects ve Sponsors loading'i **yapay olarak ≥400ms** tutuyor (`NewProjectsPage.jsx:72-79`, `SponsorsPage.jsx:64-69`) — skeleton'ların varlık amacıyla çelişiyor.

**8. Mikro-etkileşim sürelerini standardize et.**
Sadece projects feature'ında `duration-200/300/500/700` karışık (`NewProjectsPage.jsx:117,267`; `NewProjectCard.jsx:26,72`); görsel hover scale-105/700ms vs etkinlik kartlarında scale-110/500ms (`EventCard.jsx:44`); `team.css:146,159` `0.42s var(--ease)` vs `hero.css:143` `0.15s ease`. `team.css:22`'deki imza easing'i (`cubic-bezier(0.22,0.61,0.36,1)`) global'e taşı, 150/250/400ms adımlarını belirle. Ayrıca `EventCard.jsx:66` `group-hover:text-[#07132b]` no-op — başlık zaten #111827.

**9. Sayfa başlıklarına tek display skalası.**
Mevcut H1'ler: home `clamp(1.9rem,5.2vw,3.75rem)` (hero.css:101), projects `text-6xl md:text-8xl` = 60→96px (`NewProjectsPage.jsx:180`), proje detay `text-5xl md:text-7xl` (`NewProjectDetailPage.jsx:132`), events `text-4xl md:text-5xl` (`EventsPage.jsx:47`), about sabit `3.5rem` + manuel mobil override (about.css:39,501-502). `--text-display` tanımla, hepsine bağla. Ayrıca CTA kartı dış kaynak doku kullanıyor: `transparenttextures.com/.../cubes.png` (`NewProjectsPage.jsx:415`) — GradientBackground'un zaten taşıdığı grain SVG ile değiştir (çevrimdışı-güvenli, 1 üçüncü taraf istek azalır).

**10. Empty-state'leri yeni kart diline uydur.**
Üç farklı dil: Events düz ortalanmış metin (`EventsPage.jsx:211-220`), Projects çerçeveli kart (`NewProjectsPage.jsx:364-366`), slider'lar sade div (`EventSlider.jsx:73`). Tek `EmptyState` bileşeni (ikon + satır + aksiyon) hepsini kapatır.

**11. Küçük temizlikler (yeni dosyalarda).**
- `HomePage.jsx:21-22` yorum satırı `<EventsSection /> <ProjectsSection />` — karar ver ve sil; `fade-in` sınıfı tanımsız (`:18`); ölü `home.css` import'u (`:6`).
- `events.css`'te kopya `@media (max-width:600px)` blokları (1-103 ve 104-157) — birleştir.
- TeamSection modal'ında focus trap yok — Tab arka sayfaya kaçıyor (Escape/focus restore çalışıyor, `TeamSection.jsx:160-168`).
- AboutPage hardcoded istatistikleri StatsCounter'ın canlı verileriyle çelişiyor (bkz. A1).
- `login.css:1-93` birinci nesil ölü kurallar — sil.
- `.container` çift tanımını tekilleştir; `header.css:217` ikinci `:root`'u kaldır.
- CTA/hero dışı küçük dokunuşlar: sponsors yan liste öğelerine role/tabIndex (A§B1-7), `EventSlider` sahte "100 Katılımcı" kaldır.

---

## Yol Haritası (etki/efor dengesiyle sıralı)

**Sprint 0 — P0 hotfix'ler (küçük PR'lar, çoğu 1 saatten kısa):**
1. 4 sayfada mock fallback'i kaldır → gerçek empty-state/error-state (A1)
2. Fontlara latin-ext ekle + ağırlık dosyalarını düzelt (tek `unicode-range` eki ama tüm site tipografisi) (B1-3)
3. `macs.card`'ı tanımla, üç koyu yüzeyi tekilleştir (B2-1)
4. `isAdmin`'i gerçek role bağla; admin Users'a onay/rol UI'ı (backend hazır) (A2)
5. Route-level `React.lazy` (SponsorsPage + admin) + kullanılmayan 6.4MB görseli sil (A4)

**Sprint 1 — P1:**
6. Accent kararını ver ve yay (hover düzeltmeleri, rozet gradient tekilleştirme, `--accent` rename) (B2-2)
7. TeamSection/AboutPage'i `GET /members`'a bağla; AboutPage istatistiklerini canlı yap (A1)
8. Footer temizliği: ölü linkler, `<Link>` dönüşümü, 2025→dinamik telif, X ikonu (A5)
9. SEO paketi: domain kararı, absolute og:image, statik varsayılan OG etiketleri, manifest ikonları, `/hakkimizda` sitemap'e (A3)
10. Hero bitiş: ALL-CAPS alt başlık, geçiş süresi, indikatör/pause, ilk boyama rengi, scroll cue (B2-4)
11. Shimmer/PageShell yayılımı + `--bg-dark-gradient` token'ı (B2-3)

**Sprint 2 — P2:**
12. Kayıt + şifre-değiştir + Bize Katıl sayfaları (A2/A5)
13. react-query (cache/refetch) + toast sistemi (A8/A5)
14. Admin tablolarına pagination/arama; Logs için backend (A6)
15. A11y paketi: skip-link, kart link'leri, focus trap'ler, `useReducedMotion` eksikleri (B2-5/6, B1-4)
16. Ölü kod temizlik PR'ı (A7 listesi tek PR)
17. Proje kartı klavye erişimi + EmptyState bileşeni + loading tekilleştirme (B2-5/7/10)

## Doğrulanan İyi Yanlar

- Admin CRUD çekirdeği gerçek ve çalışıyor (4 içerik tipi, gerçek endpoint'ler, görsel yükleme akışı eksiksiz).
- SEO altyapısı (SEO.jsx 7 sayfada, JSON-LD, robots/sitemap, 1200×630 og-image) çoğu kulüp sitesinden iyi.
- Skeleton sistemi 3 listede layout-eşleşmiş olarak çalışıyor; hata kartları + retry butonları Events/Projects/Sponsors'ta mevcut.
- A11y temeli atılmış: global `:focus-visible`, `prefers-reduced-motion`, form label-id eşleşmeleri, modal Escape + focus restore (TeamSection), 44px dokunma hedefleri.
- nginx cache stratejisi doğru (index.html no-cache, static immutable, assets 7 gün).
- Yeni tasarım yönü (koyu scrim hero, shimmer, plaka-tipi ekip, token katmanı) tutarlı bir dil — sorun kapsamın projeler sayfasında durması ve accent sisteminin kendi içinde çelişmesi.

---

*Rapor: ZCode kod denetimi — 5 paralel keşif turu, tüm bulgular dosya:satır kanıtlı. Tasarım durumu `design/tasarim-gelistirme` çalışma dizini (commit'lenmemiş değişiklikler dahil) baz alınarak 2026-09-04'te doğrulandı.*
