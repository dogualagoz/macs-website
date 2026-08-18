from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import uuid
import shutil
import tempfile
from typing import Optional
from datetime import datetime
from starlette.background import BackgroundTasks
from database import get_db
from .auth import require_staff, require_admin
from models.users import User
from rate_limit import limiter

router = APIRouter(prefix="/api/upload", tags=["system"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "static/uploads")
STATIC_URL_PREFIX = "/uploads"

# Yükleme sınırları
MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_SIZE", str(5 * 1024 * 1024)))  # 5 MB
CHUNK_SIZE = 64 * 1024

# Uzantı tek başına yeterli değil: dosyanın ilk baytlarındaki imza da
# aynı türü göstermeli. Aksi halde .jpg adı verilmiş herhangi bir binary geçer.
IMAGE_SIGNATURES = {
    ".jpg": [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
    ".png": [b"\x89PNG\r\n\x1a\n"],
    ".gif": [b"GIF87a", b"GIF89a"],
    ".webp": [b"RIFF"],  # RIFF....WEBP — 8. bayttan itibaren ayrıca kontrol ediliyor
}

os.makedirs(UPLOAD_DIR, exist_ok=True)


def _matches_signature(file_ext: str, header: bytes) -> bool:
    """Dosyanın ilk baytları, verilen uzantının beklediği imzayla uyuşuyor mu?"""
    signatures = IMAGE_SIGNATURES.get(file_ext, [])
    if not any(header.startswith(sig) for sig in signatures):
        return False
    if file_ext == ".webp":
        # RIFF konteyneri başka formatlar için de kullanılıyor; WEBP olduğunu doğrula.
        return len(header) >= 12 and header[8:12] == b"WEBP"
    return True


@router.post("/")
@limiter.limit("20/minute")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    """
    Dosya yükleme endpoint'i.

    - Sadece resim dosyalarını kabul eder (uzantı + dosya imzası doğrulanır)
    - Boyut sınırı: MAX_UPLOAD_SIZE (varsayılan 5 MB)
    - Rate limit: 20/dakika
    """
    file_ext = os.path.splitext(file.filename or "")[1].lower()

    if file_ext not in IMAGE_SIGNATURES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sadece resim dosyaları yüklenebilir (jpg, jpeg, png, gif, webp)"
        )

    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    total_written = 0
    header = b""

    try:
        with open(file_path, "wb") as buffer:
            while chunk := await file.read(CHUNK_SIZE):
                if len(header) < 12:
                    header += chunk[: 12 - len(header)]

                total_written += len(chunk)
                if total_written > MAX_UPLOAD_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Dosya çok büyük. Sınır: {MAX_UPLOAD_SIZE // (1024 * 1024)} MB"
                    )

                buffer.write(chunk)

        if not _matches_signature(file_ext, header):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Dosya içeriği geçerli bir resim değil"
            )
    except Exception:
        # Reddedilen veya yarım kalan yükleme diskte kalmasın.
        if os.path.exists(file_path):
            os.remove(file_path)
        raise

    return {"url": f"{STATIC_URL_PREFIX}/{unique_filename}"}


@router.get("/download-all")
@limiter.limit("3/hour")
async def download_all_uploads(
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin)
):
    """
    Tüm yüklenen dosyaları zipleyip döndürür.

    - Sadece admin erişebilir
    - Rate limit: 3/saat
    """
    if not os.path.exists(UPLOAD_DIR) or not os.listdir(UPLOAD_DIR):
        raise HTTPException(status_code=404, detail="Yüklenecek dosya bulunamadı")

    # Geçici bir klasör oluştur
    temp_dir = tempfile.mkdtemp()
    zip_base_name = os.path.join(temp_dir, "macs_uploads_backup")

    # Arşivi oluştur (zip formatında)
    # base_dir=None tüm UPLOAD_DIR içeriğini zip köküne koyar
    zip_file_path = shutil.make_archive(zip_base_name, 'zip', UPLOAD_DIR)

    # Dosya gönderildikten sonra geçici klasörü silmek için background task ekle
    def remove_temp_dir(dir_path: str):
        if os.path.exists(dir_path):
            shutil.rmtree(dir_path)

    background_tasks.add_task(remove_temp_dir, temp_dir)

    return FileResponse(
        path=zip_file_path,
        filename=f"macs_uploads_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip",
        media_type='application/zip'
    )
