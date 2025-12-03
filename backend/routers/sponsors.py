from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session 
from typing import List, Optional
import requests 

from database import get_db
from models.sponsors import Sponsor
from schemas.sponsors import (
    Sponsor as SponsorSchema,
    SponsorCreate,
    SponsorUpdate,
    GeocodeRequest,
    GeocodeResponse
)
from routers.auth import get_current_user

router = APIRouter(prefix="/sponsors", tags=["sponsors"])

@router.get("/", response_model=List[SponsorSchema])
def get_all_sponsors(
    category: Optional[str] = None,
    is_active: bool = True,
    db: Session = Depends(get_db)
):
    """
    Tüm sponsorları getir
    - category: Kategoriye göre
    - is_active: Sadece aktif sponsorları göster
    """

    query = db.query(Sponsor).filter(Sponsor.is_active == is_active)

    if category:
        query = query.filter(Sponsor.category == category)
    
    return query.all()

@router.get("/categories", response_model=List[str])
def get_categories(db: Session = Depends(get_db)):
    """
    Tüm kategorileri getir (filter için)
    """
    categories = db.query(Sponsor.category).distinct().all()
    return [cat[0] for cat in categories if cat[0]]

@router.get("/{sponsor_id}", response_model=SponsorSchema)
def get_sponsor_by_id(
    sponsor_id: int,
    db: Session = Depends(get_db)
):
    """Tek Sponsor detayı"""
    sponsor = db.query(Sponsor).filter(Sponsor.id == sponsor_id).first()
    if not sponsor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {sponsor_id} olan sponsor bulunamadı"
        )
    return sponsor 

# ============================================
# ADMIN ENDPOINTS (Authentication gerekli)
# ============================================

@router.post("/", response_model=SponsorSchema, status_code=status.HTTP_201_CREATED)
def create_sponsor(
    sponsor: SponsorCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Yeni sponsor ekle (Admin only)
    
    Authentication gerekli!
    """
    # Yeni sponsor oluştur
    db_sponsor = Sponsor(**sponsor.model_dump())
    
    db.add(db_sponsor)
    db.commit()
    db.refresh(db_sponsor)
    
    return db_sponsor

@router.put("/{sponsor_id}", response_model=SponsorSchema)
def update_sponsor(
    sponsor_id: int,
    sponsor_update: SponsorUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Sponsor güncelle (Admin only)
    
    Authentication gerekli!
    """
    # Sponsor'u bul
    db_sponsor = db.query(Sponsor).filter(Sponsor.id == sponsor_id).first()
    
    if not db_sponsor:
        raise HTTPException( 
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {sponsor_id} olan sponsor bulunamadı"
        )
    
    # Sadece gönderilen alanları güncelle
    update_data = sponsor_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_sponsor, field, value)
    
    db.commit()
    db.refresh(db_sponsor)
    
    return db_sponsor

@router.delete("/{sponsor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sponsor(
    sponsor_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Sponsor sil (Admin only)
    
    Authentication gerekli!
    """
    db_sponsor = db.query(Sponsor).filter(Sponsor.id == sponsor_id).first()
    
    if not db_sponsor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {sponsor_id} olan sponsor bulunamadı"
        )
    
    db.delete(db_sponsor)
    db.commit()
    
    return None

# ============================================
# GEOCODING ENDPOINT (ÜCRETSİZ - OpenStreetMap)
# ============================================

@router.post("/geocode", response_model=GeocodeResponse)
def geocode_address(
    request: GeocodeRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Adres → Koordinat çevirme (Admin panel için)
    
    ÜCRETSİZ! OpenStreetMap Nominatim kullanır.
    
    Örnek:
    POST /api/sponsors/geocode
    {
      "address": "Starbucks Kadıköy İstanbul"
    }
      Response:
    {
      "latitude": 40.9887,
      "longitude": 29.0274,
      "formatted_address": "Kadıköy, İstanbul, Türkiye"
    }
    
    Authentication gerekli (sadece admin kullanır)!
    """
    
    # OpenStreetMap Nominatim API (ÜCRETSİZ)
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        'q': request.address,
        'format': 'json',
        'limit': 1,
        'countrycodes': 'tr'  # Sadece Türkiye'de ara (opsiyonel)
    }
    headers = {
        'User-Agent': 'MACS-Website/1.0 (contact@macs.com)'  # Zorunlu!
    }
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Adres bulunamadı. Lütfen daha detaylı bir adres girin."
            )
        
        result = data[0]
        
        return GeocodeResponse(
            latitude=float(result['lat']),
            longitude=float(result['lon']),
            formatted_address=result['display_name']
        )
        
    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Geocoding servisi yanıt vermiyor. Lütfen tekrar deneyin."
        )
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Geocoding hatası: {str(e)}"
        )