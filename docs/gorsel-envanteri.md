# Görsel Envanteri

Tüm site görselleri `frontend/public/assets/images/` altında konu bazlı klasörlerde durur.
Kodda mutlak yol ile kullanılır: `/assets/images/<klasör>/<dosya>`.

## Klasör düzeni

| Klasör | İçerik |
|---|---|
| `brand/` | MACS kurumsal görselleri (hero afişi, kayıt QR'ı) |
| `events/` | Etkinlik afiş ve bannerları |
| `projects/` | Proje ekran görüntüleri, kapak görselleri, uygulama ikonları |
| `sponsors/` | Sponsor / indirim anlaşmalı işletme logoları ve vitrin fotoğrafları |
| `profiles/` | Statik üye profil fotoğrafları (`<isim>pp.<ext>`) |
| `gallery/` | Topluluk / etkinlik fotoğrafları |
| `heroimages/` | Ana sayfa hero görselleri (mevcut, değişmedi) |

## Kurallar

- Uzun kenar en fazla **1920 px**.
- Şeffaflık gerekmiyorsa **JPEG** (kalite 85, progressive); logo/ikon şeffaf ise **PNG**.
- Dosya adı **kebab-case** ve açıklayıcı: `devbreak-kaan-can-yilmaz.jpg`, `pomodoro-knight-cover.jpg`.
- Aynı görselin ikinci kopyası eklenmez; farklı en-boy oranı varsa `-wide`, `-alt` soneki kullanılır.

## Etkinlikler (`events/`)

| Dosya | Etkinlik |
|---|---|
| `showcase-of-talent-2026.jpg` | Showcase of Talent, 14.05.2026 — 1618x692 banner |
| `showcase-of-talent-2026-wide.jpg` | Aynı afişin geniş (ultra-wide) versiyonu |
| `showcase-of-talent-2026-alt.jpg` | Aynı afişin alternatif kurgusu |
| `log26-summit-banner.jpg` | LOGIC OF GROWTH '26 Software & Tech Summit, 23.10 |
| `log26-summit-speakers.jpg` | LOG'26 konuşmacı kartlı banner |
| `log26-summit-poster.jpg` | LOG'26 kare afiş |
| `code-and-drink.jpg` | Code & Drink (ESOGU MACS x SET Eskişehir) |
| `devbreak-kaan-can-yilmaz.jpg` | DevBreak — Kaan Can Yılmaz, 28 Mart |
| `devbreak-dogancan-mavideniz.jpg` | DevBreak — Doğancan Mavideniz, 6 Aralık |
| `github-workshop-oneshot.jpg` | OneShot: GitHub Nedir & Nasıl Kullanılır, 18 Nisan |
| `quiz-night.jpg` | Yerli Dizi & Film Quiz Night |
| `macs-secime-gidiyor.jpg` | MACS Seçime Gidiyor, 27 Şubat |
| `game-test-event-banner.jpg` | Game Test Event (ESOGU MACS x Unico Studio) |
| `game-test-event-strip.jpg` | Aynı etkinliğin ince şerit bannerı |

## Projeler (`projects/`)

Showcase of Talent afişindeki projeler: Macrolens, Wollar, Cigerito, Vetimol (mobil);
UniHive, Clinitopya (web); Cursed Cargo, Vantaforge Studios, Pomodoro Knight (oyun).

| Dosya | Proje |
|---|---|
| `wollar-logo.jpg` | Wollar — bütçe/abonelik yönetimi |
| `cigerito-app.jpg` | Cigerito — sigara bırakma asistanı (hasar raporu ekranı) |
| `unihive-web.jpg` | UniHive — öğrenci soru-cevap platformu |
| `cursed-cargo-gameplay.jpg` | Cursed Cargo — 4 kişilik party oyunu |
| `pomodoro-knight-cover.jpg` | Pomodoro Knight — oyunlaştırılmış verimlilik |
| `sentinel-ai-terminal.jpg` | Sentinel AI — Linux terminal agent |
| `codabrate-web.jpg` | CodaBrate — proje partneri eşleştirme |
| `endless-zombie-cover.jpg` | Endless Zombie — 2D hayatta kalma oyunu |
| `macs-menu-otopilotu.jpg` / `-wide.jpg` | MACS Menü Otopilotu — Instagram menü botu |
| `secret-notes-app.png` / `secret-notes-code.jpg` | Secret Notes — şifreli not uygulaması |
| `ppm-viewer.jpg` | PPM Viewer — C++ görüntü görüntüleyici |
| `calculator-app.png` | Masaüstü hesap makinesi |
| `cv-analysis-ai.jpg` | AI destekli CV analizi |
| `proshot-web.jpg` | ProShot — ürün fotoğrafı üretimi |
| `emlakdefter-portfoy.jpg` | Emlakdefter — portföy yönetim paneli |
| `admin-dashboard.jpg` | Admin panel / tablo ekranı |
| `oto-yedek-parca-ecommerce.jpg` | Opel & Chevrolet yedek parça e-ticaret sitesi |
| `flutter-todo-app.jpg` | Flutter Todo App |
| `chat-app-mobile.png` | Mobil sohbet uygulaması ekranları |
| `fantasy-castle-game.jpg` | 2D fantastik oyun sahnesi |
| `adobe-automations.jpg` | Adobe otomasyon scriptleri |
| `guitar-pick-app-icon.jpg` | **Plectro** — gitar pratiği takip uygulaması |
| `metronome-app-icon.jpg` | **TapKit** |
| `leaf-app-icon.png` | **Niva: Habits & Calm** |
| `orange-arc-logo.jpg` | **SwipeCure** |
| `browser-loader-app-icon.png` | **Laundry** — yurt çamaşırhane |
| `fantasy-castle-game.jpg` | **Flappy Dragon** (yukarıdaki satırın doğrusu) |

## Sponsorlar (`sponsors/`)

Luminous Coffee, TEOL Dil Kursları, Begonvil Makarna, Deniz Fotokopi & Kırtasiye,
Asya Börek & Cafe, Etevim Steak House, Pablo Artisan, Makarnax, Ankara Makarnacısı,
Waffle Serdivan Cake, Mandarins, Petty Coffee House, CVPS Kampüs, Aura Cafe & Patisserie,
Orlando Language Academy, Voltify, Pasta Fresca Cheese, Bol Kepçe, Fakülte Osmangazi,
Yves Rocher, Burger King, Komagene, March Coffee & Meal, La Casa Da Pizza, Social Casual,
`corbaci-logo.png` = **Es Pilav**, `cvps-kampus.jpg` = **Cups Bağlar** (isimler DB'den doğrulandı).
`bistro-gece.jpg` hâlâ eşleşmedi.

`src/features/sponsors/data/mockSponsors.js` içindeki kayıtlar hâlâ "sponsor 1..8"
şeklinde yer tutucu — ama bu dosya yalnızca backend erişilemezken devreye giren
fallback. Gerçek sponsorlar DB'de ve görselleri `/uploads/` altından gelir.

## ÖNEMLİ: bu klasör ile `/uploads` farkı

Bu klasör **statik site görselleri** içindir (logo, ikon, hero, arşiv).
Etkinlik / proje / sponsor / üye görselleri **buradan gelmez** — admin panelden
yüklenir, `backend/static/uploads/` altında durur ve DB'deki `image_url` /
`profile_image` alanı `/uploads/<uuid>.<ext>` yolunu tutar. Yeni bir etkinlik
görseli eklemek için dosyayı buraya koymak işe yaramaz; panelden yüklenmeli.
Detay: `docs/VPS_DEPLOYMENT.md` Adım 3 ve Adım 8.
