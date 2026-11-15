# `backend-ts` Canlı Geçiş (Cutover) Runbook

Bu doküman, mevcut Python/FastAPI (`backend`, konteyner `macs-backend`, port `8000`) servisinin yanına TypeScript/Bun (`backend-ts`, konteyner `macs-backend-ts`, `127.0.0.1:8010`) servisini kurma, salt-okunur parite (`shadow-diff`) ile doğrulama, Plesk nginx üzerinden aşamalı geçiş yapma, izleme ve acil geri alma (rollback) adımlarını içerir.

> **Önemli:** Bu kılavuz **yerine göre uygulanır**; canlı sunucuya bağlanmadan önce her komut hedef dizin ve servis adlarıyla doğrulanmalıdır.

---

## 1. Ön Koşullar ve VPS Keşif Kontrol Listesi

Geçişten önce VPS üzerinde aşağıdakileri tespit edip yedekle (dizin/port tahmin etme):

1. **Repo çalışma dizini ve Compose**: `deploy-backend-ts.sh` varsayılan olarak `REPO_DIR=/opt/macs-website` bekler. Mevcut kurulum `/opt/macs` altında ise script env ile (`REPO_DIR=/opt/macs`) veya dizin hizalaması ile doğrulanmalıdır.
2. **Docker / Compose sürümleri**: `docker compose version` ve çalışan `macs-db`, `macs-backend`, `macs-frontend` konteynerlerinin ağ/volume yapısı.
3. **nginx ve Plesk durumu**:
   - `sudo nginx -v` ve `sudo nginx -V 2>&1` (`--with-http_v2_module`; `http2 on;` için nginx `>= 1.25.1` gerekir).
   - `sudo nginx -t` temiz geçmeli; `sudo nginx -T` ile etkin `api.macsclub.com.tr` vhost bloğu yedeklenmeli.
   - Plesk **Apache & nginx Settings** ekranındaki mevcut *Additional nginx directives*, HTTP/2, Proxy mode, Smart static files processing ayarları kaydedilmeli.
4. **Upload host dizini**:
   - Canlı `UPLOAD_HOST_DIR` yolu (ör. `/var/www/vhosts/api.macsclub.com.tr/httpdocs/static/uploads`) bulunmalı.
   - `backend-ts` imajı içindeki kullanıcı `appuser` (`uid 10001`, `gid 10001`) olduğundan host upload dizini `10001:10001` tarafından yazılabilir olmalı:
     ```bash
     sudo chown -R 10001:10001 /var/www/vhosts/api.macsclub.com.tr/httpdocs/static/uploads
     ```
5. **Sağlık uçları**: Mevcut Python servisi `http://127.0.0.1:8000/health` üzerinde sağlıklı yanıt vermeli.

---

## 2. Prod `.env` ve Veritabanı Rol Kontrolleri

`backend-ts` başlangıçta `src/config/env.ts` üzerinden ortam değişkenlerini sıkı biçimde doğrular:

- **`JWT_SECRET_KEY` en az 16 karakter olmalıdır** (`min(16)`). Daha kısa veya boş ise konteyner başlamaz. Mevcut Python `macs-backend` ile aynı anahtarı paylaşmalıdır (mevcut oturumların geçerli kalması için).
- **`DATABASE_URL` / `POSTGRES_*`**: `docker-compose.yml` konteyner içine `DATABASE_URL=postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres}@db:5432/${POSTGRES_DB:-macs_db}` geçirir.
- **`UPLOAD_HOST_DIR`**: Boş bırakılırsa `./backend/static/uploads` kullanılır ve `create_host_path: false` nedeniyle yol yoksa Compose hata verir. Prod `.env` içinde canlı vhost yolu tanımlı olmalıdır.
- **`MAX_UPLOAD_SIZE`**: Varsayılan `5242880` (5 MiB). `.env` içinde yükseltilmişse (`printenv MAX_UPLOAD_SIZE`), nginx tarafındaki `client_max_body_size` en az `MAX_UPLOAD_SIZE + 262144` bayt olmalıdır.
- **`DOCS_ENABLED`**: `NODE_ENV=production` altında varsayılan `false` (`/docs` ve `/openapi.json` kapalı). Açmak gerekirse açıkça `DOCS_ENABLED=true` verilir.
- **`RATELIMIT_ENABLED` / `RESPONSE_CACHE`**: Varsayılan `true`.
- **`RUN_MIGRATIONS`**: Varsayılan `1` (`true`).

