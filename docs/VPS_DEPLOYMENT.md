# MACS Website — VPS Deployment Rehberi (Plesk)

Bu döküman, MACS website'ını Plesk panelli bir VPS'e deploy etmek için adım adım rehber içerir.

**Hedef mimari:**

- `macsclub.com.tr` → Frontend (React static build, Nginx)
- `api.macsclub.com.tr` → Backend (FastAPI + Gunicorn, Nginx proxy)

---

## Ön Koşullar

- VPS'te Plesk Panel kurulu
- `macsclub.com.tr` ve `api.macsclub.com.tr` DNS kayıtları VPS IP'ye yönlendirilmiş
- Sunucuya SSH erişimi

---

## Adım 1 — PostgreSQL Kurulumu ve Veritabanı Migrasyonu

### 1a. PostgreSQL kur (yoksa)

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### 1b. Veritabanı ve kullanıcı oluştur

```bash
sudo -u postgres psql << 'EOF'
CREATE USER macs_user WITH PASSWORD 'GUCLU_SIFRE_BURAYA';
CREATE DATABASE macs_db OWNER macs_user;
GRANT ALL PRIVILEGES ON DATABASE macs_db TO macs_user;
EOF
```

### 1c. Railway'den veri dump'ı al (local bilgisayarda çalıştır)

```bash
pg_dump "postgresql://postgres:UkBvoeMZJNcREKHyXvVzhQKUBvUlXdDm@switchback.proxy.rlwy.net:23031/railway" \
  -Fc -f macs_railway_backup.dump
```

### 1d. Dump'ı VPS'e kopyala ve yükle

```bash
# Local'den VPS'e kopyala
scp macs_railway_backup.dump kullanici@VPS_IP:/tmp/

# VPS'te yükle
ssh kullanici@VPS_IP
pg_restore -U macs_user -d macs_db /tmp/macs_railway_backup.dump
```

> **Not:** Boş veritabanı ile başlamak istiyorsanız 1c ve 1d adımlarını atlayın. Alembic migration'lar tabloları oluşturacaktır.

---

## Adım 2 — Backend Deploy

### 2a. Uygulama dizini oluştur

```bash
# Plesk subdomain için
sudo mkdir -p /var/www/vhosts/api.macsclub.com.tr/httpdocs
sudo mkdir -p /var/www/vhosts/api.macsclub.com.tr/uploads
sudo chown -R www-data:www-data /var/www/vhosts/api.macsclub.com.tr/
sudo mkdir -p /var/log/macs
```

### 2b. Kodu kopyala

```bash
# Git ile çek (önerilen)
cd /var/www/vhosts/api.macsclub.com.tr/
sudo git clone https://github.com/dogualagoz/macs-website.git .

# Sadece backend klasörüne geç
cd httpdocs
cp -r /var/www/vhosts/api.macsclub.com.tr/backend/* .
```

veya SCP ile:

```bash
# Local'den doğrudan kopyala
scp -r ./backend/* kullanici@VPS_IP:/var/www/vhosts/api.macsclub.com.tr/httpdocs/
```

### 2c. Python sanal ortamı ve bağımlılıklar

```bash
cd /var/www/vhosts/api.macsclub.com.tr/httpdocs
sudo python3 -m venv /var/www/vhosts/api.macsclub.com.tr/venv
source /var/www/vhosts/api.macsclub.com.tr/venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

> **uvloop notu:** Eğer `uvloop` kurulumunda hata alırsanız `requirements.txt`'den `uvloop` satırını yorum yapın (uvicorn standart loop kullanır).

### 2d. Environment dosyası oluştur

```bash
cp .env.production.example .env
nano .env
```

`.env` içindeki değerleri doldurun:

- `DATABASE_URL` → Adım 1'de oluşturduğunuz bilgiler
- `JWT_SECRET_KEY` → `python3 -c "import secrets; print(secrets.token_hex(32))"`
- `ADMIN_SECRET_KEY` → `python3 -c "import secrets; print(secrets.token_hex(32))"`

### 2e. Alembic migration çalıştır

```bash
source /var/www/vhosts/api.macsclub.com.tr/venv/bin/activate
cd /var/www/vhosts/api.macsclub.com.tr/httpdocs
alembic upgrade head
```

### 2f. Systemd servisi oluştur

```bash
sudo nano /etc/systemd/system/macs-backend.service
```

İçeriği yapıştır:

```ini
[Unit]
Description=MACS FastAPI Backend (Gunicorn)
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/vhosts/api.macsclub.com.tr/httpdocs
EnvironmentFile=/var/www/vhosts/api.macsclub.com.tr/httpdocs/.env
ExecStart=/var/www/vhosts/api.macsclub.com.tr/venv/bin/gunicorn \
          -c gunicorn.conf.py main:app
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable macs-backend
sudo systemctl start macs-backend

