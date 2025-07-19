# Gerekli kütüphaneler
from fastapi import FastAPI
from database import engine, Base
from fastapi.middleware.cors import CORSMiddleware

# Router'ları import et
from routers import auth_router, events_router, users_router

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
    "https://macs-website-dogualagoz.vercel.app"  # Vercel preview URL
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

# Routerları ekle
app.include_router(events_router)
app.include_router(auth_router)
app.include_router(users_router)

@app.get("/")
def root():
    return {"message": "MACS Kulubu Web Sitesine hosgeldiniz!"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

