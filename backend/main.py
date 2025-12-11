# Gerekli kütüphaneler
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os
from database import engine, Base
from fastapi.middleware.cors import CORSMiddleware

# Router'ları import et
from routers import auth_router, events_router, users_router, projects_router, uploads_router, sponsors_router

app = FastAPI(
    title = "MACS API",
    description = "MACS Kulübü Web Sitesi Backend API",
    version = "1.0.0",
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
app.include_router(uploads.router, prefix="/api")
app.include_router(sponsors_router)


@app.get("/")
def root():
    return {"message": "MACS Kulubu Web Sitesine hosgeldiniz!"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

