# Docker ile Çalıştırma

Frontend (React/nginx) + Backend (FastAPI) + PostgreSQL 13, `docker-compose.yml`
üzerinden ayağa kalkar. Üçü **ayrı container**; frontend ve backend farklı
origin'lerden servis edilir (`macsclub.com.tr` / `api.macsclub.com.tr`),
aralarındaki iletişim CORS ile açılır.

## Kurulum

```bash
cp .env.example .env      # değerleri doldur (JWT_SECRET_KEY, ADMIN_SECRET_KEY zorunlu)
docker compose up -d --build
```

- Site: http://localhost:8080
- API: http://localhost:8000 — Swagger: http://localhost:8000/docs
- DB: `psql -h localhost -p 5434 -U postgres macs_db`

`macs_db.sql` **gitignore'da** (gerçek e-posta adresleri + bcrypt hash içeriyor).
Repoyu yeni klonlayan kişiye ayrı kanaldan iletilmeli; dosya yoksa
`docker compose up` "bind source path does not exist" ile durur — sessizce boş
DB ile açılmaz.

`.env` hem compose değişken ikamesi (`POSTGRES_*`, portlar) hem de backend
container'ının env dosyası olarak kullanılır. `backend/.env` container'a
kopyalanmaz (`.dockerignore`), Plesk/lokal venv kurulumu için orada kalır.

## Frontend container

Multi-stage build: `node:20-alpine` ile `npm ci && npm run build`, çıktı
`nginx:1.27-alpine` içine kopyalanır. Son image'da node yok, sadece statik
dosyalar + nginx.

### CRA değişkenleri build-time'dır

`REACT_APP_*` değerleri derleme sırasında bundle'ın içine **gömülür**;
container'ı yeni bir env ile yeniden başlatmak hiçbir şeyi değiştirmez. Bu
yüzden compose'da `environment` değil `build.args` olarak geçiliyor.

```bash
# .env içinde REACT_APP_API_URL değişti -> --build ZORUNLU
docker compose up -d --build frontend
```

Prod değeri sonunda `/` **olmadan** yazılmalı:

```
REACT_APP_API_URL=https://api.macsclub.com.tr
```

Sondaki `/` görsel adreslerini bozar: `useProjectForm.js`, `Members.jsx` gibi
yerlerde bu değer backend'den gelen relative yol (`/uploads/x.jpg`) ile
birleştiriliyor, `//uploads/x.jpg` çıkar.

### nginx kuralları

| Yol | Davranış |
|---|---|
| `/` ve bilinmeyen yollar | `try_files ... /index.html` — react-router'ın client-side routing'i. Bu satır olmadan `/admin/members` adresinde F5 = 404 |
| `/index.html` | `no-cache` — hash'li bundle adları her deploy'da değişir, cache'lenirse kullanıcı eski JS'te kalır |
| `/static/` | 1 yıl `immutable` — CRA çıktıları içerik hash'i taşır |
| `/assets/` | 7 gün — `public/assets` altındakiler hash'siz |
| `/healthz` | container healthcheck'i |

Güvenlik başlıkları `security-headers.conf`'ta. nginx'te `add_header`
**kalıtımsal değildir**: `add_header` tanımlayan her location üst bloktakilerin
hepsini iptal eder, bu yüzden dosya her birine ayrıca `include` edilir.

## CORS

Frontend ve backend ayrı origin'de olduğu için her API çağrısı cross-origin.
İzinli liste `backend/main.py` içinde `DEFAULT_ORIGINS`:
`localhost:3000`, `localhost:5173`, `localhost:8080`, `macsclub.com.tr`, `www.macsclub.com.tr`.

Başka bir origin gerekirse `.env` içindeki `CORS_ORIGINS`'e virgülle ayırarak
ekle (`docker compose up -d backend` yeterli, rebuild gerekmez).

Auth cookie değil `Authorization: Bearer` header'ı ile taşınıyor
(`apiClient.js`), token `localStorage`'da. Bu yüzden ayrı origin'lerde
`SameSite` / cookie domain sorunu çıkmaz.

## Veri kalıcılığı

| Kaynak | İçerik |
|---|---|
| `macs_pgdata` (named volume) | PostgreSQL data dizini |
| `$UPLOAD_HOST_DIR` (bind mount) | `/app/static/uploads` — yüklenen görseller |

Görseller bilerek named volume'de **değil**. Named volume boş doğar ve içeriği
dışarıdan görünmez; mevcut dosyaların elle kopyalanması gerekir. Prod'a geçerken
bu adım atlanırsa DB'deki tüm görsel referansları birden 404 olur — hata da
vermez, sadece resimler kaybolur.

Bind mount ile kaynak tek bir yol:

