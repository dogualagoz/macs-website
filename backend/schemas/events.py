from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

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

class EventCreate(EventBase): 
    pass

class EventUpdate(EventBase):
    title: Optional[str] = None
    start_time: Optional[datetime] = None

class Event(EventBase):
    id: int
    slug: str
    created_by: Optional[int]
    is_deleted: bool
    created_at: datetime
    updated_at: Optional[datetime] 

class CategoryBase(BaseModel):
    name: str

class CategoryCreate(CategoryBase):
    pass 

class Category(CategoryBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
