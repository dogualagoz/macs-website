from sqlalchemy import Column, Integer, Boolean, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base

class Event(Base):

    __tablename__ = "events"

    #Primary key
    id = Column(Integer, primary_key=True, index=True)

    #Bilgiler 
    title = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    description = Column(String)
    content = Column(Text)
    image_url = Column(String)
    location = Column(String)

    #Zamanlar
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)

    # İlişkiler
    category_id = Column(Integer, ForeignKey("event_categories.id"))
    created_by = Column(String)

    # Durum
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class EventCategory(Base):
    __tablename__ = "event_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)

    #Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

