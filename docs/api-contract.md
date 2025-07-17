# MACS API Sözleşmesi v1.0

## 📌 Genel Bilgiler

### Base URL
```
Development: http://localhost:8000
```

### 🔐 Kimlik Doğrulama
- Tüm istekler için (login ve register hariç) JWT token gereklidir
- Token formatı: `Bearer <token>`
- Token'lar varsayılan olarak 30 dakika geçerlidir (ACCESS_TOKEN_EXPIRE_MINUTES ile ayarlanabilir)
- Token süresi dolduğunda yeniden login gerekir
- 5 başarısız giriş denemesinden sonra hesap 15 dakika kilitlenir

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

### 🔒 Güvenlik Özellikleri
- Şifre minimum 8 karakter olmalıdır
- Şifreler bcrypt ile hash'lenir
- Her endpoint için rate limiting uygulanır
- JWT token'lar HS256 algoritması ile imzalanır
- Tüm hassas veriler için input validasyonu yapılır

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
    "is_active": "boolean",
    "last_login": "datetime | null",
    "failed_login_attempts": "integer",
    "password_changed_at": "datetime | null"
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
    "full_name": "string",
    "email": "string (optional)",
    "status": "string (optional)",
    "is_active": "boolean (optional)"
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
    "new_password": "string (min. 8 karakter)",
    "confirm_password": "string"
}
```

**Hata Durumları:**
| Kod | Neden |
|-----|--------|
| 400 | Mevcut şifre yanlış |
| 400 | Yeni şifre çok kısa |
| 400 | Şifreler eşleşmiyor |
| 400 | Yeni şifre eski şifre ile aynı |

**Rate Limit:** 3 istek/dakika

### Hesap Sil
```http
DELETE /users/me
```

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
            "is_active": "boolean",
            "last_login": "datetime",
            "failed_login_attempts": "integer",
            "password_changed_at": "datetime"
        }
    ],
    "total": "integer"
}
```

**Rate Limit:** 30 istek/dakika

### Kullanıcı Detayı
```http
GET /users/{user_id}
```

**Rate Limit:** 30 istek/dakika

### Kullanıcı Sil (Admin)
```http
DELETE /users/{user_id}
```

**Rate Limit:** 10 istek/dakika

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
| search | string | Başlık/açıklama araması | "workshop" |
| category_id | integer | Kategori filtresi | 1 |
| status | string | Durum filtresi (all/upcoming/past) | "upcoming" |
| sort_by | string | Sıralama kriteri | "start_time" |
| sort_desc | boolean | Azalan sıralama | false |

**Başarılı Yanıt (200 OK):**
```json
[
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
        "is_active": "boolean",
        "created_at": "datetime",
        "updated_at": "datetime"
    }
]
```

### Etkinlik Detayı
```http
GET /events/{event_id}
```

### Etkinlik Detayı (Slug ile)
```http
GET /events/by-slug/{slug}
```

### Yeni Etkinlik
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

### Etkinlik Güncelle
```http
PUT /events/{event_id}
```

### Etkinlik Sil (Soft Delete)
```http
DELETE /events/{event_id}
```

### Etkinlik Kalıcı Sil
```http
DELETE /events/{event_id}/hard
```

## 🏷️ Kategori İşlemleri

### Kategori Listesi
```http
GET /events/categories
```

### Yeni Kategori
```http
POST /events/categories
```

**İstek:**
```json
{
    "name": "string"
}
```

### Kategori Güncelle
```http
PUT /events/categories/{category_id}
```

### Kategori Sil
```http
DELETE /events/categories/{category_id}
``` 