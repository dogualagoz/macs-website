from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import os
import uuid
from database import get_db
from .auth import get_current_user
from models.users import User

# Burada /api prefix'ini KALDIRIYORUZ
router = APIRouter(tags=["uploads"])

UPLOAD_VOLUME_PATH = "/app/uploads"
if os.path.exists(UPLOAD_VOLUME_PATH):
    UPLOAD_DIR = UPLOAD_VOLUME_PATH
    STATIC_URL_PREFIX = "/uploads"
else:
    UPLOAD_DIR = "static/uploads"
    STATIC_URL_PREFIX = "/static/uploads"

os.makedirs(UPLOAD_DIR, exist_ok=True)

# Tek decorator yeterli, slash'li versiyonu FastAPI zaten tolere ediyor
@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    file_ext = os.path.splitext(file.filename)[1].lower()
    allowed_extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"]

    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Sadece resim dosyaları yüklenebilir")

    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    content = await file.read()
    with open(file_path, "wb") as buffer:
        buffer.write(content)

    file_url = f"{STATIC_URL_PREFIX}/{unique_filename}"
    return {"url": file_url, "filename": unique_filename}