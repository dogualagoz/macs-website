from sqlalchemy import Column, Integer, Boolean, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Event(Base):
    """
    Etkinlik modeli.
    
    Attributes:
        id: Etkinlik ID'si
        title: Etkinlik başlığı
        slug: URL-dostu başlık
        description: Kısa açıklama
        content: Detaylı içerik
        image_url: Etkinlik görseli URL'i
        location: Etkinlik konumu
        registration_link: Kayıt ol linki
        directions_link: Yol tarifi linki
        start_time: Başlangıç zamanı
        end_time: Bitiş zamanı
        category_id: Kategori ID'si
        category: Kategori ilişkisi
        created_by: Oluşturan kullanıcı ID'si
        creator: Kullanıcı ilişkisi
        is_active: Etkinlik aktif mi?
        is_deleted: Etkinlik silindi mi?
        is_featured: Öne çıkan etkinlik mi?
    """
    __tablename__ = "events"

    # Temel bilgiler
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    description = Column(String)
    content = Column(Text)
    image_url = Column(String)
    location = Column(String)
    
    # Link bilgileri
    registration_link = Column(String)  # Kayıt ol linki
    directions_link = Column(String)    # Yol tarifi linki

    # Zaman bilgileri
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)

    # İlişkiler
    category_id = Column(Integer, ForeignKey("event_categories.id"))
    category = relationship("EventCategory", back_populates="events")
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    creator = relationship("User", back_populates="events")

    # Durum bilgileri
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    
    # Zaman damgaları
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class EventCategory(Base):
    """
    Etkinlik kategorisi modeli.
    
    Attributes:
        id: Kategori ID'si
        name: Kategori adı
        description: Kategori açıklaması
        events: Bu kategorideki etkinlikler
    """
    __tablename__ = "event_categories"

    # Temel bilgiler
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)

    # İlişkiler
    events = relationship("Event", back_populates="category")

    # Zaman damgaları
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

