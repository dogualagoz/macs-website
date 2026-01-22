# Gerekli kütüphaneler
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os
from database import engine, Base
from fastapi.middleware.cors import CORSMiddleware

# Router'ları import et
from routers import auth_router, events_router, users_router, projects_router, uploads_router, sponsors_router, members_router

# OpenAPI Tag Metadata (Swagger grupları için)
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
origins = [
    "http://localhost:3000",  # Geliştirme ortamı
    "https://macs-website-ejpz-2c1oycxy2-dogualagozs-projects.vercel.app",  # Vercel preview URL
    "https://macs-website-ejpz.vercel.app",  # Vercel production URL
    "https://macs-website.vercel.app",  # Vercel production URL (alternative)
    "https://macs-website-dogualagoz.vercel.app",
    "https://macsclub.com.tr",
    "https://www.macsclub.com.tr",  # Vercel preview URL
    "http://localhost:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database tablolarını oluştur
Base.metadata.create_all(bind=engine)

# Statik dosya klasörünü oluştur
os.makedirs("static/uploads", exist_ok=True)

# Statik dosyaları sunmak için middleware ekle
app.mount("/static", StaticFiles(directory="static"), name="static")

# Railway volume varsa uploads klasörünü de mount et
UPLOAD_VOLUME_PATH = "/app/uploads"
if os.path.exists(UPLOAD_VOLUME_PATH):
    app.mount("/uploads", StaticFiles(directory=UPLOAD_VOLUME_PATH), name="uploads")

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

