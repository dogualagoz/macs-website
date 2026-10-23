# Projeler sayfası: GlassFold arka planı

## Yerleşim

`frontend/src/components/ui/glass-fold.tsx` GradFlow shader'ını içerir.
Projeler sayfasında tek bir `fixed inset-0` katmanında çalışır. Canvas'ın
boyutları ekranın CSS boyutları ve en fazla 2 cihaz piksel oranından hesaplanır.
Sayfanın içerik yüksekliği canvas çözünürlüğünü etkilemez. Böylece desen
dikeyde gerilmez, tekrarlanmaz ve bölümler arasında yeniden başlamaz.
İçerik sabit arka planın üzerinden kayar. Katman projeler rotasından çıkınca
kaldırılır; sitenin diğer sayfalarına arka plan eklenmez.

Bileşenin varsayılan renkleri verilen örnekteki mavi/lacivert/açık mavidir.
Projeler sayfası geçici Halloween paletini prop olarak geçirir:
`color1="#783517"`, `color2="#140b22"`, `color3="#ff9a3d"`.
WebGL veya shader derlemesi çalışmazsa sayfanın `#140b22` zemini görünür. Dekoratif canvas
ekran okuyucularından gizlenir ve tıklamaları engellemez. Hareket azaltma
tercihinde ve `speed={0}` için tek kare çizilir; sekme gizlenince döngü durur.

## Bileşen ve stil yolları

Mevcut ortak bileşenler `frontend/src/shared/components/ui`, stiller
`frontend/src/styles`, Tailwind giriş dosyası `src/styles/tailwind.css`
altındadır. Mevcut bileşenler taşınmamıştır.

Yeni `src/components/ui` dizini, dışarıdan alınan shadcn tarzı bileşenler
için standart konum sağlar; bu bir React gereksinimi değildir. CRA'nın
desteklediği `baseUrl: "src"` sayesinde `components/ui/glass-fold` şeklinde
import edilir. Örnekteki `@/` alias'ı bu projede tanımlı değildir.

## TypeScript ve Tailwind

Proje React 18 + CRA 5/CRACO + Tailwind 3 kullanır. Tailwind halihazırda
kuruludur ve `.tsx` dosyalarını tarar; tekrar kurulması gerekmez.
Eklenen `tsconfig.json`, yeni TypeScript dosyalarını strict modda kontrol eder.
Mevcut JavaScript dosyaları `allowJs: true`, `checkJs: false` ile korunur;
bu değişiklik bütün projeyi TypeScript'e dönüştürmez.

Temiz kurulum ve doğrulama:

```bash
cd frontend
npm ci
npx tsc --noEmit
npm test -- --watchAll=false
npm run build
```

TypeScript'i aynı CRA projesine elle eklemek gerekirse:

```bash
npm install --save-dev typescript@4.9.5 @types/react@18 @types/react-dom@18
```

TypeScript 4 kullanımı CRA 5'in peer dependency aralığına uygundur.

## shadcn CLI

Bu bileşen shadcn paketlerine ihtiyaç duymaz. Projede `components.json`,
shadcn tema değişkenleri veya `@/` alias'ı bulunmadığından tam shadcn
kurulumu yapılmış sayılmaz. Mevcut CRA projesinin yapılandırmasını
CLI ile otomatik olarak değiştirmek bu arka plan entegrasyonuna dahil değildir.

shadcn kullanımı için desteklenen bir Vite/React/TypeScript uygulamasında
Tailwind'i ve `@/* -> src/*` alias'ını hem TypeScript hem bundler tarafında
kurduktan sonra uygulama dizininde şu komutla başlatılabilir:

```bash
npx shadcn@latest init
```

Bileşen hedefini `src/components/ui`, stil hedefini uygulamanın Tailwind
giriş CSS'i olarak seçin. Mevcut projeye uygulanacak bir CLI kurulumu ayrıca
CRA/CRACO uyumluluğu ve mevcut CSS ile tema çakışmaları bakımından ele alınmalıdır.

## Canlı sinyal (`live`)

`GlassFold` isteğe bağlı `live` prop'u alır: `{ energy: number; color3?: string }`
taşıyan bir ref. Shader bunu her karede okur, React'i yeniden render ettirmez.
`energy` hızı `speed * (1 + energy)` olarak çarpar, `color3` kenar ışığının
hedef rengidir. Renkler ve enerji kareler arasında yumuşakça yaklaşır; hareket
azaltma tercihinde değerler anında uygulanır. Projeler sayfasında vitrin,
kart kayarken `energy`'yi, aktif projeye göre de `color3`'ü yazar.
