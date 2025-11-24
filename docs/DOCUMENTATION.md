# MACS Kulübü Web Sitesi - Detaylı Teknik Dokümantasyon

## 📋 Genel Bakış

MACS (Matematik ve Bilgisayar Bilimleri Topluluğu) web sitesi, Eskişehir Osmangazi Üniversitesi Matematik ve Bilgisayar Bilimleri Bölümü öğrencilerinin etkinlik ve projelerini sergilemek, kulüp hakkında bilgi vermek ve yöneticilerin içerik yönetimini sağlamak amacıyla geliştirilmiş modern bir web platformudur.

**Canlı Site:** [macsclub.com.tr](https://macsclub.com.tr)

---

## 🎯 Proje Hedefleri

1. **Tanıtım ve Görünürlük**: Kulübün etkinliklerini, projelerini ve ekibini kamuya sergilemek
2. **İçerik Yönetimi**: Admin/moderatör yetkisine sahip kullanıcıların kolay içerik yönetimi yapabilmesi
3. **Kullanıcı Deneyimi**: Modern, hızlı ve mobil uyumlu kullanıcı arayüzü
4. **Güvenlik**: Modern güvenlik standartlarına uygun, saldırılara dirençli sistem
5. **Ölçeklenebilirlik**: Gelecekte yeni özellikler eklenebilecek genişletilebilir mimari

---

## 🏗️ Teknik Mimari

### Frontend Stack
- **Framework**: React 18.3.1
- **Routing**: React Router DOM 6.30.1
- **Animasyonlar**: Framer Motion 12.23.12
- **İkonlar**: Lucide React 0.544.0
- **Styling**: Custom CSS + CSS Modules
- **Build Tool**: Create React App (CRA)
- **Deployment**: Vercel

### Backend Stack
- **Framework**: FastAPI 0.110.0
- **Web Server**: Uvicorn 0.27.1
- **Database**: PostgreSQL (Railway managed)
- **ORM**: SQLAlchemy 2.0.41
- **Migration Tool**: Alembic 1.16.2
- **Validation**: Pydantic 2.11.7
- **Authentication**: JWT (python-jose)
- **Password Hashing**: Bcrypt 4.0.1
- **Rate Limiting**: slowapi 0.1.9
- **File Handling**: python-multipart
- **Environment**: python-dotenv
- **Deployment**: Railway

### Deployment Infrastructure
- **Frontend Host**: Vercel (Automatic deployments, CDN, SSL)
- **Backend Host**: Railway (Auto-scaling, monitoring)
- **Database**: Railway PostgreSQL (Managed database)
- **File Storage**: Railway persistent volume (/app/uploads)
- **Domain**: Custom domain ile production deployment

---

## 📱 Sayfa Yapısı ve Özellikler

### 1. Ana Sayfa (/)

Ana sayfa kullanıcıları karşılayan ve kulüp hakkında bilgi veren ana sayfadır.

#### Hero Bölümü
- **Amaç**: Kullanıcıları karşılayan ilk görsel bölüm
- **İçerik**:
  - MACS logosu
  - Hoş geldiniz mesajı
  - Üniversite ve bölüm bilgisi
  - Sosyal medya rozetleri (MACS ve ESOGÜ logoları)
- **Görsel**: Ekip fotoğrafı arka plan olarak kullanılıyor
- **Dosya**: `frontend/src/components/sections/HeroSection.jsx`

#### Dashboard Bölümü (Etkinlikler ve Projeler Önizleme)
- **Amaç**: En son etkinlik ve projeleri ana sayfada sergilemek
- **İçerik**:
  - Öne çıkan etkinlik kartı
  - Son etkinlikler listesi
  - Öne çıkan proje kartı
  - Son projeler listesi
- **API Entegrasyonu**: 
  - Etkinlikler ve projeler API'den dinamik olarak çekiliyor
  - Kategorilere göre filtreleme desteği
  - Öne çıkan içerik vurgulama
- **Loading State**: Spinner ile yükleme durumu gösterimi
- **Error Handling**: Hata durumunda kullanıcı dostu mesaj
- **Dosya**: `frontend/src/components/sections/DashBoard.jsx`

#### Hakkımızda Bölümü
- **Amaç**: MACS kulübünü tanıtmak
- **İçerik**:
  - Kulüp tanıtımı
  - Misyon metni
  - Değerler kartları:
    - **Topluluk**: Destekleyici ve güvenli ortam
    - **Öğrenme**: Merak, araştırma ve paylaşım
    - **Yenilik**: Yaratıcılık ve yeni fikirler
    - **İş Birliği**: Ekip çalışması ve birlikte üretim
- **Görsel**: Her değer için özel ikon
- **Dosya**: `frontend/src/components/sections/AboutSection.jsx`

#### Yönetim Ekibimizle Tanışın Bölümü
- **Amaç**: Kulüp yönetim ekibini tanıtmak
- **İçerik**:
  - 11 yönetim kurulu üyesi profili:
    - Berke Zerelgil (Kulüp Başkanı)
    - Efe Altın (Başkan Yardımcısı)
    - Yiğit Yücel (Genel Koordinatör)
    - Doğu Alagöz (Proje Koordinatörü)
    - Kerem Alagöz (Proje Koordinatörü)
    - Hira Yılmaz (Denetim Koordinatörü)
    - Eren Alpaslan (Denetim Koordinatörü)
    - Leyla Mammadova (Kurumsal İletişim Koordinatörü)
    - Azra Üsküp (Genel Sekreter)
    - Ali Erdem Geçgel (Halkla İlişkiler)
    - Ahsen Aslan (Tasarım ve Sosyal Medya Koordinatörü)
    - Çağrı Arı (Tasarım ve Sosyal Medya Koordinatörü)
  - Her üye için:
    - Profil fotoğrafı
    - İsim ve rol
    - Sınıf bilgisi
    - Uzmanlık alanı
    - Sosyal medya linkleri (LinkedIn, GitHub, Instagram, Email)
- **Dosya**: `frontend/src/components/sections/TeamSection.jsx`

#### Footer (İletişim)
- Kulüp iletişim bilgileri
- Sosyal medya linkleri
- Telif hakkı bilgisi

---

### 2. Etkinlikler Sayfası (/etkinlikler)

Kulübün düzenlediği tüm etkinlikleri görüntüleme sayfası.

#### Özellikler
- **Header**: Gradient arka planlı başlık bölümü
- **Kategori Filtreleme**: 
  - Tümü, Workshop, Seminer, Hackathon vb. kategorilere göre filtreleme
  - Dinamik kategori butonu oluşturma
- **Öne Çıkan Etkinlik Kartı**:
  - Büyük görsel alan
  - Detaylı etkinlik bilgileri (tarih, saat, konum)
  - "Öne Çıkan" veya "Geçmiş" rozeti
  - Kayıt ol butonu (varsa)
  - Detayları gör butonu
  - Yol tarifi linki (varsa)
- **Etkinlik Grid Kartları**:
  - 3 sütunlu responsive grid
  - Kompakt etkinlik kartları
  - Hover animasyonları
  - Geçmiş/Yaklaşan etiketleri
- **API Entegrasyonu**:
  - Etkinlik listesi ve kategoriler API'den çekiliyor
  - Tarih formatı: Türkçe locale (örn: "15 Aralık 2024")
  - Saat formatı: Türkiye saat dilimi (GMT+3)
- **Responsive Design**: Mobil, tablet ve desktop uyumlu
- **Dosya**: `frontend/src/pages/Events.jsx`

#### Etkinlik Detay Sayfası (/etkinlikler/:slug)
- Etkinlik detaylı açıklama
- Büyük görsel
- Tarih, saat, konum bilgileri
- Kayıt formu linki
- Yol tarifi linki
- Kategori bilgisi
- **Dosya**: `frontend/src/pages/EventDetailPage.jsx`

---

### 3. Projeler Sayfası (/projeler)

Kulübün geliştirdiği projeleri görüntüleme sayfası.

#### Özellikler
- **Kategori Filtreleme**: 
  - Web Geliştirme, Mobil Uygulama, Yapay Zeka, Oyun Geliştirme vb.
- **Öne Çıkan Proje Kartı**:
  - Büyük proje görseli
  - Proje açıklaması
  - Kullanılan teknolojiler
  - GitHub repository linki
  - Canlı demo linki (varsa)
- **Proje Kartları**:
  - Grid layout
  - Proje görseli
  - Teknoloji etiketleri
  - Takım üyeleri
  - Kategori bilgisi
- **Proje Durumları**:
  - **PLANNING**: Planlama Aşamasında
  - **IN_PROGRESS**: Geliştiriliyor
  - **COMPLETED**: Tamamlandı
  - **ON_HOLD**: Beklemede
  - **CANCELLED**: İptal Edildi
- **Dosya**: `frontend/src/pages/Projects.jsx`

#### Proje Detay Sayfası (/projeler/:slug)
- Detaylı proje açıklaması
- Teknik özellikler
- Kullanılan teknolojiler
- Ekip üyeleri
- GitHub ve demo linkleri
- **Dosya**: `frontend/src/pages/ProjectDetailPage.jsx`

---

### 4. Admin Panel (/admin)

Yetkilendirilmiş kullanıcılar için içerik yönetim paneli.

#### Giriş Sistemi (/login)
- **Kimlik Doğrulama**: Email ve şifre ile giriş
- **JWT Token**: Oturum yönetimi için JWT token
- **Güvenlik Özellikleri**:
  - Rate limiting (5 başarısız denemeden sonra 15 dakika kilit)
  - Bcrypt ile şifre hashleme
  - Token'ın güvenli saklanması (localStorage)
- **Dosya**: `frontend/src/pages/LoginPage.jsx`

#### Dashboard (/admin/dashboard)
- **İstatistikler**:
  - Toplam etkinlik sayısı
  - Toplam proje sayısı
  - Aktif kullanıcı sayısı
  - Güncel etkinlik sayısı
- **Hızlı Erişim Kartları**:
  - İçerik Yönetimi
  - Kullanıcı Yönetimi
  - Loglar
- **Son Etkinlikler**: Son eklenen 5 etkinlik
- **Dosya**: `frontend/src/pages/admin/Dashboard.jsx`

#### İçerik Yönetimi (/admin/content)
- **Tab Yapısı**: Etkinlik Ekle ve Proje Ekle sekmeleri

**Etkinlik Ekleme Formu:**
- Görsel yükleme (önizleme ile)
- Başlık (zorunlu)
- Açıklama (zorunlu)
- Konum (zorunlu)
- Tarih ve saat (datetime-local input)
- Kayıt formu linki (opsiyonel)
- Yol tarifi linki (opsiyonel)
- Kategori seçimi
- Detaylı içerik (textarea)
- Öne çıkar checkbox
- Aktif mi checkbox
- **API**: `POST /api/events`
- **Slug**: Başlıktan otomatik oluşturulur (backend)

**Proje Ekleme Formu:**
- Görsel yükleme (önizleme ile)
- Başlık (zorunlu)
- Açıklama (zorunlu)
- GitHub URL (opsiyonel)
- Demo/Live URL (opsiyonel)
- Kategori seçimi
- Teknolojiler (virgülle ayrılmış)
- Takım üyeleri (virgülle ayrılmış)
- Durum seçimi (PLANNING, IN_PROGRESS, vb.)
- Detaylı içerik (textarea)
- Öne çıkar checkbox
- Aktif mi checkbox
- **API**: `POST /api/projects`

**Form Özellikleri:**
- Görsel önizleme
- Form validasyonu
- Loading state
- Success/error mesajları
- Form temizleme
- **Dosya**: `frontend/src/pages/admin/Content.jsx`

#### Kullanıcılar (/admin/users)
- **Kullanıcı Listesi**:
  - Tablo formatında görüntüleme
  - Kullanıcı ID, isim, email, rol
  - Kullanıcı silme işlemi (admin yetkisi gerekir)
- **Moderatör Yönetimi**:
  - Yeni moderatör ekleme (sadece admin)
  - Moderatör silme (sadece admin)
- **API**: `GET /api/users`, `DELETE /api/users/{user_id}`
- **Dosya**: `frontend/src/pages/admin/Users.jsx`

#### Loglar (/admin/logs)
- **Not**: Henüz aktif değil, gelecek özellik
- **Planlanan Özellikler**:
  - Sistem logları
  - Kullanıcı aktiviteleri
  - API istekleri
  - Hata kayıtları
- **Dosya**: `frontend/src/pages/admin/Logs.jsx`

#### Admin Panel Özellikleri
- **Yan Menü (Sidebar)**:
  - Dashboard
  - İçerik Yönetimi
  - Kullanıcılar
  - Loglar
  - Çıkış Yap
- **Protected Routes**: Sadece giriş yapmış kullanıcılar erişebilir
- **Role-Based Access Control**: 
  - Admin: Tüm yetkilere sahip
  - Moderator: İçerik ekleme/silme yetkisi
- **Dosya**: `frontend/src/pages/AdminPanel.jsx`

---

## 🗄️ Veritabanı Modelleri

### User (Kullanıcı)
```python
{
  id: Integer (Primary Key)
  email: String (Unique, Not Null)
  full_name: String (Not Null)
  hashed_password: String (Not Null)
  role: String (Default: "moderator") # "admin" veya "moderator"
  status: String (Default: "pending") # "pending", "approved", "rejected"
  is_active: Boolean (Default: True)
  failed_login_attempts: Integer (Default: 0)
  last_login: DateTime
  last_failed_login: DateTime
  password_changed_at: DateTime
  created_at: DateTime
  updated_at: DateTime
}
```

**İlişkiler:**
- `events`: Kullanıcının oluşturduğu etkinlikler (One-to-Many)
- `projects`: Kullanıcının oluşturduğu projeler (One-to-Many)

**Dosya**: `backend/models/users.py`

---

### Event (Etkinlik)
```python
{
  id: Integer (Primary Key)
  title: String (Not Null)
  slug: String (Unique, Not Null)
  description: String
  content: Text
  image_url: String
  location: String
  registration_link: String # Kayıt formu linki
  directions_link: String # Yol tarifi linki
  start_time: DateTime (Not Null)
  end_time: DateTime (Nullable)
  category_id: Integer (Foreign Key -> event_categories.id)
  created_by: Integer (Foreign Key -> users.id)
  is_active: Boolean (Default: True)
  is_deleted: Boolean (Default: False) # Soft delete
  is_featured: Boolean (Default: False) # Öne çıkan etkinlik
  created_at: DateTime
  updated_at: DateTime
}
```

**İlişkiler:**
- `category`: Etkinlik kategorisi (Many-to-One)
- `creator`: Oluşturan kullanıcı (Many-to-One)

**Dosya**: `backend/models/events.py`

---

### EventCategory (Etkinlik Kategorisi)
```python
{
  id: Integer (Primary Key)
  name: String (Not Null)
  description: String
  created_at: DateTime
  updated_at: DateTime
}
```

**İlişkiler:**
- `events`: Bu kategorideki etkinlikler (One-to-Many)

**Örnekler**: Workshop, Seminer, Hackathon, Konferans, Sosyal Etkinlik

**Dosya**: `backend/models/events.py`

---

### Project (Proje)
```python
{
  id: Integer (Primary Key)
  title: String (Not Null)
  slug: String (Unique, Not Null)
  description: String
  content: Text
  image_url: String
  technologies: String # JSON string (örn: "React, Node.js, MongoDB")
  github_url: String
  live_url: String
  status: Enum(ProjectStatus) # PLANNING, IN_PROGRESS, COMPLETED, ON_HOLD, CANCELLED
  category_id: Integer (Foreign Key -> project_categories.id)
  created_by: Integer (Foreign Key -> users.id)
  team_members: String # JSON string (örn: "Ahmet Yılmaz, Ayşe Demir")
  is_active: Boolean (Default: True)
  is_deleted: Boolean (Default: False) # Soft delete
  is_featured: Boolean (Default: False) # Öne çıkan proje
  created_at: DateTime
  updated_at: DateTime
  started_at: DateTime
  completed_at: DateTime
}
```

**Proje Durumları (ProjectStatus Enum):**
- `PLANNING`: Planlama aşamasında
- `IN_PROGRESS`: Geliştirme devam ediyor
- `COMPLETED`: Proje tamamlandı
- `ON_HOLD`: Geliştirme durduruldu
- `CANCELLED`: Proje iptal edildi

**İlişkiler:**
- `category`: Proje kategorisi (Many-to-One)
- `creator`: Oluşturan kullanıcı (Many-to-One)

**Dosya**: `backend/models/projects.py`

---

### ProjectCategory (Proje Kategorisi)
```python
{
  id: Integer (Primary Key)
  name: String (Not Null)
  description: String
  icon: String # CSS class veya icon name
  created_at: DateTime
  updated_at: DateTime
}
```

**İlişkiler:**
- `projects`: Bu kategorideki projeler (One-to-Many)

**Örnekler**: Web Geliştirme, Mobil Uygulama, Yapay Zeka, Oyun Geliştirme, Veri Bilimi

**Dosya**: `backend/models/projects.py`

---

## 🔌 API Endpoints

### Authentication (Kimlik Doğrulama)

#### POST /auth/login
Kullanıcı girişi ve JWT token üretimi
```json
Request:
{
  "username": "user@example.com",
  "password": "password123"
}

Response:
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

#### POST /auth/register
Yeni kullanıcı kaydı (moderator için)
```json
Request:
{
  "email": "user@example.com",
  "full_name": "Ahmet Yılmaz",
  "password": "password123"
}

Response:
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "Ahmet Yılmaz",
  "role": "moderator",
  "status": "pending"
}
```

#### POST /auth/change-password
Şifre değiştirme (giriş yapmış kullanıcılar için)
```json
Request:
{
  "old_password": "oldpass123",
  "new_password": "newpass456"
}
```

**Dosya**: `backend/routers/auth.py`

---

### Events (Etkinlikler)

#### GET /api/events
Tüm aktif etkinlikleri listele
```json
Response:
[
  {
    "id": 1,
    "title": "Python Workshop",
    "slug": "python-workshop",
    "description": "Python temellerini öğrenin",
    "content": "Detaylı içerik...",
    "image_url": "/static/uploads/image.jpg",
    "location": "Mühendislik Fakültesi Amfi",
    "registration_link": "https://forms.google.com/...",
    "directions_link": "https://maps.google.com/...",
    "start_time": "2024-12-15T14:00:00",
    "end_time": "2024-12-15T17:00:00",
    "category_id": 1,
    "category": {
      "id": 1,
      "name": "Workshop"
    },
    "is_featured": true,
    "is_active": true,
    "created_at": "2024-11-20T10:00:00"
  }
]
```

#### GET /api/events/{slug}
Belirli bir etkinliğin detayını getir

#### POST /api/events
Yeni etkinlik oluştur (yetki gerekli)
```json
Request:
{
  "title": "Python Workshop",
  "description": "Python temellerini öğrenin",
  "content": "Detaylı içerik...",
  "location": "Mühendislik Fakültesi",
  "registration_link": "https://forms.google.com/...",
  "directions_link": "https://maps.google.com/...",
  "start_time": "2024-12-15T14:00:00+03:00",
  "category_id": 1,
  "image_url": "/static/uploads/image.jpg",
  "is_featured": false,
  "is_active": true
}
```

#### PUT /api/events/{event_id}
Etkinlik güncelleme (yetki gerekli)

#### DELETE /api/events/{event_id}
Etkinlik silme - Soft delete (yetki gerekli)

#### GET /api/events/categories
Tüm etkinlik kategorilerini listele

#### GET /api/events/featured
Öne çıkan etkinliği getir

**Dosya**: `backend/routers/events.py`

---

### Projects (Projeler)

#### GET /api/projects
Tüm aktif projeleri listele
```json
Response:
{
  "projects": [
    {
      "id": 1,
      "title": "MACS Website",
      "slug": "macs-website",
      "description": "Kulüp tanıtım sitesi",
      "content": "Detaylı açıklama...",
      "image_url": "/static/uploads/project.jpg",
      "technologies": "React, FastAPI, PostgreSQL",
      "github_url": "https://github.com/macs/website",
      "live_url": "https://macsclub.com.tr",
      "status": "IN_PROGRESS",
      "category_id": 1,
      "category": {
        "id": 1,
        "name": "Web Geliştirme"
      },
      "team_members": "Doğu Alagöz, Berke Zerelgil",
      "is_featured": true,
      "is_active": true,
      "created_at": "2024-10-01T10:00:00"
    }
  ]
}
```

#### GET /api/projects/{slug}
Belirli bir projenin detayını getir

#### POST /api/projects
Yeni proje oluştur (yetki gerekli)
```json
Request:
{
  "title": "AI Chatbot",
  "description": "Yapay zeka destekli chatbot",
  "content": "Detaylı açıklama...",
  "image_url": "/static/uploads/chatbot.jpg",
  "technologies": "Python, TensorFlow, Flask",
  "github_url": "https://github.com/macs/chatbot",
  "live_url": "https://chatbot.macsclub.com.tr",
  "status": "IN_PROGRESS",
  "category_id": 3,
  "team_members": "Efe Altın, Kerem Alagöz",
  "is_featured": false,
  "is_active": true
}
```

#### PUT /api/projects/{project_id}
Proje güncelleme (yetki gerekli)

#### DELETE /api/projects/{project_id}
Proje silme - Soft delete (yetki gerekli)

#### GET /api/projects/categories
Tüm proje kategorilerini listele

#### GET /api/projects/featured
Öne çıkan projeyi getir

**Dosya**: `backend/routers/projects.py`

---

### Users (Kullanıcılar)

#### GET /api/users
Tüm kullanıcıları listele (admin yetkisi gerekli)

#### GET /api/users/me
Giriş yapmış kullanıcının bilgilerini getir

#### POST /api/users
Yeni kullanıcı oluştur (admin yetkisi gerekli)

#### DELETE /api/users/{user_id}
Kullanıcı sil (admin yetkisi gerekli)

**Dosya**: `backend/routers/users.py`

---

### Uploads (Dosya Yükleme)

#### POST /api/upload
Görsel yükleme (yetki gerekli)
```json
Request:
FormData {
  file: [binary image data]
}

