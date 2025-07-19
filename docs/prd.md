# MACS Kulübü Web Sitesi - Proje Dökümanı (PRD)

## 📋 Proje Özeti
MACS Kulübü'nün resmi tanıtım ve içerik yönetim sistemi. Kulüp projelerini ve etkinliklerini sergilemek, admin paneli üzerinden içerik yönetimi sağlamak amacıyla geliştirilmektedir.

---

## 🎯 Hedefler
- **Ana Hedef**: Kulübün projelerini ve etkinliklerini kamuya sergilemek
- **Yönetim Hedefi**: Admin/moderator rolündeki kişilerin içerik yönetimi yapabilmesi
- **Teknik Hedef**: Sürdürülebilir, genişletilebilir ve production-ready bir sistem
- **Güvenlik Hedefi**: Modern güvenlik standartlarına uygun, saldırılara dirençli sistem

---

## 🏗️ Teknik Mimari

### Frontend
- **Framework**: React ✅
- **Styling**: CSS Modules ✅
- **Deployment**: Vercel ✅

### Backend
- **Framework**: FastAPI ✅
- **Database**: PostgreSQL ✅
- **ORM**: SQLAlchemy ✅
- **Validation**: Pydantic ✅
- **Authentication**: JWT (HS256) ✅
- **Password Hashing**: Bcrypt ✅
- **API Documentation**: OpenAPI/Swagger ✅
- **Rate Limiting**: slowapi ✅
- **Environment**: python-dotenv ✅
- **Deployment**: Railway ✅

### Deployment
- **Frontend**: Vercel (production & preview deployments) ✅
- **Backend**: Railway (auto-scaling & monitoring) ✅
- **Database**: Railway PostgreSQL (managed database) ✅
- **Environment Variables**: Railway & Vercel ✅

---

## 👥 Kullanıcı Tipleri

### 1. Ziyaretçiler (Public)
- Projeleri görüntüleyebilir
- Etkinlikleri görüntüleyebilir
- Filtreleme yapabilir
- **Kısıtlama**: Kayıt sistemi yok, sadece görüntüleme

### 2. Admin/Moderator
- Tüm public yetkiler + 
- Proje CRUD işlemleri
- Etkinlik CRUD işlemleri
- İçerik yönetimi
- **Giriş**: JWT token ile
- **Yetki**: Role-based access control

---

## 🗄️ Veritabanı Modelleri

1. User ✅
- id: Integer, primary key
- full_name: String
- email: String, unique
- hashed_password: String
- status: String
- role: String (admin, moderator)
- is_active: Boolean
- last_login: DateTime
- failed_login_attempts: Integer
- last_failed_login: DateTime
- password_changed_at: DateTime
- created_at: DateTime
- updated_at: DateTime

2. Event ✅
- id: Integer, primary key
- title: String
- slug: String, unique
- description: String
- content: Text
- image_url: String
- location: String
- start_time: DateTime
- end_time: DateTime (nullable)
- category_id: ForeignKey (event_categories.id)
- created_by: ForeignKey (users.id)
- is_active: Boolean
- is_deleted: Boolean
- created_at: DateTime
- updated_at: DateTime

3. EventCategory ✅
- id: Integer
- name: String, unique
- created_at: DateTime

---

## 🛡️ Authentication & Authorization

### JWT Implementation ✅
- **Login**: Email + password → JWT token
- **Token Storage**: Frontend'de secure storage
- **Token Validation**: Her protected endpoint'te middleware
- **Role Check**: Admin/moderator kontrolü
- **Rate Limiting**: Tüm auth endpointlerinde rate limit
- **Hesap Kilitleme**: 5 başarısız denemeden sonra 15dk kilit

### Güvenlik Özellikleri ✅
- **Şifre Politikası**: Minimum 6 karakter
- **Email Doğrulama**: Email formatı kontrolü
- **Şifre Hash**: Bcrypt algoritması
- **Oturum Yönetimi**: JWT (HS256) ile
- **Rate Limiting**: DDoS koruması
- **Rol Bazlı Yetkilendirme**: Admin/moderator ayrımı
- **Güvenli Şifre Değişimi**: Eski şifre kontrolü
- **Soft Delete**: Veri bütünlüğü için yumuşak silme

### Protected Endpoints ✅
- `/auth/*` - Rate limit korumalı
- `/users/*` - Sadece admin/moderator
- `POST/PUT/DELETE /api/events` - Sadece admin/moderator

---

## 📈 Sprint Durumu

### ✅ Sprint 1 (Tamamlandı)
- [x] FastAPI Proje Setup
- [x] Database Setup
- [x] Alembic Migrations
- [x] Events Modülü - Temel

### ✅ Sprint 2 (Tamamlandı)
- [x] Authentication Altyapısı
- [x] Auth Endpoints
- [x] Güvenlik Önlemleri
- [x] Users Modülü

### ✅ Sprint 3 (Tamamlandı)
- [x] Next.js Frontend Setup
- [x] Vercel Deployment
- [x] Railway Backend Deployment
- [x] Production Environment Ayarları

### 🔄 Sprint 4 (Devam Ediyor)
- [ ] Frontend Auth Entegrasyonu
- [ ] Events Listesi ve Detay Sayfaları
- [ ] Admin Panel - Events CRUD
- [ ] Admin Panel - Users CRUD

### 📋 Gelecek Özellikler (Backlog)
1. **Görsel Yönetimi**
   - Google Cloud Storage entegrasyonu
   - Görsel upload/delete işlemleri
   - Görsel optimizasyonu ve CDN

2. **Projeler Modülü**
   - Proje CRUD işlemleri
   - Proje kategorileri
   - Proje etiketleri

3. **SEO Optimizasyonları**
   - Meta tag'ler
   - Sitemap
   - robots.txt

4. **Analytics**
   - Sayfa görüntülenme istatistikleri
   - Kullanıcı davranış analizi
   - Performance monitoring 