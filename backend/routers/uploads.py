from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import os
import uuid
from typing import Optional
from datetime import datetime
from database import get_db
from .auth import get_current_user
from models.users import User

router = APIRouter()

# Railway volume path'ini kontrol et
UPLOAD_VOLUME_PATH = "/app/uploads"  # Railway volume mount path
if os.path.exists(UPLOAD_VOLUME_PATH):
    UPLOAD_DIR = UPLOAD_VOLUME_PATH
    STATIC_URL_PREFIX = "/uploads"
else:
    # Local development için
    UPLOAD_DIR = "static/uploads"
    STATIC_URL_PREFIX = "/static/uploads"

# Klasör yoksa oluştur
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload/")
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Dosya yükleme endpoint'i.
    Sadece resim dosyalarını kabul eder.
    """
    # Dosya uzantısını kontrol et
    file_ext = os.path.splitext(file.filename)[1].lower()
    allowed_extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"]
    
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Sadece resim dosyaları yüklenebilir")
    
    # Benzersiz dosya adı oluştur
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Dosyayı kaydet
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Dosya URL'ini döndür - environment'a göre
    file_url = f"{STATIC_URL_PREFIX}/{unique_filename}"
    
    return {"url": file_url}