Response:
{
  "url": "/static/uploads/uuid-filename.jpg",
  "filename": "uuid-filename.jpg"
}
```

**Desteklenen Formatlar**: JPG, JPEG, PNG, GIF, WebP

**Dosya**: `backend/routers/uploads.py`

---

## 🔐 Güvenlik Özellikleri

### Authentication & Authorization
1. **JWT Token Based Authentication**
   - HS256 algoritması
   - Token süresi: 7 gün
   - Token'lar localStorage'da saklanıyor

2. **Password Security**
   - Bcrypt ile hash'leme
   - Minimum 6 karakter
   - Salt ile ekstra güvenlik

3. **Role-Based Access Control (RBAC)**
   - **Admin**: Tüm yetkiler + kullanıcı yönetimi
   - **Moderator**: İçerik ekleme/silme

4. **Rate Limiting**
   - Auth endpoints: 5 istek / dakika
   - Başarısız giriş: 5 deneme sonrası 15 dakika kilit

5. **Account Security**
   - Failed login tracking
   - Account locking mechanism
   - Last login tracking
   - Password change tracking

### API Security
1. **CORS Policy**
   - Sadece izin verilen origin'lerden istek kabul edilir
   - Production ve development URL'leri tanımlı

2. **Input Validation**
   - Pydantic ile tüm input'lar validate ediliyor
   - SQL injection koruması (ORM kullanımı)
   - XSS koruması

3. **Soft Delete**
   - Veriler kalıcı olarak silinmez, `is_deleted` flag'i kullanılır
   - Veri bütünlüğü korunur

4. **File Upload Security**
   - Dosya tipi kontrolü
   - Dosya boyutu limiti
   - UUID ile benzersiz dosya isimlendirme

---

## 📁 Proje Klasör Yapısı

```
macs-website/
│
├── frontend/                      # React Frontend
│   ├── public/                    # Statik dosyalar
│   │   ├── assets/
│   │   │   └── images/            # Görseller
│   │   ├── index.html
│   │   └── manifest.json
│   │
│   ├── src/
│   │   ├── api/                   # API client fonksiyonları
│   │   │   ├── auth.js            # Kimlik doğrulama API
│   │   │   ├── events.js          # Etkinlikler API
│   │   │   ├── projects.js        # Projeler API
│   │   │   ├── users.js           # Kullanıcılar API
│   │   │   └── http.js            # Axios base config
│   │   │
│   │   ├── components/
│   │   │   ├── admin/             # Admin panel bileşenleri
│   │   │   │   └── Sidebar.jsx    # Admin yan menü
│   │   │   │
│   │   │   ├── events/            # Etkinlik bileşenleri
│   │   │   │   └── EventCard.js
│   │   │   │
│   │   │   ├── projects/          # Proje bileşenleri
│   │   │   │   └── ProjectCard.js
│   │   │   │
│   │   │   ├── sections/          # Ana sayfa bölümleri
│   │   │   │   ├── HeroSection.jsx
│   │   │   │   ├── DashBoard.jsx
│   │   │   │   ├── EventsSection.jsx
│   │   │   │   ├── ProjectsSection.jsx
│   │   │   │   ├── AboutSection.jsx
│   │   │   │   └── TeamSection.jsx
│   │   │   │
│   │   │   ├── layout/            # Layout bileşenleri
│   │   │   │   ├── Navbar.jsx
│   │   │   │   └── Footer.jsx
│   │   │   │
│   │   │   ├── ui/                # UI bileşenleri
│   │   │   └── ProtectedRoute.js  # Route koruma
│   │   │
│   │   ├── contexts/
│   │   │   └── AuthContext.js     # Authentication context
│   │   │
│   │   ├── pages/                 # Sayfa bileşenleri
│   │   │   ├── admin/
│   │   │   │   ├── Dashboard.jsx  # Admin dashboard
│   │   │   │   ├── Content.jsx    # İçerik yönetimi
│   │   │   │   ├── Users.jsx      # Kullanıcı yönetimi
│   │   │   │   └── Logs.jsx       # Log sayfası
│   │   │   │
│   │   │   ├── Home.jsx           # Ana sayfa
│   │   │   ├── Events.jsx         # Etkinlikler listesi
│   │   │   ├── EventDetailPage.jsx
│   │   │   ├── Projects.jsx       # Projeler listesi
│   │   │   ├── ProjectDetailPage.jsx
│   │   │   ├── AdminPanel.jsx     # Admin panel router
│   │   │   ├── LoginPage.jsx      # Giriş sayfası
│   │   │   └── Page404.jsx        # 404 sayfası
│   │   │
│   │   ├── services/
│   │   │   └── api.js             # API service
│   │   │
│   │   ├── styles/                # CSS dosyaları
│   │   │   ├── components/        # Bileşen stilleri
│   │   │   ├── pages/             # Sayfa stilleri
│   │   │   ├── admin.css          # Admin panel stilleri
│   │   │   ├── admin-reset.css
│   │   │   ├── login.css
│   │   │   ├── main.css
│   │   │   └── global.css
│   │   │
│   │   ├── utils/
│   │   │   └── imageUtils.js      # Görsel yardımcı fonksiyonlar
│   │   │
│   │   ├── App.js                 # Ana uygulama
│   │   ├── index.js               # Giriş noktası
│   │   ├── index.css
│   │   └── analyticTracker.jsx    # Analytics
│   │
│   ├── package.json
│   ├── package-lock.json
│   └── vercel.json                # Vercel deployment config
│
├── backend/                       # FastAPI Backend
│   ├── alembic/                   # Database migrations
│   │   ├── versions/
│   │   ├── env.py
│   │   └── script.py.mako
│   │
│   ├── models/                    # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── users.py               # User model
│   │   ├── events.py              # Event & EventCategory models
│   │   └── projects.py            # Project & ProjectCategory models
│   │
│   ├── routers/                   # FastAPI routers
│   │   ├── __init__.py
│   │   ├── auth.py                # Authentication endpoints
│   │   ├── events.py              # Events endpoints
│   │   ├── projects.py            # Projects endpoints
│   │   ├── users.py               # Users endpoints
│   │   └── uploads.py             # File upload endpoints
│   │
│   ├── schemas/                   # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── users.py               # User schemas
│   │   ├── events.py              # Event schemas
│   │   └── projects.py            # Project schemas
│   │
│   ├── static/                    # Statik dosyalar
│   │   └── uploads/               # Yüklenen görseller
│   │
│   ├── main.py                    # FastAPI app
│   ├── database.py                # Database connection
│   ├── security.py                # Security helpers
│   ├── requirements.txt           # Python dependencies
│   └── alembic.ini                # Alembic config
│
├── docs/                          # Dokümantasyon
│   ├── prd.md                     # Product Requirements Document
│   ├── api-contract.md            # API Contract
│   ├── DOCUMENTATION.md           # Bu dosya
│   └── Home Page.jpg              # Tasarım referansı
│
├── CONTRIBUTING.md                # Katkı rehberi
└── README.md                      # Proje README
```

---

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
- **Frontend**: Node.js 18+, npm
- **Backend**: Python 3.11+, pip
- **Database**: PostgreSQL 14+

### Backend Kurulumu

```bash
# Backend dizinine git
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

