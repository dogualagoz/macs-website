# MACS Kulübü Web Sitesi - Proje Dökümanı (PRD)

## 📋 Proje Özeti
MACS Kulübü'nün resmi tanıtım ve içerik yönetim sistemi. Kulüp projelerini ve etkinliklerini sergilemek, ekip tanıtımı yapmak ve admin paneli üzerinden içerik yönetimi sağlamak amacıyla geliştirilmiştir. Proje production ortamında canlıya alınmış ve aktif olarak kullanılmaktadır.

**Canlı Site:** [macsclub.com.tr](https://macsclub.com.tr)

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
- Ana sayfayı görüntüleyebilir (Hero, Hakkımızda, Ekip Tanıtımı, Etkinlik/Proje Önizleme)
- Tüm etkinlikleri görüntüleyebilir ve kategorilere göre filtreleyebilir
- Etkinlik detaylarını görüntüleyebilir
- Tüm projeleri görüntüleyebilir ve kategorilere göre filtreleyebilir
- Proje detaylarını görüntüleyebilir
- Yönetim kurulu üyelerini görüntüleyebilir
- **Kısıtlama**: Kayıt sistemi yok, sadece görüntüleme

### 2. Moderator (Moderatör)
- Tüm public yetkiler +
- Etkinlik ekleme, düzenleme, silme (soft delete)
- Proje ekleme, düzenleme, silme (soft delete)
- Görsel yükleme
- **Giriş**: JWT token ile email/password authentication
- **Kısıtlama**: Kullanıcı yönetimi yapamaz

### 3. Admin (Yönetici)
- Tüm moderator yetkiler +
- Kullanıcı yönetimi (moderatör ekleme/silme)
- Tüm kullanıcıları listeleme
- **Giriş**: JWT token ile email/password authentication
- **Tam Yetki**: Sistemin tüm işlevlerine erişim

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
- registration_link: String (Kayıt formu linki)
- directions_link: String (Yol tarifi linki)
- start_time: DateTime
- end_time: DateTime (nullable)
- category_id: ForeignKey (event_categories.id)
- created_by: ForeignKey (users.id)
- is_active: Boolean
- is_deleted: Boolean
- is_featured: Boolean (Öne çıkan etkinlik)
- created_at: DateTime
- updated_at: DateTime

3. EventCategory ✅
- id: Integer
- name: String, unique
- description: String
- created_at: DateTime
- updated_at: DateTime

4. Project ✅
- id: Integer, primary key
- title: String
- slug: String, unique
- description: String
- content: Text
- image_url: String
- technologies: String (JSON string)
- github_url: String
- live_url: String
- status: Enum(ProjectStatus) # PLANNING, IN_PROGRESS, COMPLETED, ON_HOLD, CANCELLED
- category_id: ForeignKey (project_categories.id)
- created_by: ForeignKey (users.id)
- team_members: String (JSON string)
- is_active: Boolean
- is_deleted: Boolean
- is_featured: Boolean (Öne çıkan proje)
- created_at: DateTime
- updated_at: DateTime
- started_at: DateTime
- completed_at: DateTime

5. ProjectCategory ✅
- id: Integer
- name: String, unique
- description: String
- icon: String
- created_at: DateTime
- updated_at: DateTime

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
- `POST/PUT/DELETE /api/projects` - Sadece admin/moderator
- `POST /api/upload` - Sadece admin/moderator

---

## 📱 Sayfa Yapısı ve Özellikler

### Ana Sayfa (/) ✅
**Bölümler:**
1. **Hero Bölümü**
   - MACS logosu
   - Hoş geldiniz mesajı ve açıklama
   - Üniversite ve kulüp tanıtımı
   - Sosyal medya rozetleri
   - Arkaplan görseli (ekip fotoğrafı)

2. **Dashboard (Etkinlikler ve Projeler Önizleme)**
   - Öne çıkan etkinlik kartı
   - Son 3 etkinlik
   - Öne çıkan proje kartı
   - Son 3 proje
   - Kategori filtreleme
   - "Daha fazla" butonları

3. **Hakkımızda Bölümü**
   - Kulüp tanıtımı
   - Misyon metni
   - 4 değer kartı:
     - Topluluk
     - Öğrenme
     - Yenilik
     - İş Birliği

4. **Yönetim Ekibimizle Tanışın**
   - 11 yönetim kurulu üyesi
   - Her üye için:
     - Profil fotoğrafı
     - İsim ve rol
     - Sınıf bilgisi
     - Uzmanlık alanı
     - Sosyal medya linkleri

5. **Footer**
   - İletişim bilgileri
   - Sosyal medya linkleri
   - Telif hakkı

### Etkinlikler Sayfası (/etkinlikler) ✅
**Özellikler:**
- Gradient header
- Kategori filtreleme (Tümü, Workshop, Seminer, vb.)
- Öne çıkan etkinlik kartı (büyük)
- Grid layout etkinlik kartları
- Geçmiş/Yaklaşan etiketleri
- Tarih ve saat formatı (Türkçe, GMT+3)
- Konum bilgisi
- Kayıt ol butonu (varsa)
- Responsive tasarım
- Loading ve error states
- Framer Motion animasyonlar

### Etkinlik Detay Sayfası (/etkinlikler/:slug) ✅
**Özellikler:**
- Büyük etkinlik görseli
- Detaylı açıklama
- Tarih, saat, konum
- Kayıt formu linki
- Yol tarifi linki
- Kategori bilgisi
- Breadcrumb navigation

### Projeler Sayfası (/projeler) ✅
**Özellikler:**
- Kategori filtreleme (Web, Mobil, AI, Oyun, vb.)
- Öne çıkan proje kartı
- Grid layout proje kartları
- Teknoloji etiketleri
- Proje durumu (Planning, In Progress, Completed, vb.)
- GitHub ve demo linkleri
- Takım üyeleri
- Responsive tasarım
- Loading ve error states

### Proje Detay Sayfası (/projeler/:slug) ✅
**Özellikler:**
- Proje görseli
- Detaylı açıklama
- Kullanılan teknolojiler
- GitHub repository linki
- Canlı demo linki
- Ekip üyeleri
- Proje durumu
- Kategori bilgisi

### Admin Panel (/admin) ✅

#### Giriş Sayfası (/login) ✅
- Email/password formu
- JWT token authentication
- Error handling
- Remember me (optional)

#### Dashboard (/admin/dashboard) ✅
- İstatistik kartları:
  - Toplam etkinlik
  - Toplam proje
  - Aktif kullanıcı
  - Güncel etkinlik
- Hızlı erişim kartları
- Son etkinlikler listesi

#### İçerik Yönetimi (/admin/content) ✅
**Tab 1: Etkinlik Ekle**
- Form alanları:
  - Görsel yükleme (önizleme ile)
  - Başlık (required)
  - Açıklama (required)
  - Konum (required)
  - Tarih ve saat (datetime-local)
  - Kayıt formu linki
  - Yol tarifi linki
  - Kategori seçimi
  - Detaylı içerik (textarea)
  - Öne çıkar (checkbox)
  - Aktif mi (checkbox)
- Validasyon
- Success/error mesajları
- Form temizleme

**Tab 2: Proje Ekle**
- Form alanları:
  - Görsel yükleme (önizleme ile)
  - Başlık (required)
  - Açıklama (required)
  - GitHub URL
  - Demo/Live URL
  - Kategori
  - Teknolojiler
  - Takım üyeleri
  - Durum seçimi
  - Detaylı içerik
  - Öne çıkar (checkbox)
  - Aktif mi (checkbox)
- Validasyon
- Success/error mesajları

#### Kullanıcı Yönetimi (/admin/users) ✅
- Kullanıcı listesi (tablo)
- Kullanıcı silme (admin only)
- Moderatör ekleme (admin only)
- ID, isim, email, rol gösterimi

#### Loglar (/admin/logs) 🔄
- Henüz aktif değil
- Gelecek özellik

---

## 🎨 UI/UX Özellikleri

### Animasyonlar ✅
- Framer Motion ile sayfa geçişleri
- Hover efektleri
- Loading animations
- Smooth scrolling

### Responsive Design ✅
- Mobile-first yaklaşım
- Tablet optimizasyonu
- Desktop layout
- Flexible grid system

### Loading States ✅
- Spinner animasyonları
- Skeleton screens
- Progress indicators

### Error Handling ✅
- User-friendly error mesajları
- Retry butonları
- 404 sayfası
- Network error handling

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
- [x] React Frontend Setup
- [x] Vercel Deployment
- [x] Railway Backend Deployment
- [x] Production Environment Ayarları

### ✅ Sprint 4 (Tamamlandı)
- [x] Frontend Auth Entegrasyonu
- [x] Events Listesi ve Detay Sayfaları
- [x] Admin Panel - Events CRUD
- [x] Admin Panel - Users CRUD

### ✅ Sprint 5 (Tamamlandı)
- [x] Projects Modülü - Backend
- [x] Projects Modülü - Frontend
- [x] Admin Panel - Projects CRUD
- [x] Ana Sayfa Bölümleri (Hero, About, Team, Dashboard)
- [x] Görsel Yükleme Sistemi
- [x] Kategori Filtreleme
- [x] Responsive Tasarım
- [x] Framer Motion Animasyonlar
- [x] Production Deployment ve Test

### 📋 Gelecek Özellikler (Backlog)

#### Öncelikli Özellikler
1. **Log Sistemi**
   - Sistem logları
   - Kullanıcı aktivite logları
   - API request/response logları
   - Hata logları
   - Admin panel log görüntüleme sayfası

2. **Sosyal Medya Entegrasyonu**
   - Ekip üyesi sosyal medya linkleri (LinkedIn, GitHub, Instagram, Email)
   - Share butonları (etkinlik/proje paylaşma)
   - Instagram feed entegrasyonu

3. **Email Bildirimleri**
   - Yeni etkinlik duyuruları
   - Proje güncellemeleri
   - Kullanıcı onay emaili
   - Şifre sıfırlama emaili

#### Orta Öncelikli Özellikler
4. **Gelişmiş Görsel Yönetimi**
   - Görsel optimizasyonu (resize, compress)
   - CDN entegrasyonu
   - Görsel kırpma/düzenleme arayüzü
   - Çoklu görsel yükleme
   - Görsel silme fonksiyonu

5. **SEO ve Analytics**
   - Meta tag optimizasyonu
   - Open Graph tags
   - Twitter Card tags
   - XML Sitemap
   - robots.txt güncellemesi
   - Google Analytics entegrasyonu
   - Sayfa görüntülenme istatistikleri
   - Kullanıcı davranış analizi

6. **Gelişmiş Arama ve Filtreleme**
   - Full-text search
   - Etiket bazlı arama
   - Tarih aralığı filtreleme
   - Çoklu kategori seçimi
   - Arama geçmişi

#### Uzun Vadeli Özellikler
7. **Dashboard İyileştirmeleri**
   - Grafik ve istatistikler (Chart.js)
   - Real-time veri güncellemesi
   - Export özellikleri (Excel, PDF)
   - Veri görselleştirme
   - KPI takibi

8. **Etkinlik Yönetimi İyileştirmeleri**
   - Etkinlik katılımcı listesi
   - QR kod ile check-in sistemi
   - Etkinlik geri bildirimi formu
   - Etkinlik tekrarı (recurring events)
   - Etkinlik reminder sistemi

9. **Kullanıcı Deneyimi İyileştirmeleri**
   - Dark mode
   - Çoklu dil desteği (TR/EN)
   - PWA desteği (Progressive Web App)
   - Offline mode
   - Push notifications

10. **API İyileştirmeleri**
    - GraphQL endpoint'leri
    - Webhook sistemi
    - API versioning
    - API rate limiting per user
    - API key management

---

## 📊 Mevcut Durum (Production)

### ✅ Tamamlanan Özellikler

#### Frontend
- ✅ Ana sayfa (Hero, About, Team, Dashboard sections)
- ✅ Etkinlikler sayfası ve detay sayfası
- ✅ Projeler sayfası ve detay sayfası
- ✅ Admin panel (Dashboard, İçerik Yönetimi, Kullanıcı Yönetimi)
- ✅ Login sistemi
- ✅ Responsive tasarım (Mobile, Tablet, Desktop)
- ✅ Framer Motion animasyonları
- ✅ Loading ve error states
- ✅ Protected routes
- ✅ Kategori filtreleme
- ✅ Navbar ve Footer

#### Backend
- ✅ FastAPI REST API
- ✅ PostgreSQL database
- ✅ JWT authentication
- ✅ Events CRUD endpoints
- ✅ Projects CRUD endpoints
- ✅ Users management endpoints
- ✅ File upload endpoint
- ✅ Category endpoints
- ✅ Rate limiting
- ✅ CORS configuration
- ✅ OpenAPI/Swagger documentation

#### Deployment
- ✅ Frontend: Vercel (macsclub.com.tr)
- ✅ Backend: Railway
- ✅ Database: Railway PostgreSQL
- ✅ File Storage: Railway persistent volume
- ✅ Environment variables management
- ✅ Automatic deployments (CI/CD)

### 🔄 Geliştirilmekte Olan Özellikler
- 🔄 Log sayfası (Admin panel)
- 🔄 Sosyal medya link entegrasyonu

### 📦 Teknik Bağımlılıklar

#### Frontend Dependencies
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.30.1",
  "framer-motion": "^12.23.12",
  "lucide-react": "^0.544.0"
}
```

#### Backend Dependencies
```
fastapi==0.110.0
uvicorn[standard]==0.27.1
sqlalchemy==2.0.41
psycopg2-binary==2.9.10
alembic==1.16.2
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
slowapi==0.1.9
pydantic==2.11.7
```

---

## 🔍 API Endpoints Özeti

### Public Endpoints
- `GET /` - Health check
- `GET /health` - Health check
- `GET /api/events` - Tüm etkinlikler
- `GET /api/events/{slug}` - Etkinlik detayı
- `GET /api/events/categories` - Etkinlik kategorileri
- `GET /api/events/featured` - Öne çıkan etkinlik
- `GET /api/projects` - Tüm projeler
- `GET /api/projects/{slug}` - Proje detayı
- `GET /api/projects/categories` - Proje kategorileri
- `GET /api/projects/featured` - Öne çıkan proje

### Auth Endpoints (Rate Limited)
- `POST /auth/login` - Kullanıcı girişi
- `POST /auth/register` - Yeni kullanıcı kaydı
- `POST /auth/change-password` - Şifre değiştirme

### Protected Endpoints (Moderator/Admin)
- `POST /api/events` - Etkinlik oluşturma
- `PUT /api/events/{id}` - Etkinlik güncelleme
- `DELETE /api/events/{id}` - Etkinlik silme
- `POST /api/projects` - Proje oluşturma
- `PUT /api/projects/{id}` - Proje güncelleme
- `DELETE /api/projects/{id}` - Proje silme
- `POST /api/upload` - Dosya yükleme
- `GET /api/users` - Kullanıcı listesi (Admin only)
- `POST /api/users` - Kullanıcı oluşturma (Admin only)
- `DELETE /api/users/{id}` - Kullanıcı silme (Admin only)

---

## 👥 Ekip ve Roller

### Proje Geliştirme Ekibi
- **Doğu Alagöz** - Proje Koordinatörü, Backend Developer
- **Berke Zerelgil** - Kulüp Başkanı, UI/UX Designer

### Yönetim Kurulu (11 Kişi)
- Berke Zerelgil - Kulüp Başkanı
- Efe Altın - Başkan Yardımcısı
- Yiğit Yücel - Genel Koordinatör
- Doğu Alagöz - Proje Koordinatörü
- Kerem Alagöz - Proje Koordinatörü
- Hira Yılmaz - Denetim Koordinatörü
- Eren Alpaslan - Denetim Koordinatörü
- Leyla Mammadova - Kurumsal İletişim Koordinatörü
- Azra Üsküp - Genel Sekreter
- Ali Erdem Geçgel - Halkla İlişkiler
- Ahsen Aslan - Tasarım ve Sosyal Medya Koordinatörü
- Çağrı Arı - Tasarım ve Sosyal Medya Koordinatörü

---

## 📞 İletişim ve Linkler

- **Website**: https://macsclub.com.tr
- **Instagram**: @macs_esogu
- **Email**: info@macsclub.com.tr
- **Üniversite**: Eskişehir Osmangazi Üniversitesi
- **Bölüm**: Matematik ve Bilgisayar Bilimleri

---

## 📝 Notlar

### Teknik Notlar
- **Slug Oluşturma**: Backend'de unidecode ile Türkçe karakterler dönüştürülüyor
- **Tarih Formatı**: Backend UTC, Frontend GMT+3 (Türkiye)
- **Soft Delete**: Veriler kalıcı silinmez, `is_deleted` flag'i kullanılır
- **File Upload**: UUID ile benzersiz dosya isimlendirme
- **Featured Items**: Her kategori için bir öne çıkan içerik seçilebilir

### Güvenlik Notlar
- JWT token 7 gün geçerlidir
- Rate limiting tüm auth endpoint'lerinde aktif
- 5 başarısız giriş denemesinden sonra 15 dakika hesap kilidi
- CORS sadece belirlenen origin'lerden istek kabul eder
- File upload sadece image formatları kabul eder

---

## 🎯 Hedefler ve Metrikler

### Kullanıcı Metrikleri
- Aylık aktif kullanıcı sayısı
- Sayfa görüntülenme sayısı
- Etkinlik kayıt oranı
- Proje görüntülenme sayısı

### Performans Metrikleri
- Sayfa yükleme süresi < 3 saniye
- API response time < 500ms
- Uptime > %99.5

### İçerik Metrikleri
- Aylık yeni etkinlik sayısı: 2-4
- Aktif proje sayısı: 3-5
- Yönetim kurulu üyesi sayısı: 11

---

**Döküman Versiyonu:** v1.0  
**Son Güncelleme:** 24 Kasım 2024  
**Durum:** Production (Canlı)  
**Proje Durumu:** ✅ Aktif Geliştirme