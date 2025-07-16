from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional
from os import getenv
from datetime import datetime, timedelta
from slowapi import Limiter
from slowapi.util import get_remote_address

from database import get_db
from models.users import User
from schemas import UserCreate, UserResponse, Token, AdminUserCreate
from security import verify_password, create_access_token, get_password_hash, verify_token

# Rate limiting ayarları
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(
    prefix="/auth",
    tags=["Kimlik Doğrulama"]
)

# OAuth2 şeması tanımı
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Admin secret key'i environment variables'dan al
ADMIN_SECRET_KEY = getenv("ADMIN_SECRET_KEY")
if not ADMIN_SECRET_KEY:
    raise ValueError("ADMIN_SECRET_KEY must be set in environment variables")

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
    - Rate limit: 5/dakika
    """
    try:
        # Email kullanılıyor mu?
        if db.query(User).filter(User.email == user.email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu email adresi zaten kullanımda"
            )
        
        # Yeni kullanıcı oluştur
        db_user = User(
            email=user.email,
            full_name=user.full_name,
            hashed_password=get_password_hash(user.password),
            status="approved",
            role="moderator",
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
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Hata detayları: {error_details}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Kullanıcı kaydı sırasında bir hata oluştu: {str(e)}"
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
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
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
    Kullanıcı bulunamazsa veya token geçersizse hata döndürür.
    """
    try:
        # Token'ı doğrula
        payload = verify_token(token)
        email = payload.get("sub")
        
        # Kullanıcıyı bul
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Kullanıcı bulunamadı",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Kullanıcı aktif mi?
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Hesap aktif değil",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        return user
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        ) 