# .env dosyası oluştur
cp .env.example .env
# .env dosyasını düzenle ve gerekli bilgileri gir

# Database migration'larını çalıştır
alembic upgrade head

# Sunucuyu başlat
uvicorn main:app --reload
```

Backend `http://localhost:8000` adresinde çalışacaktır.

**API Documentation**: `http://localhost:8000/docs` (Swagger UI)

### Frontend Kurulumu

```bash
# Frontend dizinine git
cd frontend

# Bağımlılıkları yükle
npm install

# .env dosyası oluştur
cp .env.example .env
# REACT_APP_API_BASE_URL değişkenini backend URL'si olarak ayarla

# Development sunucusunu başlat
npm start
```

Frontend `http://localhost:3000` adresinde çalışacaktır.

### Production Build

**Frontend:**
```bash
cd frontend
npm run build
```

Build dosyaları `build/` klasöründe oluşturulur ve Vercel'e deploy edilir.

**Backend:**
Railway platformuna otomatik olarak deploy edilir (git push ile).

---

## 🌐 Deployment

### Frontend (Vercel)
1. GitHub repository'ye push
2. Vercel otomatik olarak build ve deploy eder
3. Environment variables Vercel dashboard'dan ayarlanır
4. Custom domain: macsclub.com.tr

### Backend (Railway)
1. GitHub repository'ye push
2. Railway otomatik olarak deploy eder
3. Environment variables Railway dashboard'dan ayarlanır
4. Database Railway PostgreSQL olarak kullanılıyor
5. Persistent volume: /app/uploads (dosya yüklemeleri için)