# Durum kontrolü
sudo systemctl status macs-backend
```

Test: `curl http://127.0.0.1:8001/health` → `{"status":"ok"}` dönmeli.

---

## Adım 3 — Nginx Konfigürasyonu (Plesk üzerinden)

### 3a. `api.macsclub.com.tr` subdomaini oluştur

1. Plesk → **Websites & Domains** → `macsclub.com.tr` → **Add Subdomain**
2. Subdomain adı: `api`
3. Document root: `/var/www/vhosts/api.macsclub.com.tr/httpdocs`

### 3b. Backend için Nginx proxy ayarla

Plesk → `api.macsclub.com.tr` → **Apache & Nginx Settings** → **Additional Nginx directives** (HTTPS için):

```nginx
location / {
    proxy_pass         http://127.0.0.1:8001;
    proxy_http_version 1.1;
    proxy_set_header   Upgrade $http_upgrade;
    proxy_set_header   Connection "upgrade";
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_read_timeout 300;
    proxy_connect_timeout 300;
    client_max_body_size 50M;
}

location /uploads/ {
    alias /var/www/vhosts/api.macsclub.com.tr/uploads/;
    expires 30d;
    add_header Cache-Control "public";
}

location /static/ {
    alias /var/www/vhosts/api.macsclub.com.tr/httpdocs/static/;
    expires 1y;
}
```

### 3c. Frontend için Nginx ayarla

Plesk → `macsclub.com.tr` → **Apache & Nginx Settings** → **Additional Nginx directives** (HTTPS):

```nginx
location / {
    try_files $uri $uri/ /index.html;
}

location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|woff|ttf)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## Adım 4 — Frontend Build ve Deploy

### 4a. Local'de build al

```bash
cd /Users/dogualagoz/Desktop/macs-website/frontend
npm run build
```

> `frontend/.env` dosyasındaki `REACT_APP_API_URL=https://api.macsclub.com.tr` değeri build'e dahil edilecektir.

### 4b. Build'i VPS'e kopyala

```bash
rsync -avz --delete build/ kullanici@VPS_IP:/var/www/vhosts/macsclub.com.tr/httpdocs/
```

---

## Adım 5 — SSL Sertifikaları (Plesk Let's Encrypt)

1. Plesk → `macsclub.com.tr` → **SSL/TLS Certificates** → **Let's Encrypt**
   - `Include www` kutusunu işaretle → **Get it free**
2. Plesk → `api.macsclub.com.tr` → **SSL/TLS Certificates** → **Let's Encrypt** → **Get it free**

---

## Adım 6 — Uploads Migrasyonu (Railway'den)

Eğer mevcut yüklenen resimler/dosyalar taşınacaksa:

```bash
# Railway CLI ile dosyaları indirin veya uygulamayı zip yapın
# Ardından VPS'e kopyalayın:
rsync -avz ./uploads/ kullanici@VPS_IP:/var/www/vhosts/api.macsclub.com.tr/uploads/
sudo chown -R www-data:www-data /var/www/vhosts/api.macsclub.com.tr/uploads/
```

---

## Doğrulama

```bash
# 1. Backend sağlık kontrolü
curl https://api.macsclub.com.tr/health
# Beklenen: {"status": "ok"}

# 2. CORS kontrolü
curl -H "Origin: https://macsclub.com.tr" -X OPTIONS \
     https://api.macsclub.com.tr/health -v
# Beklenen yanıt header: Access-Control-Allow-Origin: https://macsclub.com.tr

# 3. API docs
# Tarayıcıda: https://api.macsclub.com.tr/docs
```

Tarayıcı testleri:

- `https://macsclub.com.tr` → Sayfa yüklenmeli
- `https://macsclub.com.tr/projects` → 404 olmamalı (Nginx try_files çalışmalı)
- Login → JWT token alınmalı
- Resim yükleme → `https://api.macsclub.com.tr/uploads/...` üzerinden servis edilmeli

---

## Sorun Giderme

### Backend başlamıyor

```bash
sudo journalctl -u macs-backend -n 50 --no-pager
cat /var/log/macs/error.log
```

### Nginx 502 Bad Gateway

```bash
# Gunicorn çalışıyor mu?
systemctl status macs-backend
curl http://127.0.0.1:8001/health
```

### Veritabanı bağlantı hatası

```bash
# .env dosyasındaki DATABASE_URL'i kontrol et
# PostgreSQL servisini kontrol et
systemctl status postgresql
```
