# 🎖️ Member Sistemi - Implementation Plan

## 📋 Genel Bakış

MACS web sitesine **Member (Üye) Yönetim Sistemi** eklenmesi ve **Projeler Sayfası** güncelleme planı.

### 🎯 Hedefler

- ✅ Member sistemi (kulüp üyelerini yönetme)
- ✅ Proje-Member ilişkisi (Many-to-Many)
- ✅ Leaderboard (katkı sıralaması)
- ✅ Geriye uyumluluk (eski projeler bozulmaz)
- ✅ Admin panel (member yönetimi)

---

## 🏗️ Database Yapısı

### Tablolar

#### `members` (YENİ)

```
- id (PK)
- full_name (required)
- profile_image (nullable)
- is_active (default: True)
- user_id (FK, nullable) - İlerde user girişi için
- created_at, updated_at
```

#### `project_members` (YENİ - Join Table)

```
- id (PK)
- project_id (FK → projects.id)
- member_id (FK → members.id)
- role (nullable) - "Lead Developer", "Designer", vb.
- contribution_count (default: 0) - Leaderboard için
- created_at
```

#### `projects` (GÜNCELLEME)

```
Yeni Alanlar:
- project_type (Enum) → "DEVELOPED_BY_MACS", "SUPPORTED_BY_MACS", "MEMBER_SHOWCASE"

Yeni İlişki:
- member_relationships → Many-to-Many via ProjectMember

Deprecated (Kalsın):
- team_members (String) → Eski format, geriye uyumluluk için
```

### İlişki Diyagramı

```
Member ←→ ProjectMember ←→ Project
 (1)        (Many)          (1)

Member → User (One-to-One, nullable, ilerde)
```

---

## 📁 Dosya Yapısı

### Backend (Yeni/Güncellenecek Dosyalar)

```
backend/
├── models/
│   ├── members.py              ✨ YENİ (Member + ProjectMember)
│   ├── projects.py             🔄 GÜNCELLEME (ProjectType ekle)
│   └── __init__.py             🔄 GÜNCELLEME
│
├── schemas/
│   ├── members.py              ✨ YENİ
│   ├── projects.py             🔄 GÜNCELLEME
│   └── __init__.py             🔄 GÜNCELLEME
│
├── routers/
│   ├── members.py              ✨ YENİ
│   ├── projects.py             🔄 GÜNCELLEME
│   └── __init__.py             🔄 GÜNCELLEME
│
├── alembic/versions/
│   └── xxxx_add_members.py     ✨ YENİ (Migration)
│
└── main.py                     🔄 GÜNCELLEME
```

### Frontend (Yeni/Güncellenecek Dosyalar)

```
frontend/src/
├── features/admin/
│   ├── pages/
│   │   ├── Members.jsx         ✨ YENİ (Üye listesi)
│   │   ├── MemberForm.jsx      ✨ YENİ (Üye ekle/düzenle)
│   │   └── Content.jsx         🔄 GÜNCELLEME (Proje formu)
│   │
│   └── components/
│       ├── MemberSelector.jsx  ✨ YENİ (Dropdown)
│       └── Sidebar.jsx         🔄 GÜNCELLEME
│
├── features/projects/
│   ├── components/
│   │   └── ProjectCard.jsx     🔄 GÜNCELLEME (Avatar göster)
│   └── pages/
│       └── ProjectDetailPage.jsx 🔄 GÜNCELLEME
│
└── api/
    └── members.js              ✨ YENİ
```

---

## 🚀 Implementation Adımları

### **FAZ 1: Backend Models & Migration** (1.5 saat)

#### 1.1 Member Model Oluştur

**Dosya:** `backend/models/members.py` (YENİ)

**İçerik:**

- `Member` class (id, full_name, profile_image, is_active, user_id)
- `ProjectMember` class (id, project_id, member_id, role, contribution_count)
- Relationships tanımla

