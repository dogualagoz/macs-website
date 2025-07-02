from fastapi import FastAPI
from database import engine, Base
from fastapi.middleware.cors import CORSMiddleware
from fastapi import APIRouter

app = FastAPI(
    title = "MACS API",
    description = "MACS Kulübü Web Sitesi Backend API",
    version = "1.0.0",
)

# Database tablolarını oluştur
Base.metadata.create_all(bind=engine)



@app.get("/")
def root():
    return {"message": "MACS Kulübü Web Sitesine hoşgeldiniz!"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

