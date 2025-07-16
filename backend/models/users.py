from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    """
    Kullanıcı modeli.
    
    Attributes:
        id: Kullanıcı ID'si
        email: Kullanıcı email adresi (benzersiz)
        full_name: Kullanıcının tam adı
        hashed_password: Hash'lenmiş şifre
        role: Kullanıcı rolü (admin/moderator)
        status: Hesap durumu (pending/approved/rejected)
        is_active: Hesap aktif mi?
        failed_login_attempts: Başarısız giriş denemeleri sayısı
        last_login: Son başarılı giriş zamanı
        last_failed_login: Son başarısız giriş zamanı
        password_changed_at: Son şifre değişikliği zamanı
        events: Kullanıcının oluşturduğu etkinlikler
    """
    __tablename__ = "users"

    # Temel bilgiler
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    # Rol ve durum bilgileri
    role = Column(String, default="moderator")  # admin veya moderator
    status = Column(String, default="pending")  # pending, approved, rejected
    is_active = Column(Boolean, default=True)
    
    # Güvenlik alanları
    failed_login_attempts = Column(Integer, default=0)
    last_login = Column(DateTime(timezone=True), nullable=True)
    last_failed_login = Column(DateTime(timezone=True), nullable=True)
    password_changed_at = Column(DateTime(timezone=True), nullable=True)
    
    # İlişkiler
    events = relationship("Event", back_populates="creator")
    
    # Zaman damgaları
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<User {self.email}>"