#### 1.2 Project Model Güncelle

**Dosya:** `backend/models/projects.py`

**Değişiklikler:**

- `ProjectType` enum ekle
- `project_type` alanı ekle
- `member_relationships` relationship ekle
- `team_members` kalsın (deprecated)

#### 1.3 Models **init**.py Güncelle

**Dosya:** `backend/models/__init__.py`

**Değişiklikler:**

- `Member`, `ProjectMember`, `ProjectType` import ekle

#### 1.4 Migration Oluştur ve Çalıştır

```bash
cd backend
alembic revision --autogenerate -m "Add Member and ProjectMember models"
alembic upgrade head
```

---

### **FAZ 2: Backend Schemas** (30 dk)

#### 2.1 Member Schemas

**Dosya:** `backend/schemas/members.py` (YENİ)

**Schemas:**

- `MemberBase`, `MemberCreate`, `MemberUpdate`, `MemberResponse`
- `MemberWithStats` (leaderboard için)

#### 2.2 Project Schemas Güncelle

**Dosya:** `backend/schemas/projects.py`

**Değişiklikler:**

- `ProjectCreate`: `member_ids: List[dict]` ekle
- `ProjectResponse`: `members: List[MemberResponse]` ekle

#### 2.3 Schemas **init**.py Güncelle

---

### **FAZ 3: Backend API** (2 saat)

#### 3.1 Member Router

**Dosya:** `backend/routers/members.py` (YENİ)

**Endpoints:**

```
GET    /api/members              → Tüm member'lar
GET    /api/members/{id}         → Tek member
POST   /api/members              → Yeni member (auth)
PUT    /api/members/{id}         → Güncelle (auth)
DELETE /api/members/{id}         → Sil (auth)
GET    /api/members/leaderboard  → Leaderboard
```

#### 3.2 Projects Router Güncelle

**Dosya:** `backend/routers/projects.py`

**Değişiklikler:**

- `POST /api/projects`: `member_ids` kabul et, `ProjectMember` ilişkileri oluştur
- `GET /api/projects`: `members` ilişkisini yükle
- `PUT /api/projects/{id}`: Member güncelleme desteği

#### 3.3 main.py Güncelle

- `members_router` import ve include et

---

### **FAZ 4: Backend Test** (30 dk)

**Test Senaryoları:**

1. Member oluşturma
2. Member listesi
3. Proje oluşturma (member_ids ile)
4. Proje getirme (members ile)
5. Leaderboard

---

### **FAZ 5: Frontend API Client** (30 dk)

**Dosya:** `frontend/src/api/members.js` (YENİ)

**Fonksiyonlar:**

- `getMembers()`, `getMember(id)`, `createMember(data)`
- `updateMember(id, data)`, `deleteMember(id)`
- `getLeaderboard(limit)`

---

### **FAZ 6: Admin Panel - Member Yönetimi** (3 saat)

#### 6.1 Members Sayfası

**Dosya:** `frontend/src/features/admin/pages/Members.jsx` (YENİ)

**Özellikler:**

- Member listesi (tablo)
- Arama/filtreleme
- Yeni üye ekle butonu
- Düzenle/sil aksiyonları

#### 6.2 MemberForm Sayfası

**Dosya:** `frontend/src/features/admin/pages/MemberForm.jsx` (YENİ)

**Özellikler:**

- Ad soyad input
- Profil fotoğrafı yükleme (önizleme)
- Form validasyonu

#### 6.3 Sidebar Güncelle

- "Üyeler" menü öğesi ekle (🎖️)

#### 6.4 Routes Güncelle

```jsx
<Route path="members" element={<Members />} />
<Route path="members/new" element={<MemberForm />} />
<Route path="members/:id/edit" element={<MemberForm />} />
```

---

### **FAZ 7: Admin Panel - Proje Formu** (2 saat)

#### 7.1 MemberSelector Component

