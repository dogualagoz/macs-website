# MACS API Sözleşmesi v1.0

## 📌 Genel Bilgiler

### Base URL
```
Development: http://localhost:8000/api
```

### 🔐 Kimlik Doğrulama
- Tüm istekler için (login ve register hariç) JWT token gereklidir
- Token formatı: `Bearer <token>`
- Token'lar 30 dakika geçerlidir
- Token süresi dolduğunda yeniden login gerekir

### 📝 İstek Formatı
- Content-Type: `application/json`
- Karakter kodlaması: `UTF-8`
- Date formatı: `ISO 8601` (örn: "2024-03-15T14:30:00Z")

### ⚠️ Hata Kodları
| Kod | Açıklama | Örnek Senaryo |
|-----|-----------|---------------|
| 400 | Bad Request | Eksik/hatalı veri gönderimi |
| 401 | Unauthorized | Token eksik/geçersiz |
| 403 | Forbidden | Yetkisiz erişim denemesi |
| 404 | Not Found | Kaynak bulunamadı |
| 429 | Too Many Requests | Rate limit aşıldı |
| 500 | Internal Server Error | Sunucu hatası |

## 🔑 Kimlik Doğrulama (Authentication)

### Kayıt Ol (Register)
```http
POST /auth/register
```

**İstek (Request):**
```json
{
    "email": "string",
    "password": "string (min. 6 karakter)",
    "full_name": "string"
}
```

**Başarılı Yanıt (201 Created):**
```json
{
    "id": "integer",
    "email": "string",
    "full_name": "string",
    "status": "string",
    "role": "string",
    "is_active": "boolean"
}
```

**Hata Durumları:**
| Kod | Neden | Çözüm |
|-----|-------|-------|
| 400 | Şifre çok kısa | Min. 6 karakter kullan |
| 400 | Email formatı geçersiz | Geçerli email adresi gir |
| 409 | Email zaten kayıtlı | Farklı email kullan |

**Rate Limit:** 5 istek/dakika

### Admin Kaydı
```http
POST /auth/register/admin
```

**İstek:**
```json
{
    "email": "string",
    "password": "string (min. 6 karakter)",
    "full_name": "string",
    "admin_secret": "string"
}
```

**Rate Limit:** 3 istek/dakika

### Giriş Yap (Login)
```http
POST /auth/login
```

**İstek:**
```json
{
    "username": "string (email)",
    "password": "string"
}
```

**Başarılı Yanıt (200 OK):**
```json
{
    "access_token": "string",
    "token_type": "bearer"
}
```

**Hata Durumları:**
| Kod | Neden | Bekleme Süresi |
|-----|-------|----------------|
| 400 | Yanlış email/şifre | - |
| 401 | Hesap aktif değil | Admin onayı gerekli |
| 401 | Hesap kilitli | 15 dakika |
| 429 | Çok fazla deneme | Rate limit: 10/dakika |

## 👤 Kullanıcı İşlemleri (Users)

### Profil Bilgilerini Getir
```http
GET /users/me
```

**Header:**
```
Authorization: Bearer <token>
```

**Başarılı Yanıt (200 OK):**
```json
{
    "id": "integer",
    "email": "string",
    "full_name": "string",
    "status": "string",
    "role": "string",
    "is_active": "boolean",
    "last_login": "datetime",
    "failed_login_attempts": "integer",
    "password_changed_at": "datetime"
}
```

**Rate Limit:** 10 istek/dakika

### Profil Güncelle
```http
PUT /users/me
```

**İstek:**
```json
{
    "full_name": "string"
}
```

**Rate Limit:** 5 istek/dakika

### Şifre Değiştir
```http
POST /users/me/change-password
```

**İstek:**
```json
{
    "current_password": "string",
    "new_password": "string",
    "confirm_password": "string"
}
```

**Hata Durumları:**
| Kod | Neden |
|-----|--------|
| 400 | Mevcut şifre yanlış |
| 400 | Yeni şifre gereksinimleri karşılamıyor |
| 400 | Şifreler eşleşmiyor |

**Rate Limit:** 3 istek/dakika

## 👥 Admin İşlemleri

### Kullanıcıları Listele
```http
GET /users?skip=0&limit=10
```

