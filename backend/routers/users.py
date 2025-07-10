from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models.users import User
from schemas.users import UserResponse
from security import verify_token

router = APIRouter(prefix="/users", tags=["users"])

async def get_current_user(token: str = Depends(verify_token), db: Session = Depends(get_db)):
    """Token'dan kullanıcıyı bul"""
    payload = verify_token(token)
    user = db.query(User).filter(User.email == payload.get("sub")).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanıcı bulunamadı"
        )
    return user

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Giriş yapmış kullanıcının bilgilerini döndür"""
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_user_me(
    full_name: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Kullanıcı bilgilerini güncelle"""
    if full_name:
        current_user.full_name = full_name
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.delete("/me")
async def delete_user_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Kullanıcının kendi hesabını silmesi"""
    db.delete(current_user)
    db.commit()
    return {"message": "Hesabınız başarıyla silindi"}

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin tarafından kullanıcı silme"""
    # Admin kontrolü
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için admin yetkisi gerekli"
        )
    
    # Silinecek kullanıcıyı bul
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kullanıcı bulunamadı"
        )
    
    # Admin kendini silmeye çalışıyorsa engelle
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin kendi hesabını bu endpoint üzerinden silemez"
        )
    
    # Kullanıcıyı sil
    db.delete(user)
    db.commit()
    
    return {"message": f"{user.email} kullanıcısı başarıyla silindi"} 