### Environment Variables

**Frontend (.env):**
```
REACT_APP_API_BASE_URL=https://macs-backend-production.up.railway.app
```

**Backend (.env):**
```
DATABASE_URL=postgresql://user:password@host:port/database
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_DAYS=7
UPLOAD_DIR=/app/uploads
```

---

## 🧪 Testing

### Backend Testing
```bash
cd backend
pytest
```

### Frontend Testing
```bash
cd frontend
npm test
```

---

## 📊 Database Migrations

### Yeni Migration Oluşturma
```bash
cd backend
alembic revision --autogenerate -m "migration açıklaması"
```

### Migration Uygulama
```bash
alembic upgrade head
```

### Migration Geri Alma
```bash
alembic downgrade -1
```

---

## 🛠️ Geliştirme Notları

### Slug Oluşturma
- Backend'de `unidecode` kütüphanesi ile Türkçe karakterler dönüştürülüyor
- Başlıktan otomatik slug oluşturuluyor
- Benzersizlik kontrolü yapılıyor

### Tarih ve Saat Yönetimi
- Backend: UTC formatında saklanıyor
- Frontend: Türkiye saat dilimi (GMT+3) ile gösteriliyor
- Format: ISO 8601 (örn: "2024-12-15T14:00:00+03:00")

### Dosya Yükleme
- Görseller `/app/uploads` klasörüne kaydediliyor (Railway volume)
- UUID ile benzersiz dosya isimlendirme
- Desteklenen formatlar: JPG, JPEG, PNG, GIF, WebP
- Maksimum dosya boyutu: 10 MB

