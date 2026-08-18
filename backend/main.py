# Gerekli kütüphaneler
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
import logging
import os
from database import engine, Base
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from rate_limit import limiter

# Router'ları import et
from routers import auth_router, events_router, users_router, projects_router, uploads_router, sponsors_router, members_router

# Loglama: print yerine seviye ve zaman damgası taşıyan tek bir yapılandırma.
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

# OpenAPI Tag Metadata (Swagger grupları için)..
tags_metadata = [
    {
        "name": "authentication",
        "description": "User authentication and authorization. Includes login, registration, and token management.",
    },
    {
        "name": "events",
        "description": "Event management operations. Create, update, delete events and manage event categories.",
    },
    {
        "name": "members",
        "description": "Club member management. View members, leaderboard, and project contributions.",
    },
    {
        "name": "projects",
        "description": "Project management and CRUD operations. Includes project categories and team member management.",
    },
    {
        "name": "sponsors",
        "description": "Sponsor management. Create, update sponsors and manage sponsor categories.",
    },
    {
        "name": "users",
        "description": "User account management. Profile updates, password changes, and user administration.",
    },
    {
        "name": "system",
        "description": "System utilities. File uploads, health checks, and system information.",
    },
]

app = FastAPI(
    title="MACS API",
    description="MACS Kulübü Web Sitesi Backend API - RESTful API for managing club events, projects, members, and sponsors.",
    version="1.0.0",
    openapi_tags=tags_metadata,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS ayarları
# Frontend ayrı bir origin'den servis ediliyor (macsclub.com.tr -> api.macsclub.com.tr),
# yani her istek cross-origin. Listede olmayan bir origin'den gelen çağrı tarayıcıda
# CORS hatasıyla düşer. Docker'da frontend container'ı farklı bir portta açıldığı için
# liste sabit değil, CORS_ORIGINS ile (virgülle ayrılmış) genişletilebilir.
DEFAULT_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080",
    "https://macsclub.com.tr",
    "https://www.macsclub.com.tr",
]

_extra_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
# dict.fromkeys: sırayı bozmadan tekrar edenleri eler.
origins = list(dict.fromkeys(DEFAULT_ORIGINS + _extra_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiter'ı uygulamaya bağla.
# Bu satırlar olmadan slowapi limiti aştığında 429 yerine 500 döner:
# hata handler'ı request.app.state.limiter üzerinden header enjekte ediyor.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Her yanıta temel güvenlik başlıklarını ekler."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    # HSTS yalnızca HTTPS üzerinden anlamlı; HTTP'de göndermek tarayıcıda yok sayılır
    # ama lokal geliştirmede kafa karıştırmaması için koşula bağlı.
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# Database tablolarını oluştur
Base.metadata.create_all(bind=engine)

# Statik dosya klasörünü oluştur
os.makedirs("static/uploads", exist_ok=True)

# Statik dosyaları sunmak için middleware ekle
# 1. Lokal için ana static klasörü
app.mount("/static", StaticFiles(directory="static"), name="static")

# 2. Resimler için /uploads yolu — UPLOAD_DIR env variable'ı ile yapılandırılır
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "static/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Routerları ekle
app.include_router(events_router)
app.include_router(projects_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(uploads_router)
app.include_router(sponsors_router)
app.include_router(members_router)


@app.get("/", tags=["system"])
def root():
    return {"message": "MACS Kulubu Web Sitesine hosgeldiniz!"}

@app.get("/health", tags=["system"])
def health_check():
    return {"status": "ok"}

