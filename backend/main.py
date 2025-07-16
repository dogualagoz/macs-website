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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Geliştirme için tüm originlere izin ver
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