**Dosya:** `frontend/src/features/admin/components/MemberSelector.jsx` (YENİ)

**Özellikler:**

- Multi-select dropdown
- Seçilen member'lar için rol ve katkı input
- "Hızlıca Üye Ekle" butonu (opsiyonel)

#### 7.2 Content Sayfası Güncelle

**Dosya:** `frontend/src/features/admin/pages/Content.jsx`

**Değişiklikler:**

- Proje formuna `MemberSelector` ekle
- `team_members` text input'unu KALDIR
- Form submit'te `member_ids` gönder

---

### **FAZ 8: Public Pages - Gösterim** (1 saat)

#### 8.1 ProjectCard Güncelle

**Dosya:** `frontend/src/features/projects/components/ProjectCard.jsx`

**Mantık:**

```jsx
// Önce yeni sisteme bak
if (project.members && project.members.length > 0) {
  // Avatar'ları göster
} else if (project.team_members) {
  // Eski string göster (fallback)
} else {
  // "Ekip bilgisi yok"
}
```

#### 8.2 ProjectDetailPage Güncelle

- Ekip üyeleri bölümü ekle (profil resmi, ad, rol, katkı)

---

## 🔄 Geriye Uyumluluk

### Backend

- `team_members` alanı korunur (deprecated)
- API her iki alanı da döndürür (`members` + `team_members`)
- Yeni projeler `member_ids` kullanır, `team_members` NULL

### Frontend

- Önce `members` kontrol et → Varsa avatar göster
- Yoksa `team_members` göster → String format
- Proje güncellenirken yeni sisteme geçer

---

## 📊 Veri Akışı

### Yeni Proje Ekleme

```
1. Admin Panel → Proje Ekle
2. MemberSelector'dan üyeleri seç
3. POST /api/projects { member_ids: [...] }
4. Backend: Project + ProjectMember ilişkileri oluştur
5. Success!
```

### Eski Proje Güncelleme

```
1. Admin Panel → Proje Düzenle
2. Mevcut member'lar yüklenir (varsa)
3. MemberSelector'dan güncelle
4. PUT /api/projects/{id} { member_ids: [...] }
5. Backend: Eski ilişkileri sil, yenilerini oluştur
6. team_members → NULL
```

---

## ✅ Test Checklist

### Backend

- [ ] Member CRUD çalışıyor
- [ ] ProjectMember ilişkileri doğru
- [ ] Proje oluşturma (member_ids)
- [ ] Leaderboard endpoint
- [ ] Geriye uyumluluk (team_members)

### Frontend

- [ ] Member listesi görünüyor
- [ ] Member ekleme/düzenleme/silme
- [ ] MemberSelector çalışıyor
- [ ] Proje formunda member seçimi
- [ ] Avatar'lar görünüyor
- [ ] Eski projeler fallback ile gösteriliyor

---

## Tahmini Süre

| Faz                        | Süre     |
| -------------------------- | -------- |
| Backend Models & Migration | 1.5 saat |
| Backend Schemas            | 30 dk    |
| Backend API                | 2 saat   |
| Backend Test               | 30 dk    |
| Frontend API Client        | 30 dk    |
| Admin - Member Yönetimi    | 3 saat   |
| Admin - Proje Formu        | 2 saat   |
| Public Pages               | 1 saat   |
| Test & Bug Fix             | 1 saat   |

**Toplam:** ~12 saat

---

## 🎯 Sonraki Adımlar (İlerde)

- User-Member bağlantısı (kullanıcı girişi)
- Gelişmiş leaderboard (haftalık/aylık)
- Member profil sayfası (public)
- Proje tipleri gösterimi (DEVELOPED_BY_MACS, vb.)
- Bildirimler (member bir projeye eklendi)

---

**Hazırlayan:** Antigravity AI  
**Tarih:** 18 Ocak 2026  
**Versiyon:** 2.0 (Sadeleştirilmiş)
