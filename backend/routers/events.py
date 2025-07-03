# gerekli importlar

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List 

# kendi importlarımız
from database import get_db 
from models.events import Event as EventModel, EventCategory as EventCategoryModel
from schemas.events import (
    Event, EventCreate, EventUpdate,
    EventCategory, EventCategoryCreate
    )

# Bütün endpointler events ile başlayacak. tags ise endpointlerin gruplandırılmasını sağlar.
router = APIRouter(prefix="/events", tags=["events"])


#!-----------------Kategori Endpointleri--------------------------------

@router.get("/categories", response_model=List[EventCategory])
def get_categories(
    db: Session = Depends(get_db),
    skip: int= 0,
    limit: int = 10
):
    """Tüm event kategorileri listele"""
    return db.query(EventCategoryModel).offset(skip).limit(limit).all()

@router.post("/categories", response_model=EventCategory)
def create_category(
    category: EventCategoryCreate,
    db: Session = Depends(get_db)
):
    """Yeni bir event kategorisi oluştur"""
    db_category = EventCategoryModel(**category.model_dump())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@router.get("/categories/{category_id}", response_model=EventCategory)
def get_category(category_id: int, db: Session = Depends(get_db)):
    """ID'ye göre kategori getir"""
    db_category = db.query(EventCategoryModel).filter(EventCategoryModel.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    return db_category

#!-----------------Event Endpointleri--------------------------------