**Query Parametreleri:**
| Parametre | Tip | Açıklama | Varsayılan |
|-----------|-----|-----------|------------|
| skip | integer | Atlanacak kayıt sayısı | 0 |
| limit | integer | Sayfa başı kayıt | 10 |

**Başarılı Yanıt (200 OK):**
```json
{
    "users": [
        {
            "id": "integer",
            "email": "string",
            "full_name": "string",
            "status": "string",
            "role": "string",
            "is_active": "boolean"
        }
    ],
    "total": "integer"
}
```

**Rate Limit:** 30 istek/dakika

## 📅 Etkinlik İşlemleri (Events)

### Etkinlik Listesi
```http
GET /events
```

**Query Parametreleri:**
| Parametre | Tip | Açıklama | Örnek |
|-----------|-----|-----------|--------|
| skip | integer | Sayfalama için offset | 0 |
| limit | integer | Sayfa başı kayıt sayısı | 10 |
| category | string | Kategori filtresi | "workshop" |
| status | string | Durum filtresi | "upcoming" |
| search | string | Arama terimi | "python" |

**Başarılı Yanıt (200 OK):**
```json
{
    "events": [
        {
            "id": "integer",
            "title": "string",
            "slug": "string",
            "description": "string",
            "content": "string",
            "image_url": "string",
            "location": "string",
            "start_time": "datetime",
            "end_time": "datetime",
            "category": {
                "id": "integer",
                "name": "string"
            },
            "created_by": {
                "id": "integer",
                "full_name": "string"
            },
            "is_active": "boolean"
        }
    ],
    "total": "integer"
}
```

### Etkinlik Detayı
```http
GET /events/{slug}
```

**Başarılı Yanıt (200 OK):**
```json
{
    "id": "integer",
    "title": "string",
    "slug": "string",
    "description": "string",
    "content": "string",
    "image_url": "string",
    "location": "string",
    "start_time": "datetime",
    "end_time": "datetime",
    "category": {
        "id": "integer",
        "name": "string"
    },
    "created_by": {
        "id": "integer",
        "full_name": "string"
    },
    "is_active": "boolean"
}
```

### Etkinlik Oluştur (Admin/Moderatör)
```http
POST /events
```

**İstek:**
```json
{
    "title": "string",
    "description": "string",
    "content": "string",
    "image_url": "string",
    "location": "string",
    "start_time": "datetime",
    "end_time": "datetime",
    "category_id": "integer"
}
```

**Rate Limit:** 10 istek/dakika

### Etkinlik Güncelle (Admin/Moderatör)
```http
PUT /events/{id}
```

**İstek:**
```json
{
    "title": "string",
    "description": "string",
    "content": "string",
    "image_url": "string",
    "location": "string",
    "start_time": "datetime",
    "end_time": "datetime",
    "category_id": "integer",
    "is_active": "boolean"
}
```

**Rate Limit:** 10 istek/dakika

### Etkinlik Sil (Admin/Moderatör)
```http
DELETE /events/{id}
```

**Başarılı Yanıt (200 OK):**
```json
{
    "message": "Etkinlik başarıyla silindi"
}
```

**Rate Limit:** 5 istek/dakika

## 🏷️ Kategori İşlemleri

### Kategorileri Listele
```http
GET /event-categories
```

**Başarılı Yanıt (200 OK):**
```json
[
    {
        "id": "integer",
        "name": "string"
    }
]
```

### Kategori Ekle (Admin/Moderatör)
```http
POST /event-categories
```

**İstek:**
```json
{
    "name": "string"
}
```

**Rate Limit:** 5 istek/dakika

## ⚙️ Genel Notlar

1. **Rate Limiting**
   - Her endpoint için ayrı limit tanımlı
   - Limit aşımında 429 hatası döner
   - Headers'da kalan istek sayısı belirtilir

2. **Güvenlik**
   - Tüm admin/moderatör işlemleri JWT doğrulaması gerektirir
   - 5 başarısız login denemesi hesabı kilitler
   - Token süresi 30 dakikadır

3. **Pagination**
   - Liste endpoint'leri sayfalama destekler
   - Default limit: 10 kayıt
   - `total` değeri toplam kayıt sayısını gösterir 