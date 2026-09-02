# MACS Website — Tasarım Denetim Raporu

**Tarih:** 2026-09-02 · **Kapsam:** `frontend/` (localhost:3000, headless Chrome 1440px + 390px ekran görüntüleri ve kaynak kod analizi)

**Genel okuma:** Kulüp sitesi; öğrenci + sponsor + etkinlik katılımcısı üç kitlesine hitap ediyor. Mevcut durum: iki ayrı tasarım dili (eski global-CSS sayfaları + yeni Tailwind sayfaları) yan yana, tutarsız temalar, yüklenirken boş kalan ekranlar ve kritik mobil taşmalar. Sorunların çoğu "kod yazmadan düzelemez" değil; bir tasarım sistemi katmanı (token'lar) + birkaç yerleşim düzeltmesi ile toparlanabilir.

---

## 0. Öncelik Matrisi

| # | Sorun | Etki | Öncelik |
|---|-------|------|---------|
| 1 | Mobilde hero metni viewport'tan taşıyor | Kullanıcıya doğrudan bozuk görünüyor | **P0** |
| 2 | Hero + sayfa başlıklarında WCAG altına düşen kontrast | Okunabilirlik/a11y | **P0** |
| 3 | Scroll-reveal içerikler ilk ekranda `opacity:0` → boş ekran | "Site bozuk" algısı, CLS | **P0** |
| 4 | Sponsorluk sayfasında dev boş panel ve ölü gri bölüm | Bozuk kompozisyon | **P0** |
| 5 | `og-image.png` referansı hatalı (dosya `.jpg`) | Paylaşım kartı kırık | **P0** |
| 6 | Sayfalar arası tema kilitliliği yok (açık/koyuk karışımı) | Marka dağınıklığı | **P1** |
| 7 | Bildirilen fontlar (Roboto/Inter) hiç yüklenmiyor | Her makinede farklı görünüm | **P1** |
| 8 | Tasarım token'ı yok: 3 rakip koyu zemin, 20+ radius, 17 buton stil | Tutarlılık imkânsız | **P1** |
| 9 | Skeleton/boş hata durumları yok (0 iskelet loader) | Algılanan performans | **P1** |
| 10 | Login ekranı markasız, Bootstrap-geneli | Güven hissi | **P2** |

---

## 1. Kritik Görüntü Bulguları (ekran analizleri)

### 1.1 Ana sayfa hero (`HeroSection`)
- Fotoğrafın üzerine çok koyu beyaz overlay konmuş; beyaz alt başlık (`BU SİTE ESKİŞEHİR...`) soluk zemin üzerinde **~2:1 kontrast** — WCAG AA (4.5:1) ciddi altında. Overlay'i koyu scrim (siyah %50-60, degrade) yap, metni gerçekten okunur kılar.
- Alt başlık tamamı büyük harf + letter-spacing → okuması en zor tipografi kombinasyonu. Normal cümle düzenine çevir, uzunluğu kısalt (şu an 2 cümle, ~25 kelime).
- **CTA yok.** İki küçük ikon-kutucu (GitHub + rozet) tek anlamlı aksiyon olarak duruyor. "Etkinlikleri Keşfet" (birincil) + "Projeler" (ikincil) butonu eklenmeli; "Bize Katıl!" sadece header'da kalmasın.
- Logo + başlık + alt metin ortalanmış, fotoğrafın odak noktasıyla çakışıyor; alt kademede koyu bir bant veya gradient scrub ile ayrıştır.

### 1.2 Mobil (390px) — **taşıyor**
- Hero H1 "MACS'E HOŞ GELDİNİZ" ekran sağından kesilmiş; alt metin de taşıyor (`BÖ` →). Sabit px font-size + nowrap benzeri davranış. Çözüm: `clamp()` tipografi, konteyner `max-width: 100vw; overflow-x: clip` emniyeti, alt metni mobilde `text-wrap: balance`.

### 1.3 Projeler sayfası
- Açılışta **tamamen boş lacivert ekran**: içerik framer-motion `whileInView` ile opacity 0'da başlıyor, headless/JS-pasif kullanıcı ve yavaş bağlantıda sayfa boş görünür. `viewport={{ once: true, amount: 0.15 }}` gibi düşük eşik + `initial={{opacity:0}}` yerine CSS `@supports` fallback; kritik başlık/filtre alanı animasyonsuz render edilmeli.
- Tema: bu sayfa koyu (#050B14), ana sayfa açık, etkinlik gövdesi beyaz → sayfalar arası "yarı karanlık yarı aydınlık" hissi. Tek bir tema kararı şart (bkz. §3.3).

### 1.4 Etkinlikler
- Koyu başlık bandında "Etkinlikler" **gri metin lacivert zeminde** (~3:1) → zayıf.
- Başlık bandı ile kartlar arasında ~700px boşluk var: kartlar viewport'a girmeden render edilmiyor. Aynı `whileInView` sorunu.
- Kartlar 2'li düzende, sağda ve altta büyük beyaz boşluk; 2 etkinlikte sayfa "yarım kalmış" görünüyor. Ya 3'lü grid + boş kontenjanı "yaklaşan etkinlik yoksa" düzgün bir empty-state ile doldur, ya da "Geçmiş etkinlikler"i kronolojik timeline'a çevir (içerik zenginliği problemi layout ile çözülür).
- "Game Test Event" kartı screenshot ortasında hala opaklığa geçmemiş (reveal başlangıcı) → gerçek kullanıcıda hızlı scroll'da hayalet kartlar oluşuyor.

### 1.5 Sponsorluk
- Solda **içi boş dev kart** (harita paneli — Mapbox yüklenmiyor/token yoksa görünür bir "harita yüklenemedi" fallback'i bile yok), sağda 6'lık dar liste, altında tam-poz genişlikte boş gri şerit. Sayfanın ilk ekranı neredeyse tamamen ölü alan.
- 26 sponsor var, liste 6 gösteriyor: scroll-snap pill şeridi veya logo-grid (bento) daha iyi; adres satırları `...` ile kesilmiş — kesmek yerine 2 satıra sar, gereksizse tamamen çıkar (adres kimin için önemli?).
- Harita: yüklenemezse statik konum görseli + "Yolda" adres kartı göster (graceful degradation), beyaz delik bırakma.

### 1.6 Hakkımızda
- Lacivert bandın sonrası bomboş (yine opacity-0 reveal). Ayrıca kod tarafında: `AboutPage.jsx:103-107` verisi `setTimeout(0.5s)` sahte yükleme + **0 hata yönetimi** — veri gelmezse sonsuz beyaz.

### 1.7 Login
- Gri zeminde jenerik beyaz kart, mavi (#3b82f6) buton — sitenin geri kalanıyla ZERO marka bağı. En azından: MACS logolu panel, koyu/açık tema uyumu, "kulüp üyesi misin?" bağlantısı.

---

## 2. Tipografi

| Bulgular | Kanıt |
|---|---|
| Roboto ~30 yerde bildiriliyor ama **hiç yüklenmiyor** → her cihazda sistem fontuna düşüyor | `styles/pages/styles.css:145`, `team.css:71`, `header.css:320` |
| Inter bildiriliyor, yüklenmiyor | `styles.css:8,109`, `EventDetail.css:3` |
| `index.html:88-89` font preconnect'leri var ama stylesheet link'i yok → ölü ağırlık | `public/index.html` |
| 4 ayrı font stack (system, Roboto, Inter, Segoe UI) | `index.css:13`, `global.css:15`, `Page404.css:16`, `projects.css:30` |

**Öneri:** Tek bir display + body ailesi seç ve **self-host** (CRA'da `<link>` yerine `@font-face` + `font-display: swap`). Kulübün matematik/kompüter kimliği için akla yatkın: body `Geist Sans` / `Outfit`, veri-başlık ikramiyesi `Geist Mono` (tarih, sayı, etiketler — teknik kulüp hissi). Tüm `font-family` deklarasyonlarını `--font-sans` / `--font-mono` değişkenine bağla.

**Hiyerarşi:** Başlıklar px sabit; `clamp()` ölçek sistemi kur (örn. h1 `clamp(2rem, 5vw, 3.5rem)`). Hero alt metninin tamamı-büyük-harf kalıbını bırak; section başlıklarında tek bir formül kullan.

---

## 3. Renk & Tema Sistemi

### 3.1 Token yokluğu
- Tek token bloğu 6 değişken (`global.css:1-8`) ve **kullanım 21 adet** — 11.000+ satır CSS'in gerisi elle hex. En sık: `#ffffff`×149, `#07132b`×60, `#000000`×34, `#6b7280`×31...
- `tailwind.config.js:13-15` `theme.extend` **boş** → Tailwind de tokensuz.
- İkinci bir `:root` header içinde tanımlı (`header.css:217`) → rakip token kaynağı.

### 3.2 Koyu zemin kaosu
Aynı "koyu mavi" üç değerde yaşıyor: `#07132b` (60×), `#050B14` (yeni sayfalar), `#0a1a3a` (14×) + inline `#1A2332`. Yan yana geldiklerinde hafif renk farkı olarak görünür (özellikle Projects hero bandı vs header).

### 3.3 Tema kilidi önerisi
Sayfalar tutarsız: ana sayfa açık, Projects koyu, Events lacivert-bant+beyaz-gövde. İki seçenek:
- **A (önerilen): Açık temel + koyu "moment"ler.** Beyaz/off-white zemin, hero ve footer'da marka mavisi koyu bloklar. Eski CSS sayfaları bu yönde zaten; yeni sayfalar (`NewProjectsPage` #050B14) eski dile çekilir.
- **B: Tam koyu site.** Daha "teknoloji kulübü" duruşu ama eski 11k satır CSS'in baştan taranması gerekir.

Her iki durumda da semantik token seti: `--bg`, `--bg-elevated`, `--text`, `--text-muted`, `--brand` (MACS mavisi — mevcut `#0052CC` iyi bir başlangıç), `--accent` (tek vurgu rengi, tüm sayfada sabit), `--border`. Hex'ler sadece token tanımında kalır.

### 3.4 Vurgu rengi disiplini
Şu an event rozetlerinde kırmızı tonları (`Geçmiş` badge #f... ailesi), linklerde #3b82f6, markada #0052CC, login'de #3b82f6, GitHub butonu moru... **Tek accent kilidi** şart (§0.D AI-tell değil, tutarlılık kuralı).

---

## 4. Bileşen Sistemi ve Tutarlılık

- **17+ buton sınıfı**: `.button`, `.btn-primary`, `.First-button`, `.slider-cta-button`, `.Git-button`, `.event-detail-buttonPrimary`... → `Button` (primary/secondary/ghost), `Badge`, `Card`, `SectionHeader` olmak üzere 4 çekirdek bileşene indir.
- **Radius skalası yok**: 5px/6px/7px/8px/10px/12px/15px/16px/20px/24px/0.375rem/0.5rem/0.75rem/9999px — 20+ değer. Tek ölçek seç (örn. kart 16px, control 8px, pill tam) ve `--radius-*` token'la.
- **Boşluk**: `8/12/16/24px` yığını + Tailwind paralel kullanımı → 4px tabanlı ölük (`--space-1..12`) + tüm `py`/`gap` değerlerini oraya bağla.
- **z-index anarşisi**: 1/2/5/10/50/1000/9999/-1 → 3 katman yeterli: `--z-nav: 40`, `--z-modal: 50`, `--z-toast: 60`.
- **Kopya bileşenler**: `shared/components/ui/EventCard.jsx` ile `features/events/components/EventCard.jsx` aynı işi yapıyor; `FeaturedEventCard` da iki yerde. Tek kütüphane `shared/` altında toplansın.
- **64 inline style** (en kötü `MemberSelector.jsx` 16 adet) → sınıf/token'a taşı.
- **Ölü kod**: `src/index.css` hiç import edilmiyor (içindeki 44px touch-target kuralları da bu yüzden ölü), `main.css` 0 bayt, `styles.css` 1357 satır + `EventDetail.css`/`ProjectDetail.css` import edilmiyor, `sponsors 2.css`, `SponsorForm 2.jsx` gibi macOS kopyaları. Silme PR'ı tek başına değerli.

---

## 5. Erişilebilirlik

| Sorun | Kanıt |
|---|---|
| **`:focus-visible` hiç yok** — klavye kullanıcıları odak göremiyor | tüm stil dosyaları; sadece `login.css:64` `:focus` |
| 8 tıklanabilir `div` (role/tabIndex/onClick yok) | `FeaturedProjectCard.jsx:31,62,76`, `Header.jsx:65`, `TeamSection.jsx:120` |
| Label↔input eşleşmesi yok (`htmlFor`/`id` eksik) | `FormInput.jsx:15`, `ImageUploader.jsx:19` |
| Arama inputu placeholder-only | `NewProjectsPage.jsx:204-208` |
| Kontrast: `#9ca3af` açık zeminde (~2.5:1) | `team.css:87`, `footer.css:110` |
| Logo `alt=""` (marka görseli boş bırakılmış) | `Header.jsx:63` |
| `prefers-reduced-motion` desteği 0 — 135+ animasyon prop'u herkese zorla | 10 framer-motion dosyası, `HeroSection.jsx:32` (7s oto-rotasyon) |

**Hızlı kazanımlar:** global `:focus-visible` halkası (accent renk, 2px offset); div'leri `<button>`/`<a>` yap (veya en az `role="button" tabIndex={0} + onKeyDown`); `FormInput`'a `useId()`; tüm motion bileşenlerine `useReducedMotion()` + rota-oto'da `paused`.

---

## 6. Hareket (Motion) Tasarımı

- Mevcut kalıp: içerik `opacity:0` başlıyor, scroll'da beliriyor → **içerik erişiminin animasyona bağlanmış** (en büyük sorun, bkz. §1.3). Kural: *animasyon sunumu güzelleştirir, içeriği kilitlemez.* Above-the-fold ve sayfa başlıkları statik render; reveal sadece hover/ikincil kartlarda.
- Hero slider 7 sn'de bir kendi kendine dönüyor, `prefers-reduced-motion` yok sayılıyor → duraklat/indikatör ekle, reduce'da carousel yerine tek statik hero görseli.
- Easing çeşitliliği: her yerde default `ease`. Tek imza easing (`cubic-bezier(0.16,1,0.3,1)`) + 150-250ms micro / 400-600ms reveal standardı.
- `App.js:29-35` ham `scroll` listener → setState her karede. IntersectionObserver'a çevir (tek satırlık kural değişimi, header-scrolled eşiği için).

---

## 7. Durumlar ve Algılanan Performans

- **0 skeleton.** `Loading.jsx` spinner'ı sayfa iskeletiyle aynı formda değil → içerik gelince layout jump. Kart-liste sayfalarına (Events, Projects, Sponsors, Admin) layout-eşleşimli iskelet yaz; `LogoLoader`'ı sadece ilk boot'a sakla.
- **Sahte yükleme:** `HomePage.jsx:11-16` ve `AboutPage`'deki `setTimeout(0.5)` — veri durumunu taklit ediyor, gerçek yükleme yavaşsa yalan söylüyor. API `loading` state'ine bağla.
- **Hata durumu eksikleri:** AboutPage'de hiç `setError` yok; Events/Sponsors hata durumunda ne gösterdiği belirsiz. Standart: satır-içi hata + "Tekrar dene" butonu.
- **Boş durumlar** kısmen iyi (12+ "bulunamadı"), ama hero ve bölüm bazında tasarlanmış empty-state yok (bkz. §1.4 etkinlik yok senaryosu).

---

## 8. Görseller ve Web Vitals

- **41 PNG + 22 JPG, 0 webp/avif.** `sharp` ile toplu dönüşüm script'i (`scripts/` altında duran sync-uploads.sh'e ekle) → ~%60 hacim.
- **0 `<img>` width/height içermiyor** → her görsel yüklenişte CLS. Helper bir `Img` bileşeni: `aspect-ratio` sargısı + `loading="lazy"` (mevcutta 17/64) + hero/first-view için `priority` benzeri eager.
- Hero arka plan slider'ı JS ile 3 büyük görsel yüklüyor → LCP adayı; tek optimize LCP görseli + ikincileri idle'da prefetch et.
- `og:image` **kırık**: `index.html:59-60` `og-image.png` diyor, diskte `og-image.jpg` var (`SEO.jsx:12` doğru). Paylaşımda görselsiz kart.
- JSON-LD (`index.html:129`) olmayan `/search` rotasını duyuruyor — ya rota ekle ya schema'dan çıkar.
- `SEO.jsx` sadece 5 sayfada; `Projeler/:id` ve `Etkinlikler/:slug` detail sayfalarında canonical/description yok → SEO kaybı.

---

## 9. Responsive Sistem

- Kırılım noktaları derbeder: 480/600/639/640/768/1024 px karışımı + Tailwind sm/md/lg paralel evreni. Tek set: 640/768/1024/1280.
- **18× `100vh`** (`hero.css:9` vb.), 0 `dvh` → iOS'ta hero taşması. Global `min-h-[100dvh]` eşdeğeri `height: 100dvh; height: 100vh` fallback kalıbı.
- Mobil collapse çoğu bölümde `@media 768` ile var ama hero metin ölçeklemesi yok (§1.2). Her bölüm için "<768px tek sütun" kontrol listesi: hero, slider, sponsor split'i, timeline.
- Touch: index.css'teki 44px hedef kuralları ölü dosyada (§4). Canlıya taşı; mobil header hamburger boyutunu doğrula.

---

## 10. Bilgi Mimarisi / İçerik Stratejisi (büyük resim)

1. **Tek tekrar eden section formülü:** bant-başlık → kart grid'i, her sayfada aynı. Layout family çeşitliliği ekle: etkinliklerde timeline, projelerde bento (1 öne çıkan + grid), ekipte dengeli mozaik, sponsorlarda logo wall + vaka kartı.
2. **Ana sayfa hunisi yok.** Sıra: ne yapıyoruz (projeler) → katıl (CTA) → takvime bağla (yaklaşan etkinlik) → kanıt (sponsor/ekip) → başvuru. Şu an section'lar birbirinden kopuk; her section'a tek yönlendirici link.
3. **"İletişim" nav'da var, route yok** (App.js'te `/iletisim` görünmüyor — footer anchor olabilir; doğrula). Ölü link hissi bırakma.
4. **Etkinlik kartları** afiş görseli güçlü ama kartta tarih/konum metin bloğu görselle çakışıyor; afiş görsellerini (DB'de duran poster'leri) `object-fit: contain` yerine crop + overlay scrim ile standardize et.
5. **Admin paneli** (`#1A2332` inline, 16 inline style) kullanıcı-facing değil ama login'i halka açık; marka diline çekmek ucuz, bırakmak yarın borç.

---

## 11. Uygulama Planı (sıralı)

**Hafta 1 — P0 hotfix (küçük PR'lar):**
1. Mobil hero `clamp()` + overflow fix (§1.2)
2. Hero scrim + başlık kontrastları (§1.1, §1.4)
3. `whileInView` eşiklerini düşür + above-fold'u statik render'la (§1.3)
4. `og-image` düzelt, JSON-LD'yi rotalarla eşle (§8)
5. Sponsor boş paneline fallback + ölü gri bölümü kaldır (§1.5)

**Hafta 2-3 — Temel (token katmanı):**
6. `tailwind.config.js` theme.extend'e renk/radius/space/font token'ları + `global.css`'e eşle; 3 lacivert değerini tekilleştir (§3)
7. Fontları gerçekten yükle (self-host, swap) ve tüm stack'leri değişkene bağla (§2)
8. `Button`/`Badge`/`Card`/`SectionHeader` çekirdek bileşenleri + eski-buton-yeni-bileşen köprüsü (§4)
9. Dead CSS/dosya temizlik PR'ı (§4)

**Hafta 3-4 — A11y + durumlar + motion:**
10. `:focus-visible` global, div→button dönüşümleri, label/useId, alt/aria (§5)
11. `useReducedMotion` sarmalayıcı + hero slider duraklatma (§6)
12. Skeleton sistemi + gerçek loading/hata state'leri (§7)
13. Görsel optimizasyon script'i (webp), `Img` bileşeni, lazy/size (§8)

**Sonra — stratejik:** tema kararı doğrultusunda section-layout çeşitlendirme ve ana sayfa hunisi revizyonu (§10) — büyük görsel sıçrama burada.

---

## Ek: Doğrulanan iyi yanlar
- SEO altyapısı (title/description/OG/Twitter/JSON-LD + `SEO.jsx`) çoğu kulüp sitesinden iyi — sadece §8'deki iki hata var.
- Empty-state metinleri çoğu listede düşünülmüş.
- ErrorBoundary bağlı (`App.js:63`) ve stilli.
- Upload'lar bind-mount stratejisiyle prod'a taşınmaya akıllıca hazırlanmış (docker compose yorumları).
