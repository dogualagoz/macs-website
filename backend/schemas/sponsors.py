from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime 
from typing import Optional

class SponsorBase(BaseModel):
    """Temel Sponsor şeması"""
    name: str = Field(..., min_length=2, max_length=255, description="Sponsor adı")
    description: Optional[str] = Field(None, description="Açıklama")
    image_url: Optional[str] = Field(None, max_length=500, description="Resim URL")
    category: str = Field(..., min_length=2, max_length=100, description="Kategori (Kafe, Restoran, vs)")
    discount_info: str = Field(..., min_length=2, description="İndirim bilgisi")
    latitude: float = Field(..., ge=-90, le=90, description="Enlem")
    longitude: float = Field(..., ge=-180, le=180, description="Boylam")
    address: Optional[str] = Field(None, description="Adres")
    is_active: bool = Field(True, description="Aktif mi?")

class SponsorCreate(SponsorBase):
    """Yeni sponsor oluşturulurken kullanılır"""
    pass

class SponsorUpdate(BaseModel):
    """Sponsor güncellerken kullanılır (tüm alanlar opsiyonel)"""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    image_url: Optional[str] = Field(None, max_length=500)
    category: Optional[str] = Field(None, min_length=2, max_length=100)
    discount_info: Optional[str] = Field(None, min_length=2)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    address: Optional[str] = None
    is_active: Optional[bool] = None


class Sponsor(SponsorBase):
    id: int 
    created_at: datetime
    updated_at: Optional[datetime] = None 

    model_config = ConfigDict(from_attributes=True)

# Geocoding için yardımcı şema
class GeocodeRequest(BaseModel):
    """Geocoding isteği için"""
    address: str = Field(..., min_length=3, description="Aranacak adres")

class GeocodeResponse(BaseModel):
    """Geocoding yanıtı"""
    latitude: float
    longitude: float
    formatted_address: str

