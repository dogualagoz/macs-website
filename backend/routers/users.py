from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Optional, List
from sqlalchemy import desc
from datetime import datetime
from slowapi import Limiter
from slowapi.util import get_remote_address

from database import get_db
from models.users import User
from schemas import UserResponse, UserListResponse, PasswordChange
from security import verify_token, get_password_hash, verify_password
from routers.auth import get_current_user

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(
    prefix="/users",
    tags=["Kullanıcı İşlemleri"]
        )

async def get_current_admin(current_user: User = Depends(get_current_user)):
    """Admin yetki kontrolü"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için admin yetkisi gerekli"
        )
    return current_user

@router.get("/me", response_model=UserResponse)
@limiter.limit("10/minute")
async def read_users_me(request: Request, current_user: User = Depends(get_current_user)):
    """
    Kullanıcı profilini görüntüler.
    
    - Rate limit: 10/dakika
    """
    return current_user

@router.put("/me", response_model=UserResponse)
@limiter.limit("5/minute")
async def update_user_me(
    request: Request,
    full_name: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Kullanıcı bilgilerini günceller.
    
    - Rate limit: 5/dakika
    """
    if full_name:
        current_user.full_name = full_name
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/me/change-password", response_model=UserResponse)
@limiter.limit("3/minute")
async def change_password(
    request: Request,
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Kullanıcı şifresini değiştirir.
    
    - Mevcut şifre doğrulaması gerekli
    - Rate limit: 3/dakika
    """
    # Mevcut şifreyi kontrol et
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mevcut şifre yanlış"
        )
    
    # Yeni şifre eski şifre ile aynı olmamalı
    if verify_password(password_data.new_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Yeni şifre eski şifre ile aynı olamaz"
        )
    
    # Şifreyi güncelle
    current_user.hashed_password = get_password_hash(password_data.new_password)
    current_user.password_changed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.delete("/me")
@limiter.limit("3/minute")
async def delete_user_me(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Kullanıcı hesabını siler.
    
    - Rate limit: 3/dakika
    """
    db.delete(current_user)
    db.commit()
    return {"message": "Hesabınız başarıyla silindi"}

@router.get("", response_model=UserListResponse)
@limiter.limit("30/minute")
async def list_users(
    request: Request,
    skip: int = 0,
    limit: int = 10,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Tüm kullanıcıları listeler (Admin).
    
    - Sayfalama: skip, limit
    - Rate limit: 30/dakika
    """
    users = db.query(User).order_by(desc(User.created_at)).offset(skip).limit(limit).all()
    total = db.query(User).count()
    return {"users": users, "total": total}

@router.get("/{user_id}", response_model=UserResponse)
@limiter.limit("30/minute")
async def get_user(
    request: Request,
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Kullanıcı detaylarını getirir (Admin).
    
    - Rate limit: 30/dakika
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kullanıcı bulunamadı"
        )
    return user

@router.delete("/{user_id}")
@limiter.limit("10/minute")
async def delete_user(
    request: Request,
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Kullanıcı hesabını siler (Admin).
    
    - Admin kendi hesabını silemez
    - Rate limit: 10/dakika
    """
    # Silinecek kullanıcıyı bul
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kullanıcı bulunamadı"
        )
    
    # Admin kendini silmeye çalışıyorsa engelle
    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin kendi hesabını bu endpoint üzerinden silemez"
        )
    
    # Kullanıcıyı sil
    db.delete(user)
    db.commit()
    
    return {"message": f"{user.email} kullanıcısı başarıyla silindi"} 