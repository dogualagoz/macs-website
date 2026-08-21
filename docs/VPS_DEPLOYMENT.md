# MACS Website — VPS Deployment (Docker + Plesk)

Backend, frontend ve PostgreSQL sunucuda **Docker Compose** ile ayaga kalkar.
Plesk'in nginx'i yalnizca SSL sonlandirip container'lara proxy yapar.

**Mimari:**

```
                    Plesk nginx (443, Let's Encrypt)
                              |
        +---------------------+---------------------+
        |                                           |
  macsclub.com.tr                          api.macsclub.com.tr
  proxy -> 127.0.0.1:8080                  proxy -> 127.0.0.1:8000
        |                                           |
  frontend container                         backend container
  (nginx + CRA build)                        (uvicorn, 4 worker)
                                                    |
                                              db container
                                              (postgres:13, named volume)

  /uploads/  -> nginx alias ile DOGRUDAN diskten servis edilir,
                container'a hic ugramaz (bkz. Adim 6a)
```

> Bu dokuman eski systemd + gunicorn + venv kurulumunun yerini alir.
> `backend/gunicorn.conf.py` o kurulumdan kaliyor; Docker akisinda **kullanilmiyor**
> (`127.0.0.1:8001`'e bind ediyor ve `/var/log/macs` altina yazmaya calisiyor,
> container icinde ikisi de gecersiz). Prod komutu `docker-compose.prod.yml` icinde.

---

## Ön koşullar

- Sunucuda Docker Engine + Compose plugin (`docker compose version` calismali)
- `macsclub.com.tr` ve `api.macsclub.com.tr` DNS kayitlari VPS IP'ye bakiyor
- Plesk'te her iki (alt)domain tanimli
- SSH erisimi

---

## Adım 1 — Kodu sunucuya al

```bash
sudo mkdir -p /opt/macs && sudo chown "$USER" /opt/macs
cd /opt/macs
git clone https://github.com/dogualagoz/macs-website.git .
```

> Uygulama kodu `/opt/macs` altinda durur, Plesk'in `httpdocs` klasorlerinde
> **degil**. httpdocs yalnizca uploads dosyalarini tutar (Adim 3).

---

## Adım 2 — `.env` oluştur

```bash
cd /opt/macs
cp .env.production.example .env
nano .env
```

Doldurulmasi zorunlu alanlar:

| Degisken | Deger |
|---|---|
| `BIND_HOST` | `127.0.0.1` — portlar internete acilmasin |
| `POSTGRES_PASSWORD` | guclu bir sifre |
| `JWT_SECRET_KEY` | `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `ADMIN_SECRET_KEY` | ayni sekilde uretilen ikinci bir deger |
| `REACT_APP_API_URL` | `https://api.macsclub.com.tr` — sonunda `/` yok, `/api` soneki yok |
| `UPLOAD_HOST_DIR` | `/var/www/vhosts/api.macsclub.com.tr/httpdocs/static/uploads` |

> **`REACT_APP_API_URL` build-time'dir.** CRA bu degeri bundle'in icine gomer.
> Sonradan degistirirsen `docker compose ... up -d` YETMEZ, `--build frontend` sart.

---

## Adım 3 — Uploads klasörünü hazırla

```bash
sudo mkdir -p /var/www/vhosts/api.macsclub.com.tr/httpdocs/static/uploads
# Backend container'i uid 10001 (appuser) ile calisiyor; panelden yukleme
# yapabilmesi icin klasorun sahibi o olmali.
sudo chown -R 10001:10001 /var/www/vhosts/api.macsclub.com.tr/httpdocs/static/uploads
```

> Klasor **yoksa compose hata verir** (`create_host_path: false`). Bu bilincli:
> kisa sozdizimi kullanilsaydi Docker orada bos bir klasor acar, DB'deki tum
> gorsel referanslari sessizce 404 olurdu.

---

## Adım 4 — Veritabanı tohumu (ilk kurulumda)

`db` servisi, veri volume'u **bosken** `macs_db.sql` dosyasini bir kez yukler.
Sonraki `up`larda calismaz, mevcut veri korunur.

Lokaldeki veriyi tasimak icin (local makinede):

```bash
docker exec macs-db pg_dump -U postgres macs_db > macs_db.sql
scp macs_db.sql kullanici@VPS_IP:/opt/macs/macs_db.sql
```

Sifirdan bos DB istiyorsan bos bir dosya birak — alembic tablolari olusturur:

```bash
touch /opt/macs/macs_db.sql
```

> `macs_db.sql` gitignore'da (gercek e-posta + bcrypt hash iceriyor), repoyla gelmez.
> Dosya yoksa compose ayaga kalkmaz.

---

## Adım 5 — Build ve başlat

```bash
cd /opt/macs
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose ps
```

Container acilisinda backend once DB'yi bekler, sonra `alembic upgrade head`
calistirir (`RUN_MIGRATIONS=0` ile kapatilabilir), sonra uvicorn'u baslatir.

Sunucu icinden hizli kontrol:

