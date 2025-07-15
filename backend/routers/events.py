# gerekli importlar

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from enum import Enum
import re
from unidecode import unidecode

# kendi importlarımız
from database import get_db 
from models.events import Event as EventModel, EventCategory as EventCategoryModel
from schemas.events import (
    Event, EventCreate, EventUpdate,
    EventCategory, EventCategoryCreate
    )

router = APIRouter(
    prefix="/events",
    tags=["Etkinlik İşlemleri"]
)

# Event durumu için enum
class EventStatus(str, Enum):
    ALL = "all"          # Tümü
    UPCOMING = "upcoming"  # Yaklaşan
    PAST = "past"         # Geçmiş

#!-----------------Kategori Endpointleri--------------------------------

@router.get("/categories", response_model=List[EventCategory])
def get_categories(
    db: Session = Depends(get_db),
    skip: int= 0,
    limit: int = 10
):
    """
    Etkinlik kategorilerini listeler.
    
    - Sayfalama: skip, limit
    """
    return db.query(EventCategoryModel).offset(skip).limit(limit).all()

@router.post("/categories", response_model=EventCategory, status_code=status.HTTP_201_CREATED)
def create_category(
    category: EventCategoryCreate,
    db: Session = Depends(get_db)
):
    """Yeni etkinlik kategorisi oluşturur."""
    db_category = EventCategoryModel(**category.model_dump())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@router.get("/categories/{category_id}", response_model=EventCategory)
