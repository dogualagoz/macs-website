from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str

    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Şifre en az 6 karakter olmalıdır')
        return v

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None

    class Config:
        from_attributes = True

class AdminUserCreate(UserCreate):
    admin_secret: str  # Admin oluştururken güvenlik anahtarı gerekir

class PasswordChange(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 6:
            raise ValueError('Şifre en az 6 karakter olmalıdır')
        return v

    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Şifreler eşleşmiyor')
        return v

class UserResponse(UserBase):
    id: int
    status: str
    role: str
    is_active: bool
    last_login: Optional[datetime]
    failed_login_attempts: int
    password_changed_at: Optional[datetime]

    class Config:
        from_attributes = True

class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None 