```bash
curl -s http://127.0.0.1:8000/health       # {"status":"ok"}
curl -sI http://127.0.0.1:8080/ | head -1  # HTTP/1.1 200 OK
```

---

## Adım 6 — Plesk nginx

### 6a. `api.macsclub.com.tr`

Plesk → **Apache & Nginx Settings** → *Additional nginx directives* (HTTPS):

```nginx
# Gorseller container'a hic ugramadan diskten servis edilir.
# Bu alias UPLOAD_HOST_DIR ile AYNI yolu gostermek zorunda.
location /uploads/ {
    alias /var/www/vhosts/api.macsclub.com.tr/httpdocs/static/uploads/;
    expires 30d;
    add_header Cache-Control "public";
    access_log off;
}

location / {
    proxy_pass         http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_read_timeout 300;
    proxy_connect_timeout 300;
    # MAX_UPLOAD_SIZE 5 MB; nginx limiti bunun uzerinde olmali yoksa buyuk
    # dosyalarda uygulamanin kendi hata mesaji yerine nginx 413 doner.
    client_max_body_size 10M;
}
```

### 6b. `macsclub.com.tr`

```nginx
location / {
    proxy_pass         http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
}
```

> react-router yonlendirmesi, cache basliklari ve gzip **frontend container'inin
> kendi nginx'inde** (`frontend/nginx.conf`) tanimli. Plesk tarafinda `try_files`
> tekrar yazilmamali.

---

## Adım 7 — SSL

Plesk → ilgili domain → **SSL/TLS Certificates** → **Let's Encrypt**
(`macsclub.com.tr` icin *Include www* isaretli) → **Get it free**.

---

## Adım 8 — Görselleri sunucuya taşı

DB dump'i dosyalari **tasimaz**. `image_url` / `profile_image` alanlari sadece
`/uploads/<uuid>.jpg` gibi yollar tutuyor; dosya sunucuda yoksa her gorsel 404 olur.

Local makineden:

```bash
./scripts/sync-uploads.sh kullanici@VPS_IP
```

Script once dry-run gosterir, onay ister, sonra rsync'ler ve sahipligi
`10001:10001` yapar. `--delete` kullanmaz — sunucuda panelden yuklenmis,
lokalde olmayan dosyalar silinmez.

---

## Doğrulama

```bash
curl -s https://api.macsclub.com.tr/health
# {"status":"ok"}

curl -sI https://api.macsclub.com.tr/uploads/<bir-dosya-adi> | head -1
# HTTP/2 200

curl -s -o /dev/null -w '%{http_code}\n' -H "Origin: https://macsclub.com.tr" \
     https://api.macsclub.com.tr/events
# 200
```

Tarayicida:

- `https://macsclub.com.tr` → acilmali
- `https://macsclub.com.tr/projects` → yenilendiginde 404 olmamali
- Etkinlik / proje / sponsor kartlarinda gorseller gelmeli (kirik gorsel = Adim 8 eksik)
- Uye avatarlari gelmeli — bas harf avatari gorunuyorsa o uyenin DB'de
  `profile_image` alani bos demektir, dosya sorunu degil
- Admin panelden gorsel yukle → `https://api.macsclub.com.tr/uploads/...` ile servis edilmeli

---

## Güncelleme (redeploy)

```bash
cd /opt/macs
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Yalnizca `REACT_APP_API_URL` / `REACT_APP_MAPBOX_TOKEN` degistiyse:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build frontend
```

Veri kaybi olmaz: DB named volume'de, uploads host klasorunde durur.

---

## Yedekleme

```bash
# Veritabani
docker exec macs-db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  > ~/backups/macs_$(date +%F).sql

# Gorseller
tar -czf ~/backups/uploads_$(date +%F).tar.gz \
  -C /var/www/vhosts/api.macsclub.com.tr/httpdocs/static uploads
```

> `docker compose down -v` **tum DB verisini siler** (volume dahil). Servisleri
> durdurmak icin `-v` OLMADAN `down` ya da `stop` kullan.

---

## Sorun giderme

**Container acilmiyor**

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend
docker compose ps
```

**Frontend aciliyor ama API cagrilari basarisiz** — bundle'a yanlis adres gomulmus:

```bash
docker exec macs-frontend grep -rho 'https://api[^"]*' /usr/share/nginx/html/static/js | head -1
```

Cikti beklenenden farkliysa `.env`'i duzelt ve `--build frontend` ile yeniden kur.

**Gorseller 404**

```bash
# Dosya diskte var mi?
ls /var/www/vhosts/api.macsclub.com.tr/httpdocs/static/uploads | wc -l
# nginx alias'i UPLOAD_HOST_DIR ile ayni mi? (Adim 6a)
# Degilse Adim 8'i calistir.
```

**Panelden yukleme "permission denied"**

```bash
sudo chown -R 10001:10001 /var/www/vhosts/api.macsclub.com.tr/httpdocs/static/uploads
```

**Portlar disariya acik mi** (hepsi 127.0.0.1 olmali)

```bash
ss -tlnp | grep -E '8000|8080|5434'
```
