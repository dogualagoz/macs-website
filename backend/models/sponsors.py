from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime
from sqlalchemy.sql import func 
from database import Base

class Sponsor(Base):
    """
    Sponsorlar Tablosu
    -Mekan bilgileri (kafe, restoran vs)
    -Konum bilgileri (harita için)
    -İndirim bilgileri
    
    
    
    """

    __tablename__ = "sponsors"

    #Primary Key
    id = Column(Integer, primary_key = True, index = True)

    #Temel Bilgiler 
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable = True)

    #Kategori (Kafe, Restoran, Market, vs)
    category = Column(String(100), nullable=False, index=True)

    #İndirim Bilgisi
    discount_info = Column(Text, nullable=False)

    #Konum Bilgileri
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(Text, nullable=True)


    #Durum 
    is_active = Column(Boolean, default=True)

    #Tarihler
    created_at = Column(DateTime(timezone=True), server_default=func.now())


def __repr__(self):
    return f"<Sponsor {self.name}"