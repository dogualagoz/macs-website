from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

#! Frontend'e gidecek veriler
class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    location: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    category_id: Optional[int] = None
    is_active: bool = True

#! Frontend'e gidecek veriler (inherit ettik üsttekinden)
class EventCreate(EventBase): 
    pass

#! Update için gerekli veriler (inherit ettik ve hepsini opsiyonel yaptık)
class EventUpdate(EventBase):
    title: Optional[str] = None
    start_time: Optional[datetime] = None

#! tüm alanları temsil eder (response modeli)
class Event(EventBase):
    id: int
    slug: str
    created_by: Optional[int]
    is_deleted: bool
    created_at: datetime
    updated_at: Optional[datetime] 
    
    model_config = ConfigDict(from_attributes=True)

#! Kategori için base model
class CategoryBase(BaseModel):
    name: str

#! Kategori oluşturmak için gerekli veriler
class CategoryCreate(CategoryBase):
    pass 

#! Kategori için tüm alanları temsil eder (response modeli)
class Category(CategoryBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