def get_category(category_id: int, db: Session = Depends(get_db)):
    """Belirli bir kategoriyi getirir."""
    db_category = db.query(EventCategoryModel).filter(EventCategoryModel.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    return db_category

@router.put("/categories/{category_id}", response_model=EventCategory)
def update_category(
    category_id: int,
    category: EventCategoryCreate,
    db: Session = Depends(get_db)
):
    """Kategori bilgilerini günceller."""
    db_category = db.query(EventCategoryModel).filter(
        EventCategoryModel.id == category_id
    ).first()
    
    if not db_category:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    
    db_category.name = category.name
    db.commit()
    db.refresh(db_category)
    return db_category

@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    """
    Kategoriyi siler.
    
    - İlgili etkinliklerin kategori ID'si null yapılır
    """
    #Kategori bul
    db_category = db.query(EventCategoryModel).filter(EventCategoryModel.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    
    #Bu kategoriye ait eventlerin kategori id'sini null yap
    db.query(EventModel).filter(EventModel.category_id == category_id).update({EventModel.category_id: None})
    #Kategori sil
    db.delete(db_category)
    db.commit()
    return None


#!-----------------Event Endpointleri--------------------------------

@router.get("", response_model=List[Event])
def get_events(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 10,
    search: Optional[str] = None,           # İsme göre arama
    category_id: Optional[int] = None,      # Kategori filtresi
    status: EventStatus = EventStatus.ALL,  # Event durumu (default: Tümü)
    sort_by: Optional[str] = "start_time",  # Sıralama kriteri
    sort_desc: bool = False                 # Sıralama yönü (True: azalan, False: artan)
):
    """
    Etkinlikleri listeler ve filtreler.
    
    - Arama: Başlığa göre
    - Filtreler: Kategori, durum (tümü/yaklaşan/geçmiş)
    - Sıralama: start_time, title, created_at
    - Sayfalama: skip, limit
    """
    # Base query
    query = db.query(EventModel).filter(EventModel.is_deleted == False)

    # İsme göre arama
    if search:
        query = query.filter(EventModel.title.ilike(f"%{search}%"))

    # Kategori filtresi
    if category_id:
        query = query.filter(EventModel.category_id == category_id)

    # Duruma göre filtreleme
    now = datetime.now()
    if status == EventStatus.UPCOMING:
        query = query.filter(EventModel.start_time >= now)
    elif status == EventStatus.PAST:
        query = query.filter(EventModel.start_time < now)

    # Sıralama
    if sort_by:
        # Hangi alana göre sıralama yapılacak
        sort_column = getattr(EventModel, sort_by)
        # Artan/azalan sıralama
        if sort_desc:
            sort_column = sort_column.desc()
        query = query.order_by(sort_column)

    # Pagination
    return query.offset(skip).limit(limit).all()

def create_slug(title: str) -> str:
    """Başlıktan URL-uyumlu slug oluşturur"""
    # Başlığı küçük harfe çevir ve boşlukları tire ile değiştir
    slug = unidecode(title).lower()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    return slug

@router.post("", response_model=Event, status_code=status.HTTP_201_CREATED)
def create_event(
    event: EventCreate,
    db: Session = Depends(get_db)
):
    """
    Yeni etkinlik oluşturur.
    
    - Otomatik slug oluşturma
    - Kategori kontrolü
    """
    if event.category_id:
        category = db.query(EventCategoryModel).filter(EventCategoryModel.id == event.category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Belirtilen kategori bulunamadı")
    
    # Event verilerini hazırla
    event_data = event.model_dump()
    
    # Basit slug oluştur
    base_slug = create_slug(event.title)
    
    # Eğer aynı slug varsa sonuna timestamp ekle
    if db.query(EventModel).filter(EventModel.slug == base_slug).first():
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        base_slug = f"{base_slug}-{timestamp}"
    
    event_data["slug"] = base_slug
    
    # Event'i oluştur
    db_event = EventModel(**event_data)
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

@router.get("/{event_id}", response_model=Event)
def get_event(event_id: int, db: Session = Depends(get_db)):
    """ID'ye göre etkinlik getirir."""
    db_event = db.query(EventModel).filter(
        EventModel.id == event_id,
        EventModel.is_deleted == False
    ).first()

    if not db_event:
        raise HTTPException(status_code=404, detail="Event bulunamadı")
    return db_event

@router.get("/by-slug/{slug}", response_model=Event)
def get_event_by_slug(slug: str, db: Session = Depends(get_db)):
    """Slug'a göre etkinlik getirir."""
    db_event = db.query(EventModel).filter(
        EventModel.slug == slug,
        EventModel.is_deleted == False
    ).first()
    
    if not db_event:
        raise HTTPException(status_code=404, detail="Event bulunamadı")
    return db_event

@router.put("/{event_id}", response_model=Event)
def update_event(
    event_id: int,
    event: EventUpdate,
    db: Session = Depends(get_db)
):
    """
    Etkinlik bilgilerini günceller.
    
    - Başlık değişirse yeni slug oluşturulur
    - Kategori kontrolü yapılır
    """
    db_event = db.query(EventModel).filter(
        EventModel.id == event_id,
        EventModel.is_deleted == False
    ).first()
    
    if not db_event:
        raise HTTPException(status_code=404, detail="Event bulunamadı")

    # Kategori değiştiriliyorsa ve yeni kategori belirtildiyse, var olduğunu kontrol et
    if event.category_id:
        category = db.query(EventCategoryModel).filter(EventCategoryModel.id == event.category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Belirtilen kategori bulunamadı")

    # Sadece gönderilen alanları güncelle
    update_data = event.model_dump(exclude_unset=True)
    
    # Eğer başlık değiştiyse yeni slug oluştur
    if "title" in update_data:
        base_slug = create_slug(update_data["title"])
        if db.query(EventModel).filter(
            EventModel.slug == base_slug,
            EventModel.id != event_id
        ).first():
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            base_slug = f"{base_slug}-{timestamp}"
        update_data["slug"] = base_slug
    
    for key, value in update_data.items():
        setattr(db_event, key, value)

    db.commit()
    db.refresh(db_event)
    return db_event

@router.delete("/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db)):
    """
    Etkinliği soft-delete yapar.
    
    - is_deleted = True olarak işaretlenir
    """
    db_event = db.query(EventModel).filter(
        EventModel.id == event_id,
        EventModel.is_deleted == False
    ).first()
    
    if not db_event:
        raise HTTPException(status_code=404, detail="Event bulunamadı")
    
    # Soft delete
    db_event.is_deleted = True
    db.commit()
    
    return {"message": "Event başarıyla silindi"}

@router.delete("/{event_id}/hard", status_code=status.HTTP_204_NO_CONTENT)
def hard_delete_event(event_id: int, db: Session = Depends(get_db)):
    """
    Etkinliği kalıcı olarak siler.
    
    - Veritabanından tamamen silinir
    """
    db_event = db.query(EventModel).filter(EventModel.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event bulunamadı")
    
    db.delete(db_event)
    db.commit()
    return None



