# 🎖️ Member Sistemi ve Proje Sayfası Güncelleme - Implementation Plan

## 📋 Genel Bakış

Bu döküman, MACS web sitesine **Member (Üye) Yönetim Sistemi** eklenmesi ve **Projeler Sayfası**nın güncellenmesi için detaylı implementation planını içerir.

### 🎯 Hedefler

1. **Member Sistemi**: Kulüp üyelerini yönetmek için ayrı bir sistem
2. **Proje-Member İlişkisi**: Projelerde ekip üyelerini member sistemi ile yönetme
3. **Leaderboard**: Üyelerin proje katkılarına göre sıralama
4. **Geriye Uyumluluk**: Eski projelerin bozulmaması
5. **Admin Panel**: Member yönetimi için arayüz

---

## 🏗️ Mimari Tasarım

### Database Yapısı

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Member    │◄───────►│ ProjectMember    │◄───────►│   Project   │
│             │  Many   │   (Join Table)   │  Many   │             │
└─────────────┘         └──────────────────┘         └─────────────┘
      │
      │ One-to-One (nullable, ilerde)
      ▼
┌─────────────┐
│    User     │
└─────────────┘
```

### Tablolar

#### 1. `members` (YENİ)

```
- id (PK)
- full_name (required)
- profile_image (nullable)
- is_active (default: True)
- user_id (FK, nullable) - İlerde kullanıcı girişi için
- created_at
- updated_at
```

#### 2. `project_members` (YENİ - Join Table)

```
- id (PK)
- project_id (FK → projects.id)
- member_id (FK → members.id)
- role (nullable) - "Lead Developer", "Designer", vb.
- contribution_count (default: 0) - Leaderboard için
- created_at
```

#### 3. `projects` (GÜNCELLEME)

```
Mevcut Alanlar:
- id, title, slug, description, content, image_url
- technologies, github_url, live_url
- status, category_id, created_by
- is_active, is_deleted, is_featured
- created_at, updated_at, started_at, completed_at

Deprecated Alan:
- team_members (String) → Eski format, kalsın ama kullanılmasın

Yeni Alanlar:
- project_type (Enum) → "DEVELOPED_BY_MACS", "SUPPORTED_BY_MACS", "MEMBER_SHOWCASE"

Yeni İlişki:
- member_relationships → Many-to-Many via ProjectMember
```

---

## 📁 Dosya Yapısı

### Backend (Yeni Dosyalar)

```
backend/
├── models/
│   ├── members.py              (YENİ)
│   ├── project_members.py      (YENİ)
│   ├── projects.py             (GÜNCELLEME)
│   └── __init__.py             (GÜNCELLEME)
│
├── schemas/
│   ├── members.py              (YENİ)
│   ├── project_members.py      (YENİ)
│   ├── projects.py             (GÜNCELLEME)
│   └── __init__.py             (GÜNCELLEME)
│
├── routers/
│   ├── members.py              (YENİ)
│   ├── projects.py             (GÜNCELLEME)
│   └── __init__.py             (GÜNCELLEME)
│
├── alembic/versions/
│   └── xxxx_add_member_system.py (YENİ - Migration)
│
└── main.py                     (GÜNCELLEME - Router ekle)
```

### Frontend (Yeni Dosyalar)

```
frontend/src/
├── features/
│   └── admin/
│       ├── pages/
│       │   ├── Members.jsx           (YENİ)
│       │   ├── MemberForm.jsx        (YENİ)
│       │   └── Content.jsx           (GÜNCELLEME)
│       │
│       └── components/
│           ├── MemberSelector.jsx    (YENİ)
│           └── Sidebar.jsx           (GÜNCELLEME)
│
├── shared/
│   └── components/
│       └── ui/
│           └── MemberAvatar.jsx      (YENİ)
│
└── api/
    └── members.js                    (YENİ)
