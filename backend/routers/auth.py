from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional
from os import getenv
from datetime import datetime, timedelta
import logging

from database import get_db
from models.users import User
from schemas import UserCreate, UserResponse, Token, AdminUserCreate
from security import verify_password, create_access_token, get_password_hash, verify_token
from rate_limit import limiter

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/auth",
    tags=["authentication"]
)

# OAuth2 şeması tanımı
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Admin secret key'i environment variables'dan al
# Not: Uygulamanın açılışını engellememesi için import anında hata fırlatmıyoruz.
ADMIN_SECRET_KEY = getenv("ADMIN_SECRET_KEY")

# Başarısız giriş denemesi limitleri
MAX_LOGIN_ATTEMPTS = int(getenv("MAX_LOGIN_ATTEMPTS", "5"))  # 5 başarısız deneme
LOCKOUT_DURATION = int(getenv("LOCKOUT_DURATION", "15"))  # 15 dakika kilitli kalır

@router.post("/register", response_model=UserResponse)
@limiter.limit("5/minute")
async def register(
    request: Request,
    user: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Yeni kullanıcı kaydı oluşturur.

    - Email benzersiz olmalı
    - Şifre min. 6 karakter
    - Hesap "pending" durumunda açılır; yetki kazanması için admin onayı gerekir
    - Rate limit: 5/dakika
    """
    try:
        # Email kullanılıyor mu?
        if db.query(User).filter(User.email == user.email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu email adresi zaten kullanımda"
            )

        # Yeni kullanıcı oluştur.
        # role ve status burada bilinçli olarak set edilmiyor: model default'ları
        # ("moderator" / "pending") geçerli olsun ki kayıt olan kimse admin onayı
        # almadan yetki kazanmasın.
        db_user = User(
            email=user.email,
            full_name=user.full_name,
            hashed_password=get_password_hash(user.password),
            failed_login_attempts=0,
            last_login=None
        )

        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        return db_user

    except HTTPException as he:
        # HTTP exception'ları olduğu gibi yükselt
        raise he
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception:
        logger.exception("Kullanıcı kaydı başarısız")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Kullanıcı kaydı sırasında bir hata oluştu"
        )

@router.post("/register/admin", response_model=UserResponse)
@limiter.limit("3/minute")
async def register_admin(
    request: Request,
    admin: AdminUserCreate,
    db: Session = Depends(get_db)
):
    """
    Admin kullanıcı kaydı oluşturur.
    
    - Admin secret gerekli
    - Email benzersiz olmalı
    - Rate limit: 3/dakika
    """
    try:
        # Sunucu konfigürasyonu kontrolü
        if not ADMIN_SECRET_KEY:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Admin kaydı devre dışı: ADMIN_SECRET_KEY yapılandırılmamış"
            )
        # Admin secret kontrolü
        if admin.admin_secret != ADMIN_SECRET_KEY:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin kaydı için geçerli güvenlik anahtarı gerekli"
            )

        # Email kullanılıyor mu?
        if db.query(User).filter(User.email == admin.email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu email adresi zaten kullanımda"
            )
        
        # Admin kullanıcı oluştur
        db_user = User(
            email=admin.email,
            full_name=admin.full_name,
            hashed_password=get_password_hash(admin.password),
            status="approved",
            role="admin",
            failed_login_attempts=0,
            last_login=None
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        return db_user
        
    except HTTPException as he:
        raise he
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception:
        logger.exception("Admin kaydı başarısız")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Admin kullanıcı kaydı sırasında bir hata oluştu"
        )

@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Kullanıcı girişi yapar ve token döndürür.
    
    - 5 başarısız denemeden sonra hesap 15dk kilitlenir
    - Rate limit: 10/dakika
    """
    try:
        # Kullanıcıyı bul
        user = db.query(User).filter(User.email == form_data.username).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email veya şifre hatalı"
            )
        
        # Hesap kilitli mi kontrol et
        if user.failed_login_attempts >= MAX_LOGIN_ATTEMPTS:
            lockout_time = datetime.utcnow() - timedelta(minutes=LOCKOUT_DURATION)
            if user.last_failed_login and user.last_failed_login > lockout_time:
                minutes_left = LOCKOUT_DURATION - ((datetime.utcnow() - user.last_failed_login).total_seconds() / 60)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Çok fazla başarısız deneme. Hesap {int(minutes_left)} dakika kilitlendi."
                )
            else:
                # Kilit süresi dolduysa sayacı sıfırla
                user.failed_login_attempts = 0
        
        # Şifreyi kontrol et
        if not verify_password(form_data.password, user.hashed_password):
            # Başarısız deneme sayısını artır
            user.failed_login_attempts += 1
            user.last_failed_login = datetime.utcnow()
            db.commit()
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email veya şifre hatalı"
            )
        
        # Hesap aktif mi?
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Hesabınız aktif değil"
            )

        # Hesap onaylanmış mı? Onaysız hesaba token vermenin anlamı yok;
        # kullanıcıya sebebini burada söylemek daha anlaşılır.
        if user.status != "approved":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Hesabınız henüz onaylanmadı. Yönetici onayı bekleniyor."
            )

        # Başarılı giriş - sayaçları sıfırla
        user.failed_login_attempts = 0
        user.last_login = datetime.utcnow()
        db.commit()
        
        # Access token oluştur
        access_token = create_access_token(
            data={
                "sub": user.email,
                "role": user.role
            }
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Giriş sırasında bir hata oluştu"
        ) 

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Token'dan kullanıcıyı bulur ve döndürür.
    Kullanıcı bulunamazsa, token geçersizse veya hesap onaylı değilse hata döndürür.
    """
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Kimlik doğrulanamadı",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = verify_token(token)
    except HTTPException:
        raise
    except Exception:
        logger.warning("Token doğrulanamadı", exc_info=True)
        raise credentials_error

    email = payload.get("sub")
    if not email:
        raise credentials_error

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise credentials_error

    # Hesap aktif mi?
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Hesap aktif değil",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Hesap admin onayından geçmiş mi? Kayıt "pending" olarak açılır.
    if user.status != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hesabınız henüz onaylanmadı",
        )

    return user


def require_roles(*allowed_roles: str):
    """
    Belirtilen rollerden birine sahip olmayı zorunlu kılan dependency üretir.

    get_current_user yalnızca "bu geçerli bir kullanıcı mı" sorusunu yanıtlar;
    "bu işlemi yapmaya yetkili mi" sorusu buradan geçmelidir.
    """
    async def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu işlem için yetkiniz yok",
            )
        return current_user

    return dependency


# İçerik yönetimi: admin ve moderator
require_staff = require_roles("admin", "moderator")

# Geri alınamayan işlemler ve kullanıcı yönetimi: yalnızca admin
require_admin = require_roles("admin")