### Veritabanı Rolleri (`macs_admin`, `root`, `postgres`) Notu

- Prod veya tarihi `pg_dump` yedekleri içinde tablo sahipliği veya `GRANT` ifadelerinde `macs_admin`, `root` (Railway varsayılan superuser adı) ve `postgres` rolleri bulunabilir ([docker/initdb/00-roles.sql](../docker/initdb/00-roles.sql)).
- Yeni/boş bir PostgreSQL hacmine dump geri yüklenecekse `00-roles.sql` bu üç rolü `NOLOGIN` olarak otomatik oluşturur. Mevcut başka bir DB örneğine elle `psql` / `pg_restore` uygulanacaksa, dump öncesi bu rollerin varlığını doğrula (yoksa `CREATE ROLE ... NOLOGIN;`). Uygulama yine `POSTGRES_USER` ile bağlanır.

### Bcrypt Dışı Eski Parola Hash'leri

- `backend-ts` yalnızca bcrypt hash'leri ile kimlik doğrulaması yapar; bcrypt dışı eski bir hash ile giriş denemesi güvenli biçimde `401` döner (hesap veya hash sızmaz). Böyle bir yönetici/kullanıcı hesabının parolasını yenilemek gerekirse CLI kullanılır:
  ```bash
  printf '%s\n' '<YENI_GUCLU_PAROLA>' | docker exec -i macs-backend-ts bun scripts/reset-password.ts --email kullanici@macsclub.com.tr
  ```

---

## 3. `backend-ts` Deploy (Port `127.0.0.1:8010`)

`backend-ts`, mevcut `backend` (`8000`) servisine dokunmadan paralel olarak ayağa kalkar ([`docker-compose.yml`](../docker-compose.yml), [`scripts/deploy-backend-ts.sh`](../scripts/deploy-backend-ts.sh)).