```

---

## 🚀 Implementation Adımları

### **FAZ 1: Backend - Database Models**

#### Adım 1.1: Member Model Oluştur

**Dosya:** `backend/models/members.py`

**İçerik:**

- Member class tanımı
- Alanlar: id, full_name, profile_image, is_active, user_id
- Relationship: project_memberships
- Timestamps: created_at, updated_at

#### Adım 1.2: ProjectMember Model Oluştur

**Dosya:** `backend/models/project_members.py`

**İçerik:**

- ProjectMember class tanımı (Join table)
- Alanlar: id, project_id, member_id, role, contribution_count
- Relationships: project, member
- Timestamp: created_at

#### Adım 1.3: Project Model Güncelle

**Dosya:** `backend/models/projects.py`

**Değişiklikler:**

- ProjectType enum ekle (DEVELOPED_BY_MACS, SUPPORTED_BY_MACS, MEMBER_SHOWCASE)
- project_type alanı ekle
- member_relationships relationship ekle
- team_members alanını koru (deprecated)

#### Adım 1.4: Models **init**.py Güncelle

**Dosya:** `backend/models/__init__.py`

**Değişiklikler:**

- Member import ekle
- ProjectMember import ekle
- ProjectType import ekle
- **all** listesine ekle

---

### **FAZ 2: Backend - Pydantic Schemas**

#### Adım 2.1: Member Schemas Oluştur

**Dosya:** `backend/schemas/members.py`

**Schemas:**

- MemberBase
- MemberCreate
- MemberUpdate
- MemberResponse
- MemberWithStats (leaderboard için)

#### Adım 2.2: ProjectMember Schemas Oluştur

**Dosya:** `backend/schemas/project_members.py`

**Schemas:**

- ProjectMemberBase
- ProjectMemberCreate
- ProjectMemberResponse

#### Adım 2.3: Project Schemas Güncelle

**Dosya:** `backend/schemas/projects.py`

**Değişiklikler:**

- ProjectCreate'e member_ids ekle (List[dict])
- ProjectResponse'a members ekle (List[MemberResponse])
- team_members'ı opsiyonel yap (backward compatibility)

#### Adım 2.4: Schemas **init**.py Güncelle

**Dosya:** `backend/schemas/__init__.py`

**Değişiklikler:**

- Member schemas import ekle
- ProjectMember schemas import ekle
- **all** listesine ekle

---

### **FAZ 3: Backend - Database Migration**

#### Adım 3.1: Alembic Migration Oluştur

**Komut:**

```bash
cd backend
alembic revision --autogenerate -m "Add Member and ProjectMember models"
```

#### Adım 3.2: Migration Dosyasını İncele

**Dosya:** `backend/alembic/versions/xxxx_add_member_system.py`

**Kontrol Et:**

- members tablosu oluşturuluyor mu?
- project_members tablosu oluşturuluyor mu?
- projects tablosuna project_type ekleniyor mu?
- Foreign key'ler doğru mu?

#### Adım 3.3: Migration Çalıştır

**Komut:**

```bash
alembic upgrade head
```

#### Adım 3.4: Database Doğrula

**Kontrol:**

- PostgreSQL'de tabloları kontrol et
- İlişkilerin doğru kurulduğunu doğrula

---

### **FAZ 4: Backend - API Endpoints**

#### Adım 4.1: Member Router Oluştur

**Dosya:** `backend/routers/members.py`

**Endpoints:**

- `GET /api/members` - Tüm member'ları listele
- `GET /api/members/{id}` - Tek member getir
- `POST /api/members` - Yeni member oluştur (auth)
- `PUT /api/members/{id}` - Member güncelle (auth)
- `DELETE /api/members/{id}` - Member sil - soft delete (auth)
- `GET /api/members/leaderboard` - Leaderboard

**Özellikler:**

- Authentication kontrolü (get_current_user)
- Pagination desteği (opsiyonel)
- Filtering (is_active)

#### Adım 4.2: Projects Router Güncelle

**Dosya:** `backend/routers/projects.py`

**Değişiklikler:**

- `POST /api/projects` endpoint'ini güncelle:
  - member_ids parametresini kabul et
  - ProjectMember ilişkilerini oluştur
  - team_members'ı deprecated yap
- `GET /api/projects` endpoint'ini güncelle:
  - members ilişkisini yükle (eager loading)
  - Response'da members listesi döndür
- `PUT /api/projects/{id}` endpoint'ini güncelle:
  - member_ids güncellemesini destekle
  - Eski ilişkileri sil, yenilerini ekle

#### Adım 4.3: Routers **init**.py Güncelle

**Dosya:** `backend/routers/__init__.py`

**Değişiklikler:**

- members_router import ekle
- Export listesine ekle

#### Adım 4.4: main.py Güncelle

**Dosya:** `backend/main.py`

**Değişiklikler:**

- members_router import ekle
- app.include_router(members_router) ekle

---

### **FAZ 5: Backend - Test**

#### Adım 5.1: API Test (Postman/Thunder Client)

**Test Senaryoları:**

1. **Member Oluşturma:**

```
POST /api/members
Authorization: Bearer {token}
Body: {
  "full_name": "Doğu Alagöz",
  "profile_image": "/uploads/dogu.jpg"
}
```

2. **Member Listesi:**

```
GET /api/members
Response: [
  {
    "id": 1,
    "full_name": "Doğu Alagöz",
    "profile_image": "/uploads/dogu.jpg",
    "is_active": true
  }
]
```

3. **Proje Oluşturma (Yeni Sistem):**

```
POST /api/projects
Authorization: Bearer {token}
Body: {
  "title": "Test Project",
  "description": "...",
  "member_ids": [
    {"id": 1, "role": "Lead Developer", "contribution_count": 150}
  ]
}
```

4. **Proje Getirme (Members ile):**

```
GET /api/projects/test-project
Response: {
  "id": 1,
  "title": "Test Project",
  "members": [
    {
      "id": 1,
      "full_name": "Doğu Alagöz",
      "profile_image": "/uploads/dogu.jpg"
    }
  ],
  "team_members": null
}
```

5. **Leaderboard:**

```
GET /api/members/leaderboard?limit=10
Response: [
  {
    "id": 1,
    "full_name": "Doğu Alagöz",
    "project_count": 5,
    "total_contributions": 750
  }
]
```

#### Adım 5.2: Database Kontrol

- project_members tablosunda ilişkilerin doğru kaydedildiğini kontrol et
- Cascade delete çalışıyor mu test et

---

### **FAZ 6: Frontend - API Client**

#### Adım 6.1: Members API Client Oluştur

**Dosya:** `frontend/src/api/members.js`

**Fonksiyonlar:**

- `getMembers()` - Tüm member'ları getir
- `getMember(id)` - Tek member getir
- `createMember(data)` - Yeni member oluştur
- `updateMember(id, data)` - Member güncelle
- `deleteMember(id)` - Member sil
- `getLeaderboard(limit)` - Leaderboard getir

---

### **FAZ 7: Frontend - Admin Panel (Member Yönetimi)**

#### Adım 7.1: Members Sayfası Oluştur

**Dosya:** `frontend/src/features/admin/pages/Members.jsx`

**Özellikler:**

- Member listesi (tablo formatında)
- Arama/filtreleme
- Yeni üye ekle butonu
- Düzenle/sil butonları
- Proje sayısı gösterimi

**UI Bileşenleri:**

- Tablo (profil resmi, ad soyad, proje sayısı, aksiyonlar)
- Arama input
- Pagination (opsiyonel)

#### Adım 7.2: MemberForm Sayfası Oluştur

**Dosya:** `frontend/src/features/admin/pages/MemberForm.jsx`

**Özellikler:**

- Ad soyad input
- Profil fotoğrafı yükleme (önizleme ile)
- Aktif/pasif checkbox
- Form validasyonu
- Kaydet/iptal butonları

**Kullanım:**

- `/admin/members/new` - Yeni üye ekle
- `/admin/members/:id/edit` - Üye düzenle

#### Adım 7.3: Sidebar Güncelle

**Dosya:** `frontend/src/features/admin/components/Sidebar.jsx`

**Değişiklikler:**

- "Üyeler" menü öğesi ekle
- İkon: 🎖️ veya 👥
- Link: `/admin/members`

#### Adım 7.4: Admin Routes Güncelle

**Dosya:** `frontend/src/features/admin/pages/AdminPanel.jsx`

**Değişiklikler:**

```jsx
<Route path="members" element={<Members />} />
<Route path="members/new" element={<MemberForm />} />
<Route path="members/:id/edit" element={<MemberForm />} />
```

---

### **FAZ 8: Frontend - Proje Formu Güncelleme**

#### Adım 8.1: MemberSelector Component Oluştur

**Dosya:** `frontend/src/features/admin/components/MemberSelector.jsx`

**Özellikler:**

- Dropdown/multi-select
- Member arama
- Seçilen member'ları gösterme
- Her member için:
  - Profil resmi
  - Ad soyad
  - Rol input (opsiyonel)
  - Katkı sayısı input
  - Kaldır butonu
- "Hızlıca Üye Ekle" butonu (modal açar)

**Props:**

- `selectedMembers` - Seçili member'lar
- `onChange` - Member değişikliği callback

#### Adım 8.2: Content Sayfası Güncelle

**Dosya:** `frontend/src/features/admin/pages/Content.jsx`

**Değişiklikler:**

- Proje formuna MemberSelector ekle
- team_members text input'unu KALDIR
- Form submit'te member_ids gönder
- Proje düzenleme: Mevcut member'ları yükle

**Form Data Yapısı:**

```javascript
{
  title: "...",
  description: "...",
  member_ids: [
    {id: 1, role: "Lead Developer", contribution_count: 150},
    {id: 2, role: "Designer", contribution_count: 80}
  ]
}
```

---

### **FAZ 9: Frontend - Public Pages (Gösterim)**

#### Adım 9.1: ProjectCard Component Güncelle

**Dosya:** `frontend/src/features/projects/components/ProjectCard.jsx`

**Değişiklikler:**

- Member avatarları göster (yeni sistem varsa)
- Fallback: team_members string göster (eski sistem)

**UI:**

```jsx
{
  /* YENİ SİSTEM */
}
{
  project.members && project.members.length > 0 ? (
    <div className="member-avatars">
      {project.members.map((member) => (
        <img
          src={member.profile_image}
          alt={member.full_name}
          title={member.full_name}
        />
      ))}
    </div>
  ) : (
    /* ESKİ SİSTEM (FALLBACK) */
    project.team_members && <p>👥 {project.team_members}</p>
  );
}
```

#### Adım 9.2: ProjectDetailPage Güncelle

**Dosya:** `frontend/src/features/projects/pages/ProjectDetailPage.jsx`

**Değişiklikler:**

- Ekip üyeleri bölümü ekle
- Her member için:
  - Profil resmi
  - Ad soyad
  - Rol (varsa)
  - Katkı sayısı (varsa)

#### Adım 9.3: MemberAvatar Component Oluştur (Opsiyonel)

**Dosya:** `frontend/src/shared/components/ui/MemberAvatar.jsx`

**Özellikler:**

- Profil resmi gösterimi
- Placeholder (resim yoksa)
- Tooltip (hover'da ad soyad)
- Boyut varyantları (small, medium, large)

---

### **FAZ 10: Frontend - Leaderboard (İlerde)**

#### Adım 10.1: Leaderboard Sayfası (Opsiyonel)

**Dosya:** `frontend/src/features/members/pages/Leaderboard.jsx`

**Özellikler:**

- En çok katkı yapan üyeler
- Sıralama (contribution_count)
- Profil resimleri
- Proje sayısı
- Toplam katkı

**Route:** `/leaderboard` (public)

---

## 🔄 Geriye Uyumluluk Stratejisi

### Backend

1. **team_members alanı korunur:**
   - Deprecated olarak işaretlenir
   - Eski projeler için veri kaybı olmaz
   - Yeni projeler NULL bırakır

2. **API Response:**
   - Her iki alanı da döndür (members + team_members)
   - Frontend hangisini kullanacağına karar verir

3. **Proje Güncelleme:**
   - member_ids gönderilirse → Yeni sistem kullanılır
   - team_members gönderilirse → Eski sistem kullanılır (deprecated)

### Frontend

1. **Gösterim Önceliği:**

   ```
   if (project.members && project.members.length > 0) {
     // Yeni sistem: Avatar'ları göster
   } else if (project.team_members) {
     // Eski sistem: String göster
   } else {
     // Hiçbiri yok: "Ekip bilgisi yok"
   }
   ```

2. **Proje Formu:**
   - Sadece yeni sistem (MemberSelector)
   - Eski team_members input'u kaldırılır
   - Eski projeler güncellenirken yeni sisteme geçer

---

## 📊 Veri Akışı

### Yeni Proje Ekleme

```
1. Admin Panel → İçerik Yönetimi → Proje Ekle
2. MemberSelector'dan üyeleri seç
3. Her üye için rol ve katkı belirle
4. Form submit:
   POST /api/projects
   {
     "title": "...",
     "member_ids": [
       {"id": 1, "role": "Lead Dev", "contribution_count": 150}
     ]
   }
