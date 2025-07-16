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
- **Framework**: React.js
- **Styling**: CSS
- **Durum Yönetimi**: TBD (Context API veya Redux)

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

### 3. Veritabanı Modelleri

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

2. Project
- id: Integer, primary key
- title: String
- description: String
- content: Text
- slug: String, unique
- image_url: String
- github_url: String
- project_url: String
- category_id: ForeignKey (project_categories.id)
- created_by: ForeignKey (users.id)
- is_active: Boolean
- is_deleted: Boolean
- views: Integer
- created_at: DateTime
- updated_at: DateTime

3. ProjectCategory
- id: Integer
- name: String, unique

4. Tag
- id: Integer
- name: String, unique

5. ProjectTag (many-to-many)
- project_id: ForeignKey
- tag_id: ForeignKey

6. Event ✅
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

7. EventCategory ✅
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

## 🚀 API Endpoints

🔐 Auth ✅
- POST /auth/register → Yeni kullanıcı kaydı
- POST /auth/register/admin → Admin kullanıcı kaydı (secret key ile)
- POST /auth/login → Giriş (JWT alır)

👤 Users ✅
- GET /users/me → Profil bilgisi
- PUT /users/me → Profil güncelleme
- POST /users/me/change-password → Şifre değiştirme
- DELETE /users/me → Hesap silme
- GET /users/ → Tüm kullanıcıları listele (admin)
- GET /users/{id} → Kullanıcı detay (admin)
- DELETE /users/{id} → Kullanıcı silme (admin)

📁 Projects (Sprint 3)
- POST /projects/ → Yeni proje ekle
- GET /projects/ → Tüm projeleri getir
- GET /projects/{slug} → Slug ile getir
- PUT /projects/{id} → Güncelle
- DELETE /projects/{id} → Sil

📅 Events ✅
- POST /events/ → Yeni etkinlik ekle
- GET /events/ → Listele (filtreleme ve pagination desteği ile)
- GET /events/{id} → ID ile detay getir
- GET /events/by-slug/{slug} → Slug ile detay getir
- PUT /events/{id} → Güncelle
- DELETE /events/{id} → Soft delete
- DELETE /events/{id}/hard → Hard delete

🏷️ Categories ✅
- GET /events/categories → Kategorileri listele
- POST /events/categories → Yeni kategori ekle
- PUT /events/categories/{id} → Kategori güncelle
- DELETE /events/categories/{id} → Kategori sil

🔎 Filtreleme ✅
- GET /events/?status=upcoming|past&category_id=&search=
- GET /events/?skip=0&limit=10 → Pagination
- GET /events/?sort_by=start_time&sort_desc=false → Sıralama

## 📈 Sprint Durumu

### ✅ Sprint 1 (Tamamlandı)
- [x] FastAPI Proje Setup
  - [x] requirements.txt oluşturma
  - [x] main.py temel yapısı
  - [x] klasör yapısı organizasyonu
  - [x] CORS ayarları
  - [x] Environment variables yapısı

- [x] Database Setup
  - [x] PostgreSQL bağlantı ayarları
  - [x] SQLAlchemy ORM entegrasyonu
  - [x] Database connection helper (database.py)
  - [x] Connection pooling ayarları

- [x] Alembic Migrations
  - [x] Alembic konfigürasyonu
  - [x] İlk migration dosyası
  - [x] Events ve Categories tabloları
  - [x] Migration test ve doğrulama

- [x] Events Modülü - Temel
  - [x] Event model tanımı
  - [x] EventCategory model tanımı
  - [x] Model ilişkileri ve foreign key'ler
  - [x] Temel CRUD endpoints
  - [x] Response modelleri (Pydantic)

### ✅ Sprint 2 (Tamamlandı)
- [x] Authentication Altyapısı
  - [x] JWT token oluşturma/doğrulama (HS256)
  - [x] Password hashing (bcrypt)
  - [x] Token middleware
  - [x] Role-based yetkilendirme
  - [x] Auth decorator'lar

- [x] Auth Endpoints
  - [x] POST /auth/register
  - [x] POST /auth/register/admin
  - [x] POST /auth/login
  - [x] Token response şemaları
  - [x] Error handling

- [x] Güvenlik Önlemleri
  - [x] Rate limiting (tüm auth endpointleri)
  - [x] Hesap kilitleme sistemi (5 deneme/15dk)
  - [x] Başarısız giriş sayacı
  - [x] Email format validasyonu
  - [x] Şifre politikası kontrolleri (min 8 karakter)
  - [x] Güvenli şifre değişimi kontrolleri

- [x] Users Modülü
  - [x] User model ve migrations
  - [x] Profil endpoints (/me)
  - [x] Admin endpoints
  - [x] Şifre değiştirme
  - [x] Kullanıcı silme/deaktive

- [x] Events Modülü - Gelişmiş
  - [x] Filtreleme sistemi
    - [x] Tarih bazlı filtreleme (upcoming/past)
    - [x] Kategori filtreleme
    - [x] Status filtreleme
    - [x] Arama (title/description)
  - [x] Pagination
    - [x] Skip/limit mantığı
    - [x] Toplam sayfa hesaplama
  - [x] Slug sistemi
    - [x] Otomatik slug oluşturma
    - [x] Slug ile event getirme
  - [x] Silme işlemleri
    - [x] Soft delete
    - [x] Hard delete (admin)
  - [x] Sıralama
    - [x] Çoklu alan desteği
    - [x] Artan/azalan sıralama

### 🔄 Sprint 3 (Devam Ediyor)
- [ ] Projects Modülü
  - [ ] Model ve migrations
  - [ ] CRUD endpoints
  - [ ] Filtreleme ve arama
  - [ ] Kategorilendirme
  - [ ] Tag sistemi

---

## 🔧 Kurulum ve Çalıştırma

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend  
```bash
cd frontend
npm install
npm start
```

---

## 📝 Notlar

- **Öncelik Sırası**: Setup → Models → Auth → Events API → Testing
- **Production Ready**: Her adımda clean code ve best practices
- **Frontend Hazırlık**: Events API tamamlandığında frontend entegrasyonu hazır
- **Documentation**: Her endpoint için detaylı OpenAPI docs

---

## 🎯 Bir Sonraki Adım
**Şimdi**: Backend proje kurulumu ile başlayacağız. FastAPI setup, klasör yapısı ve temel dependencies.

## 🎯 Başlangıç Noktası
**İlk adım**: Backend kurulumu ve Events API'lerinin geliştirilmesi. Frontend ekibi ile paralel çalışarak Events bölümünü tamamlayıp entegrasyon testleri yapılacak. 

## 🔍 Loglama Sistemi

### Sistem Logları
- Uygulama başlatma/kapanma logları
- Hata logları (5xx, 4xx)
- Performans metrikleri

### Güvenlik Logları
- Başarısız giriş denemeleri
- Hesap kilitlemeleri
- Admin işlemleri

### Log Formatı
```
timestamp | level | user_id | ip | action | details
```

### Log Saklama
- Dosya sisteminde günlük rotasyon
- 30 gün saklama süresi
- Hassas veri maskeleme

## 📧 Email Doğrulama Sistemi

### Doğrulama Süreci
1. Admin/moderatör kaydı yapılır
2. Otomatik doğrulama maili gönderilir
3. 24 saat geçerli doğrulama linki
4. Link tıklanınca hesap aktifleşir

### Email Template
- Kurumsal tasarım
- Türkçe içerik
- Doğrulama butonu/linki
- İletişim bilgileri 