1. İlk kurulum ve güncellemelerde deploy script'i çalıştır (repo yolu farklıysa `REPO_DIR` ver):
   ```bash
   ( set -euo pipefail; cd "${REPO_DIR:-/opt/macs-website}" && git fetch origin main && git show origin/main:scripts/deploy-backend-ts.sh | bash -s )
   ```
   Script şu güvenlik adımlarını uygular:
   - `/tmp/macs-backend-ts-deploy.lock` üzerinde `flock` concurrency kilidi,
   - Çalışma ağacı temizlik kontrolü (`git status --porcelain`),
   - Mevcut `macs-backend-ts` image + compose config yedeği,
   - `docker compose -f docker-compose.yml -f docker-compose.prod.yml build backend-ts`,
   - `up -d --no-deps backend-ts` (konteyner açılışında [`docker-entrypoint.sh`](../backend-ts/docker-entrypoint.sh) `0000_baseline.sql` + additive `0001_perf_indexes.sql` migration'larını idempotent uygular; Python şemasını bozmaz),
   - `/health/ready` `healthy` olana kadar bekleme (başarısız olursa otomatik rollback: çıkış kodu `1`, rollback de başarısızsa çıkış kodu `2`).
2. Yerel loopback doğrulaması:
   ```bash
   curl -fsS http://127.0.0.1:8010/health
   curl -fsS http://127.0.0.1:8010/health/ready
   ```
   Beklenen: her ikisinde `{"status":"ok"}`. Port dış arayüzlere kapalı olmalıdır (`ss -tlnp | grep 8010` çıktısında yalnızca `127.0.0.1:8010`).

---

## 4. Salt-Okunur Parite Doğrulaması (`shadow-diff`)

Canlı trafiği çevirmeden önce Python (`8000`) ve `backend-ts` (`8010`) servislerini aynı canlı veritabanı üzerinde karşılaştır. `contract/shadow-diff.ts` yalnızca `GET` istekleri atar, yazma yapmaz:

```bash
cd "${REPO_DIR:-/opt/macs-website}/backend-ts"
OLD_URL=http://127.0.0.1:8000 NEW_URL=http://127.0.0.1:8010 \
  bun contract/shadow-diff.ts --max-ids 100000
```

- Konteyner içi çalıştırma gerekiyorsa (`bun` hostta yoksa), iki servis aynı Compose ağındadır:
  ```bash
  docker exec -e OLD_URL=http://backend:8000 -e NEW_URL=http://127.0.0.1:8000 \
    macs-backend-ts bun contract/shadow-diff.ts --max-ids 100000
  ```
- Beklenen: onaylanmamış `0` fark (onaylı eski ORM rol sızıntısı farkı `k` ve benzeri dar istisnalar `contract/deviations.ts` ile sınıflandırılır; beklenmedik fark çıkarsa geçişi durdurup log/çıktıyı incele).

---

## 5. nginx Geçişi: Önce Salt-GET Doğrulaması, Sonra Tam Geçiş

nginx kurulum dosyaları [`deploy/nginx/`](../deploy/nginx/README.md) içindedir:
- [`deploy/nginx/api.macsclub-http.conf`](../deploy/nginx/api.macsclub-http.conf): `macs_api_limit` (`50r/s`), `macs_upload_limit` (`200r/s`), `macs_login_limit` (`5r/m`), `macs_conn_limit`, `upstream macs_backend_ts` (`127.0.0.1:8010`, `keepalive 32`).
- [`deploy/nginx/api.macsclub-server.conf`](../deploy/nginx/api.macsclub-server.conf): `server_tokens off`, `location ^~ /auth/login` (`burst=10 nodelay`, `limit_conn 100`), `location ^~ /uploads/` (`macs_upload_limit` `burst=400 nodelay`, `limit_conn 100`, `1y immutable` cache), `location /` (`burst=100 nodelay`, `limit_conn 100`), `TRACE`/`CONNECT` `405` koruması.

Detaylı yedekleme ve Plesk adımları için [`deploy/nginx/README.md`](../deploy/nginx/README.md) kılavuzunu izle.

### Aşama 5a — Salt-GET Doğrulama (Trafik Çevirmeden / Bakım Penceresinde)

Tam kesim öncesi `127.0.0.1:8010` üzerinden tüm kritik `GET` ve `HEAD` yanıtlarını doğrula:

```bash
curl -fsS http://127.0.0.1:8010/projects?limit=20 | head -c 300; echo
curl -fsS http://127.0.0.1:8010/events?limit=20 | head -c 300; echo
curl -fsS http://127.0.0.1:8010/members/leaderboard | head -c 300; echo
# Mevcut gerçek bir upload dosyası için GET vs HEAD başlık eşitliği:
curl -fsSI http://127.0.0.1:8010/uploads/<MEVCUT-DOSYA>
```

Kısa bakım penceresinde salt-GET kanarya testi yapmak istersen Plesk direktifinde geçici olarak yalnızca `GET`/`HEAD` (`$request_method ~ ^(GET|HEAD)$`) veya test başlığıyla `macs_backend_ts` hedefine yönlendirip yazma (`POST`/`PUT`/`DELETE`) isteklerini eski `127.0.0.1:8000` upstream'inde tutarak yanıtları ve 2xx/3xx/4xx oranlarını doğrulayabilirsin; ardından tam geçişe geç.

### Aşama 5b — Tam Geçiş

1. Yedek al (bkz. `deploy/nginx/README.md` Bölüm 1).
2. `http` bağlamı dosyasını yükle ve test et:
   ```bash
   sudo install -m 0644 "${REPO_DIR:-/opt/macs-website}/deploy/nginx/api.macsclub-http.conf" /etc/nginx/conf.d/api.macsclub-http.conf
   sudo nginx -t
   ```
3. Plesk → `api.macsclub.com.tr` → **Apache & nginx Settings → Additional nginx directives** alanına `deploy/nginx/api.macsclub-server.conf` içeriğini uygula (mevcut çakışan `location /uploads/` alias ve `location /` proxy bloklarını kaldırarak).
4. Doğrula ve reload et:
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   sudo systemctl is-active nginx
   ```
5. Canlı smoke testleri:
   - `deploy/nginx/README.md` Bölüm 4 komutları (`/health` HTTP/2 200 + HSTS, `Server: nginx` sürüm bilgisi yok, `br` sıkıştırma, `TRACE` 405, `HEAD /uploads/...` 200 `immutable`).
   - Admin panelden oturum açma, proje düzenleme/kaydetme ve görsel yükleme doğrulaması.

---

## 6. İzleme (`429` ve `5xx` Takibi)

Geçişten hemen sonra hem uygulama hem nginx loglarını izle:

```bash
# Uygulama logları (Pino JSON: status, reqId, path, event:"security", errorName, code)
docker compose logs -f --tail=200 backend-ts

# 5xx ve 429 kontrolü
docker compose logs --since=15m backend-ts | grep -E '"status":5[0-9]{2}|"kind":"rate_limit"|"kind":"login_ip_limit"|"kind":"handler_timeout"'

# nginx error/access loglarında rate_limit / conn_limit ve 5xx kontrolü
sudo grep -E 'limiting (requests|connections)|HTTP/[0-9.]+" (429|5[0-9]{2})' /var/www/vhosts/system/api.macsclub.com.tr/logs/proxy_error_log /var/www/vhosts/system/api.macsclub.com.tr/logs/proxy_access_ssl_log | tail -n 50
```

- **Beklenen limit davranışları**: Kampüs NAT tek IP'sinden gelen sayfa yüklemelerinde `/uploads/`, `/static/` ve tam `/health` / `/health/ready` yolları uygulama global limitinden muaftır; nginx `/uploads/` için ayrı yüksek tavanlı `macs_upload_limit` (`200r/s`, burst `400`) ve `limit_conn 100` uygular. Beklenmedik `429` görülürse hangi `kind` / nginx zone tetiklendiğini logdan kontrol et.
- **5xx**: Sıfır beklenir; 5xx görülürse `reqId`, `errorName`, `code` ve sanitized `path` alanlarını incele.

---

## 7. Acil Geri Alma (Rollback)

Canlı sorun tespit edilirse **önce nginx'i eski backend (`8000`) üzerine döndür** (<1 dakika, kesintisiz):

1. **nginx geri alımı**: [`deploy/nginx/README.md`](../deploy/nginx/README.md) Bölüm 6'daki sırayı uygula:
   - Plesk **Additional nginx directives** metnini yedekteki eski haline (`proxy_pass http://127.0.0.1:8000` ve önceki ayarlar) döndür ve Kaydet/Uygula.
   - Gerekirse `/etc/nginx/conf.d/api.macsclub-http.conf` dosyasını kaldır veya yedeğini geri yükle.
   - `sudo nginx -t && sudo systemctl reload nginx`
2. **Durum kontrolü**:
   - `curl -fsS https://api.macsclub.com.tr/health`
   - Python servisi (`macs-backend`, `8000`) hiç durdurulmadığı için trafiği anında devralır.
   - `0001_perf_indexes.sql` yalnızca additive indeksler eklediği ve yeni e-posta doğrulaması eski `email-validator==2.2.0` kurallarıyla uyumlu olduğu için PostgreSQL verisi geri almada da sorunsuz çalışır.
3. Gerekirse `macs-backend-ts` inceleme için açık bırakılabilir veya durdurulabilir (`docker compose stop backend-ts`); `macs-db` ve `UPLOAD_HOST_DIR` verilerine dokunulmaz.

---

## 8. Python (`backend`) Servisinin Sonradan Kaldırılması

Eski Python servisi **geçişle aynı gün silinmez**. En az birkaç günlük/haftalık temiz üretim gözleminden sonra (sıfır `5xx`, normal `429` profili, başarılı içerik/üye/upload işlemleri) ayrı bir değişiklikle kaldırılır:

1. `docker-compose.yml` içindeki `frontend` servisinin `depends_on` hedefini `backend-ts`'ye (veya gereksinime göre) güncelle ve `backend` servis tanımını kaldır.
2. Sunucuda eski konteyneri durdurup kaldır (DB ve uploads korunur):
   ```bash
   docker compose stop backend && docker compose rm -f backend
   ```
3. Doğrulamadan sonra gerekirse kullanılmayan eski `macs-website-backend` image'ı temizlenir (`docker image prune` **kullanma**, yalnızca belirli eski image ID'sini sil).
