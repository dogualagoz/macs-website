# Gerekli kütüphaneler
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from os import getenv
from dotenv import load_dotenv

# Çevre değişkenlerini yükle
load_dotenv()

# JWT ayarları
# Not: Prod ortamında henüz set edilmemişse uygulama açılışını engellememek için
# import anında exception fırlatmıyoruz. İlgili fonksiyon çağrıldığında 500 dönecek.
SECRET_KEY = getenv("JWT_SECRET_KEY")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
MIN_PASSWORD_LENGTH = int(getenv("MIN_PASSWORD_LENGTH", "6"))

# Şifre hash'leme ayarları
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Kullanıcının girdiği şifreyi, veritabanındaki hash'lenmiş şifre ile karşılaştırır"""
    if not plain_password or not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Şifreyi güvenli bir şekilde hash'ler"""
    if not password:
        raise ValueError("Şifre boş olamaz")
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Şifre en az {MIN_PASSWORD_LENGTH} karakter olmalıdır")
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Login olunca kullanıcıya verilecek JWT token'ı oluşturur"""
    if not data:
        raise ValueError("Token verisi boş olamaz")
    if not SECRET_KEY:
        # Uygulama yanlış yapılandırılmış
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server misconfigured: JWT_SECRET_KEY is not set",
        )
    
    to_encode = data.copy()
    
    # Süre belirtilmemişse varsayılan süreyi kullan
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    # Token'ı oluştur
    try:
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    except Exception as e:
        raise ValueError(f"Token oluşturma hatası: {str(e)}")

def verify_token(token: str) -> dict:
    """Gelen JWT token'ın geçerli olup olmadığını kontrol eder"""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token eksik",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server misconfigured: JWT_SECRET_KEY is not set",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # Bearer prefix'ini kaldır
        if token.startswith('Bearer '):
            token = token.replace('Bearer ', '')
        
        # Token'ı çöz
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Email kontrolü
        if not payload.get("sub"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token içinde email bilgisi eksik",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        return payload
        
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token geçersiz veya süresi dolmuş: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token doğrulama hatası: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