5. Backend:
   - Project oluştur
   - ProjectMember ilişkileri oluştur
   - Response döndür
6. Frontend:
   - Success mesajı göster
   - Proje listesine yönlendir
```

### Eski Proje Güncelleme

```
1. Admin Panel → İçerik Yönetimi → Proje Düzenle
2. Proje yüklenir:
   - members varsa → MemberSelector'a yükle
   - team_members varsa → String göster (fallback)
3. MemberSelector'dan üyeleri güncelle
4. Form submit:
   PUT /api/projects/{id}
   {
     "member_ids": [...]
   }
5. Backend:
   - Eski ProjectMember ilişkilerini sil
   - Yeni ilişkileri oluştur
   - team_members → NULL yap
6. Frontend:
   - Success mesajı
   - Artık yeni sistemde!
```

---

## ✅ Test Checklist

### Backend Tests

- [ ] Member CRUD işlemleri çalışıyor
- [ ] ProjectMember ilişkileri doğru kuruluyor
- [ ] Proje oluşturma (yeni sistem) çalışıyor
- [ ] Proje güncelleme (member_ids) çalışıyor
- [ ] Leaderboard endpoint doğru sıralıyor
- [ ] Soft delete çalışıyor
- [ ] Authentication kontrolleri çalışıyor
- [ ] Geriye uyumluluk korunuyor (team_members)

### Frontend Tests

- [ ] Member listesi görüntüleniyor
- [ ] Yeni member ekleme çalışıyor
- [ ] Member düzenleme çalışıyor
- [ ] Member silme çalışıyor
- [ ] MemberSelector dropdown çalışıyor
- [ ] Proje formunda member seçimi çalışıyor
- [ ] Proje kartlarında avatar'lar görünüyor
- [ ] Eski projeler fallback ile görünüyor
- [ ] Proje detay sayfasında ekip gösteriliyor

---

## 🚨 Dikkat Edilmesi Gerekenler

### Backend

1. **Foreign Key Constraints:**
   - Member silindiğinde ProjectMember ilişkileri ne olacak?
   - Öneri: Soft delete kullan (is_active = False)

2. **Performance:**
   - Member listesi büyüdüğünde pagination ekle
   - Eager loading kullan (N+1 query problemi)

3. **Validation:**
   - Member adı boş olamaz
   - Profil resmi formatı kontrol et

### Frontend

1. **UX:**
   - Member seçimi kolay olmalı (arama özelliği)
   - Profil resmi önizlemesi olmalı
   - Loading states ekle

2. **Error Handling:**
   - API hataları kullanıcıya gösterilmeli
   - Form validasyonu client-side de olmalı

3. **Responsive:**
   - Mobilde member avatarları küçülmeli
   - Dropdown mobilde kullanılabilir olmalı

---

## 📅 Tahmini Süre

| Faz | Açıklama                      | Süre   |
| --- | ----------------------------- | ------ |
| 1   | Backend Models                | 1 saat |
| 2   | Backend Schemas               | 30 dk  |
| 3   | Database Migration            | 15 dk  |
| 4   | Backend API                   | 2 saat |
| 5   | Backend Test                  | 30 dk  |
| 6   | Frontend API Client           | 30 dk  |
| 7   | Admin Panel (Member Yönetimi) | 3 saat |
| 8   | Proje Formu Güncelleme        | 2 saat |
| 9   | Public Pages Güncelleme       | 1 saat |
| 10  | Test & Bug Fix                | 1 saat |

**Toplam:** ~12 saat

---

## 🎯 Sonraki Adımlar (İlerde)

1. **User-Member Bağlantısı:**
   - Kullanıcı girişi eklendiğinde
   - Member'ı User'a bağla (user_id)
   - Profil sayfası

2. **Gelişmiş Leaderboard:**
   - Haftalık/aylık/yıllık sıralama
   - Kategori bazlı sıralama
   - Rozet sistemi

3. **Member Profil Sayfası:**
   - Public profil sayfası
   - Katıldığı projeler
   - İstatistikler
   - Bio, sosyal medya linkleri

4. **Proje Tipleri:**
   - DEVELOPED_BY_MACS
   - SUPPORTED_BY_MACS
   - MEMBER_SHOWCASE
   - Her tip için farklı gösterim

5. **Bildirimler:**
   - Yeni proje eklendi
   - Member bir projeye eklendi
   - Leaderboard değişimi

---

## 📝 Notlar

- Bu döküman adım adım takip edilebilir
- Her adım tamamlandıkça test edilmeli
- Git commit'leri düzenli atılmalı
- Her faz sonunda code review yapılmalı

---

**Hazırlayan:** Antigravity AI  
**Tarih:** 18 Ocak 2026  
**Versiyon:** 1.0