### Soft Delete
- Veriler kalıcı olarak silinmez
- `is_deleted=True` flag'i ile işaretlenir
- Veri bütünlüğü korunur

---

## 🐛 Bilinen Sorunlar ve Gelecek Geliştirmeler

### Mevcut Sorunlar
- Log sayfası henüz aktif değil
- Sosyal medya linkleri henüz bağlı değil
- Görsel optimizasyonu yapılmadı

### Gelecek Özellikler
1. **Log Sistemi**
   - Sistem logları
   - Kullanıcı aktiviteleri
   - API request/response logları

2. **Analytics**
   - Sayfa görüntüleme istatistikleri
   - Kullanıcı davranış analizi
   - Etkinlik katılım takibi

3. **SEO Optimizasyonu**
   - Meta tag'ler
   - Open Graph tags
   - Sitemap
   - robots.txt güncellemesi

4. **Gelişmiş Görsel Yönetimi**
   - Görsel optimizasyonu
   - CDN entegrasyonu
   - Görsel kırpma/düzenleme

5. **Email Bildirimleri**
   - Yeni etkinlik duyuruları
   - Proje güncellemeleri
   - Kullanıcı onay emaili

6. **Gelişmiş Arama**
   - Full-text search
   - Etiket bazlı arama
   - Filtreleme seçenekleri