```
lokal : UPLOAD_HOST_DIR=./backend/static/uploads          (varsayılan)
prod  : UPLOAD_HOST_DIR=/var/www/vhosts/api.macsclub.com.tr/httpdocs/static/uploads
```

Prod'da dosyalar zaten o klasörde duruyor, migration adımı yok. Klasör
container içindeki `appuser` (uid 10001) tarafından **yazılabilir olmalı**:

```bash
chown -R 10001:10001 /var/www/vhosts/api.macsclub.com.tr/httpdocs/static/uploads
```

Bu adım Linux'ta zorunlu. macOS'ta Docker Desktop bind mount sahipliğini
kendisi eşlediği için sorun görünmez — yani lokalde çalışması prod'da
çalışacağının garantisi değildir.

`create_host_path: false` ayarlı: yol yoksa compose hata verir. Kısa sözdizimi
kullanılsaydı Docker orada boş bir klasör açar, görseller sessizce kaybolurdu.

### Lokalde görseller eksik

DB dump'ı 91 dosyaya atıf yapıyor, git'te 28 dosya izleniyor, ikisinin kesişimi
6. Kalan 85 dosya yalnızca VPS'te. Lokalde tam görüntü için:

```bash
rsync -avz root@<VPS>:/var/www/vhosts/api.macsclub.com.tr/httpdocs/static/uploads/ \
  backend/static/uploads/
```

Bind mount olduğu için kopyalama sonrası container'ı yeniden başlatmaya gerek yok.

Kurallar:

1. `macs_db.sql` (pg_dump çıktısı) `/docker-entrypoint-initdb.d/` altına mount
   edilir. Postgres image'i bu klasörü **yalnızca data dizini boşken** çalıştırır.
   Yani dump bir kez yüklenir; `docker compose down` / `up` / `restart` sonrası
   tekrar çalışmaz, mevcut veriyi ezmez.
2. Dump'ın sonundaki `setval()` çağrıları sequence'ları son id'ye ayarlar
   (`events` 32, `sponsors` 30, `users` 7 ...). Yeni kayıtlar bu verinin
   üstüne, sıradaki id'den devam eder.
3. `docker/initdb/00-roles.sql` dump'tan **önce** çalışır ve `macs_admin` ile
   `root` rollerini oluşturur. Dump bu rollere `GRANT` verdiği için rol yoksa
   yükleme "role does not exist" ile yarıda kalır.
4. Container açılışında `docker-entrypoint.sh` DB'yi bekler, sonra
   `alembic upgrade head` çalıştırır. Dump `345ed2086eb2` sürümünde;
   `b1f4c7a92e10` (user role/status backfill) container ilk açılışta uygulanır.
   Kapatmak için `.env` içinde `RUN_MIGRATIONS=0`.

**`docker compose down -v` tüm veriyi siler** ve bir sonraki `up` dump'ı
sıfırdan yükler. Volume'ları korumak için `-v` olmadan `down` kullan.

## Dump'ı güncelleme

Prod'dan yeni yedek al ve `macs_db.sql`'i değiştir. Değişiklik sadece **boş**
data dizininde etkili olur:

```bash
pg_dump "$PROD_DATABASE_URL" > macs_db.sql
docker compose down -v      # DİKKAT: lokal veriyi siler
docker compose up -d
```

Mevcut lokal DB'yi silmeden yeniden yüklemek için:

```bash
docker compose exec -T db psql -U postgres -d macs_db < macs_db.sql
```

## Lokal veriyi yedekleme

```bash
docker compose exec -T db pg_dump -U postgres macs_db > yedek.sql
tar czf uploads-yedek.tar.gz -C backend/static/uploads .
```

## Sık kullanılan komutlar

```bash
docker compose logs -f backend     # log takibi
docker compose exec backend sh     # container içi shell
docker compose exec backend alembic upgrade head
docker compose up -d --build backend    # backend kod değişikliği sonrası
docker compose up -d --build frontend   # frontend kod / REACT_APP_* değişikliği sonrası
docker compose logs -f frontend
```

## Reverse proxy (VPS)

Container'lar sadece localhost portlarını açar; TLS ve domain eşlemesi Plesk
tarafında. Her iki vhost için nginx yönlendirmesi:

| Domain | Hedef |
|---|---|
| `macsclub.com.tr` | `http://127.0.0.1:8080` (frontend) |
| `api.macsclub.com.tr` | `http://127.0.0.1:8000` (backend) |

Backend vhost'unda `X-Forwarded-For` iletilmeli; slowapi rate limit'i client
IP'sine göre sayıyor, iletilmezse tüm istekler proxy'nin tek IP'sinden geliyor
görünür ve limit herkesi birden kilitler.
