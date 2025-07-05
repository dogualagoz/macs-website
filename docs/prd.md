# MACS Kulübü Web Sitesi - Proje Dökümanı (PRD)

## 📋 Proje Özeti
MACS Kulübü'nün resmi tanıtım ve içerik yönetim sistemi. Kulüp projelerini ve etkinliklerini sergilemek, admin paneli üzerinden içerik yönetimi sağlamak amacıyla geliştirilmektedir.

---

## 🎯 Hedefler
- **Ana Hedef**: Kulübün projelerini ve etkinliklerini kamuya sergilemek
- **Yönetim Hedefi**: Admin/moderator rolündeki kişilerin içerik yönetimi yapabilmesi
- **Teknik Hedef**: Sürdürülebilir, genişletilebilir ve production-ready bir sistem

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
- **Authentication**: JWT
- **API Documentation**: OpenAPI/Swagger ✅

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

---

### 3. Veritabanı Modelleri

1. User
- id: Integer, primary key
- full_name: String
- email: String, unique
- hashed_password: String
- role: String (admin, moderator)
- is_active: Boolean
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

### JWT Implementation
- **Login**: Email/username + password → JWT token
- **Token Storage**: Frontend'de secure storage
- **Token Validation**: Her protected endpoint'te middleware
- **Role Check**: Admin/moderator kontrolü

### Protected Endpoints
- `/admin/*` - Sadece admin/moderator
- `POST/PUT/DELETE /api/projects` - Sadece admin/moderator
- `POST/PUT/DELETE /api/events` - Sadece admin/moderator

---

## 🚀 API Endpoints

🔐 Auth
- POST /auth/login → Giriş (JWT alır)
- GET /auth/me → Mevcut kullanıcı bilgisi

👤 Users (admin only)
- POST /users/ → Yeni kullanıcı ekle
- GET /users/ → Tüm kullanıcıları listele
- GET /users/{id} → Kullanıcıyı getir
- PUT /users/{id} → Güncelle
- DELETE /users/{id} → Soft delete

📁 Projects
- POST /projects/ → Yeni proje ekle
- GET /projects/ → Tüm projeleri getir
- GET /projects/{slug} → Slug ile getir
- PUT /projects/{id} → Güncelle
- DELETE /projects/{id} → Sil

📅 Events ✅
- POST /events/ → Yeni etkinlik ekle
- GET /events/ → Listele (filtreleme ve pagination desteği ile)
- GET /events/{slug} → Detay getir
- PUT /events/{id} → Güncelle
- DELETE /events/{id} → Sil

🏷️ Tags & Categories
- GET /tags/ → Tüm tagleri getir
- POST /tags/ → Yeni tag
- GET /project-categories/
- POST /project-categories/
- GET /event-categories/ ✅
- POST /event-categories/ ✅

🔎 Filtreleme (public) ✅
- GET /projects/?category=&tag=
- GET /events/?status=upcoming|ongoing|past&category=&search=

### Events (İlk Geliştirme) 

## 🎯 Geliştirme Planı

## 📋 Backend Geliştirme Planı

### ✅ YAPILDI
- [x] FastAPI proje setup
  - [x] requirements.txt oluşturma
  - [x] main.py temel yapısı
  - [x] klasör yapısı organizasyonu
- [x] Database bağlantısı
  - [x] PostgreSQL connection setup
  - [x] Database connection helper (database.py)
  - [x] SQLAlchemy configuration
- [x] Environment configuration
  - [x] .env dosyası
- [x] Events API
  - [x] Events CRUD endpoints
  - [x] Events filtering & pagination
  - [x] Events business logic
  - [x] Slug implementation
- [x] Alembic migration setup
  - [x] Initial migration
  - [x] Database schema creation

### 🚧 YAPILACAKLAR

#### Faz 1: Authentication System
- [ ] JWT implementation
  - [ ] JWT utilities (create, verify, decode)
  - [ ] Password hashing (bcrypt)
  - [ ] Token middleware
- [ ] Auth endpoints
  - [ ] POST /api/auth/login
  - [ ] POST /api/auth/refresh  
  - [ ] POST /api/auth/logout
- [ ] Role-based access control
  - [ ] Admin/moderator decorators
  - [ ] Permission middleware

#### Faz 2: Projects API
- [ ] SQLAlchemy model tanımları
  - [ ] Project model
  - [ ] ProjectCategory model
  - [ ] Tag models
  - [ ] Model relationships
- [ ] Projects CRUD endpoints
  - [ ] GET /api/projects (with filters)
  - [ ] GET /api/projects/{id}
  - [ ] POST /api/projects (protected)
  - [ ] PUT /api/projects/{id} (protected)
  - [ ] DELETE /api/projects/{id} (protected)

#### Faz 3: Test & Optimizasyon
- [ ] Test yazımı
  - [ ] Unit tests
  - [ ] Integration tests
- [ ] Performance optimizasyonları
  - [ ] Caching (Redis)
  - [ ] Database indexing
  - [ ] Query optimizasyonu

#### Faz 4: Deployment & CI/CD
- [ ] Docker setup
  - [ ] Dockerfile
  - [ ] docker-compose.yml
- [ ] CI/CD pipeline
  - [ ] GitHub Actions
  - [ ] Automated testing
  - [ ] Automated deployment

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
- **Frontend Hazırlık**: Events API tamamlandığında frontend entegrasyona hazır
- **Documentation**: Her endpoint için detaylı OpenAPI docs

---

## 🎯 Bir Sonraki Adım
**Şimdi**: Backend proje kurulumu ile başlayacağız. FastAPI setup, klasör yapısı ve temel dependencies.

## 🎯 Başlangıç Noktası
**İlk adım**: Backend kurulumu ve Events API'lerinin geliştirilmesi. Frontend ekibi ile paralel çalışarak Events bölümünü tamamlayıp entegrasyon testleri yapılacak. 