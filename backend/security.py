from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from os import getenv
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# JWT settings from environment variables
SECRET_KEY = getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY must be set in environment variables")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
MIN_PASSWORD_LENGTH = int(getenv("MIN_PASSWORD_LENGTH", "8"))

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Kullanıcının girdiği şifreyi, veritabanındaki hash'lenmiş şifre ile karşılaştırır"""
    if not plain_password or not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Yeni bir kullanıcı oluştururken şifreyi hash'ler"""
    if not password or len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Şifre en az {MIN_PASSWORD_LENGTH} karakter uzunluğunda olmalıdır")
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Login olunca kullanıcıya verilecek JWT token'ı oluşturur"""
    if not data:
        raise ValueError("Token verisi boş olamaz")
    
    to_encode = data.copy()
    
    # Token'ın geçerlilik süresini ayarla
    expire = datetime.utcnow() + (
        expires_delta if expires_delta
        else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    # Token içeriğini hazırla
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),  # Token oluşturulma zamanı
    })
    
    try:
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token oluşturulurken bir hata oluştu"
        )

def verify_token(token: str) -> dict:
    """Gelen JWT token'ın geçerli olup olmadığını kontrol eder"""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token eksik",
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
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token geçersiz veya süresi dolmuş",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token doğrulama hatası",
            headers={"WWW-Authenticate": "Bearer"},
        )
