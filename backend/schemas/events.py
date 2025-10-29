from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from .users import UserResponse

#! Kategori için base model
class EventCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

#! Kategori oluşturmak için gerekli veriler
class EventCategoryCreate(EventCategoryBase):
    pass 

#! Kategori için tüm alanları temsil eder (response modeli)
class EventCategory(EventCategoryBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

#! Frontend'e gidecek veriler
class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    location: Optional[str] = None
    registration_link: Optional[str] = None
    directions_link: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    category_id: Optional[int] = None
    is_active: bool = True
    is_featured: bool = False

#! Frontend'e gidecek veriler (inherit ettik üsttekinden)
class EventCreate(EventBase): 
    pass

#! Update için gerekli veriler (hepsi opsiyonel)
class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    location: Optional[str] = None
    registration_link: Optional[str] = None
    directions_link: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    category_id: Optional[int] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None

#! tüm alanları temsil eder (response modeli)
class Event(EventBase):
    id: int
    slug: str
    created_by: int
    creator: Optional[UserResponse] = None
    is_deleted: bool
    created_at: datetime
    updated_at: Optional[datetime]
    category: Optional[EventCategory] = None
    
    model_config = ConfigDict(from_attributes=True)