7. **Dashboard İyileştirmeleri**
   - Grafik ve istatistikler
   - Real-time veri
   - Export özellikleri

---

## 👥 Ekip

**Proje Koordinatörü:** Doğu Alagöz  
**Kulüp Başkanı:** Berke Zerelgil

**Yönetim Kurulu:**
- Efe Altın - Başkan Yardımcısı
- Yiğit Yücel - Genel Koordinatör
- Kerem Alagöz - Proje Koordinatörü
- Hira Yılmaz - Denetim Koordinatörü
- Eren Alpaslan - Denetim Koordinatörü
- Leyla Mammadova - Kurumsal İletişim Koordinatörü
- Azra Üsküp - Genel Sekreter
- Ali Erdem Geçgel - Halkla İlişkiler
- Ahsen Aslan - Tasarım ve Sosyal Medya Koordinatörü
- Çağrı Arı - Tasarım ve Sosyal Medya Koordinatörü

---

## 📞 İletişim

- **Website**: [macsclub.com.tr](https://macsclub.com.tr)
- **Email**: info@macsclub.com.tr
- **Instagram**: @macs_esogu
- **GitHub**: github.com/macs-club

---

## 📄 Lisans

Bu proje MACS Kulübü tarafından geliştirilmiştir. Tüm hakları saklıdır.

---

## 📝 Değişiklik Geçmişi

**v1.0.0** (Kasım 2024)
- İlk production release
- Etkinlik ve proje yönetim sistemi
- Admin panel
- JWT authentication
- Responsive tasarım

---

**Son Güncelleme:** 24 Kasım 2024

