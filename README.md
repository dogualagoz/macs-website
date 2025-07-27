# MACS Website

MACS (Matematik ve Bilgisayar Bilimleri) Topluluğu web sitesi projesi.

## 📋 Proje Yapısı

```
macs-website/
├── backend/          # FastAPI backend
├── frontend/         # React frontend
└── docs/            # Proje dokümantasyonu
```

## 🚀 Hızlı Başlangıç

### Gereksinimler

- **Python 3.11+** (Backend için)
- **Node.js 18+** (Frontend için)
- **Git**

### 1. Projeyi İndir

```bash
git clone https://github.com/dogualagoz/macs-website
cd macs-website
```

### 2. Backend Kurulumu

```bash
cd backend

# Virtual environment oluştur
python -m venv venv

# Virtual environment'ı aktifleştir
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Bağımlılıkları yükle
pip install -r requirements.txt

# Environment değişkenlerini ayarla
# .env dosyası oluştur ve aşağıdaki değişkenleri ekle:
```

#### Backend .env Dosyası

#### Backend'i Çalıştır

```bash
# Development modunda çalıştır
python -m uvicorn main:app --reload

# Backend http://localhost:8000 adresinde çalışacak
# API dokümantasyonu: http://localhost:8000/docs
```

### 3. Frontend Kurulumu

```bash
cd frontend

# Bağımlılıkları yükle
npm install

# Environment değişkenlerini ayarla
# .env dosyası oluştur:
```

#### Frontend .env Dosyası

```env
REACT_APP_API_URL=http://localhost:8000
```

**⚠️ ÖNEMLİ:** URL'nin sonunda `/` olmamalı!

#### Frontend'i Çalıştır

```bash
npm start

# Frontend http://localhost:3000 adresinde çalışacak
```

## 🔧 Geliştirme

### Backend Geliştirme

- **API Endpoints:** `backend/routers/`
- **Veritabanı Modelleri:** `backend/models/`
- **Pydantic Şemaları:** `backend/schemas/`
- **Ana Uygulama:** `backend/main.py`

### Frontend Geliştirme

- **Ana Bileşenler:** `frontend/src/components/`
- **Sayfalar:** `frontend/src/pages/`
- **Stiller:** `frontend/src/styles/`
- **API Servisleri:** `frontend/src/services/`

## 🗄️ Veritabanı

### Migration Çalıştırma

```bash
cd backend

# Yeni migration oluştur
alembic revision --autogenerate -m "migration_description"

# Migration'ları uygula
alembic upgrade head
```

## 🚀 Deployment

### Backend (Railway)
- Railway'de otomatik deploy
- Environment variables Railway dashboard'dan ayarlanır

### Frontend (Vercel)
- Vercel'de otomatik deploy
- Production API URL'i environment variable olarak ayarlanır

## 📚 API Dokümantasyonu

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **API Contract:** `docs/api-contract.md`

## 🐛 Sorun Giderme

### Backend Sorunları

#### Virtual Environment Aktifleştirme Hatası (Windows)
```bash
# PowerShell'de execution policy'yi değiştir
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Uvicorn Komutu Bulunamadı
```bash
# Python ile çalıştır
python -m uvicorn main:app --reload
```

#### Veritabanı Bağlantı Hatası
- `.env` dosyasındaki `DATABASE_URL`'i kontrol et
- Railway'de PostgreSQL servisinin çalıştığından emin ol

### Frontend Sorunları

#### npm Komutu Bulunamadı
- Node.js'i yükle: https://nodejs.org/

#### API Verisi Gelmiyor
- Backend'in çalıştığından emin ol
- `.env` dosyasındaki `REACT_APP_API_URL`'i kontrol et
- Browser console'da hata mesajlarını kontrol et

#### CORS Hatası
- Backend'de CORS ayarlarını kontrol et
- Frontend URL'inin backend CORS listesinde olduğundan emin ol

## 🔐 Güvenlik

- JWT token'ları 120 dakika geçerli
- Şifre minimum 8 karakter
- Rate limiting aktif
- Admin paneli için özel secret key gerekli

## 📝 Git Workflow

### Yeni Özellik Geliştirme

```bash
# Developer branch'ine geç
git checkout developer

# Yeni feature branch oluştur
git checkout -b feature/yeni-ozellik

# Değişiklikleri commit'le
git add .
git commit -m "feat: yeni özellik eklendi"

# Feature branch'i push'la
git push origin feature/yeni-ozellik

# Pull Request oluştur (GitHub'da)
```

### Main Branch'e Merge

```bash
# Developer branch'ine geç
git checkout developer

# Main'den güncellemeleri al
git pull origin main

# Feature branch'i merge et
git merge feature/yeni-ozellik

# Developer'ı push'la
git push origin developer

# Main'e merge et (GitHub'da Pull Request ile)
```

## 📞 İletişim

- **Proje Yöneticisi:** [İletişim Bilgileri]
- **Backend Geliştirici:** [İletişim Bilgileri]
- **Frontend Geliştirici:** [İletişim Bilgileri]

## 📄 Lisans

Bu proje MACS lisansı altında lisanslanmıştır. 