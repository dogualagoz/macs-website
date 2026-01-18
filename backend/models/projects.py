from sqlalchemy import Column, Integer, Boolean, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base

class ProjectStatus(enum.Enum):
    """Proje durumları"""
    PLANNING = "PLANNING"  # Planlama aşamasında
    IN_PROGRESS = "IN_PROGRESS"  # Geliştirme aşamasında
    COMPLETED = "COMPLETED"  # Tamamlandı
    ON_HOLD = "ON_HOLD"  # Beklemede
    CANCELLED = "CANCELLED"  # İptal edildi


class ProjectType(enum.Enum):
    """Proje tipleri"""
    DEVELOPED_BY_MACS = "DEVELOPED_BY_MACS"  # MACS tarafından geliştirilen
    SUPPORTED_BY_MACS = "SUPPORTED_BY_MACS"  # MACS tarafından desteklenen
    MEMBER_SHOWCASE = "MEMBER_SHOWCASE"  # Üye projesi

class Project(Base):
    """
    Proje modeli.
    
    Attributes:
        id: Proje ID'si
        title: Proje başlığı
        slug: URL-dostu başlık
        description: Kısa açıklama
        content: Detaylı içerik
        image_url: Proje görseli URL'i
        github_url: GitHub repository URL'i
        live_url: Canlı demo URL'i
        status: Proje durumu
        project_type: Proje tipi (DEVELOPED_BY_MACS, SUPPORTED_BY_MACS, MEMBER_SHOWCASE)
        category_id: Kategori ID'si
        category: Kategori ilişkisi
        created_by: Oluşturan kullanıcı ID'si
        creator: Kullanıcı ilişkisi
        member_relationships: Proje ekip üyeleri (Many-to-Many via ProjectMember)
        team_members: DEPRECATED - Eski string formatı (geriye uyumluluk için)
        is_active: Proje aktif mi?
        is_deleted: Proje silindi mi?
    """
    __tablename__ = "projects"

    # Temel bilgiler
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    description = Column(String)
    content = Column(Text)
    image_url = Column(String)
    
    # Proje teknolojileri
    technologies = Column(String)  # JSON string olarak teknolojiler (Python, React, Node.js vb.)
    
    # Proje linkleri
    github_url = Column(String)
    live_url = Column(String)
    
    # Proje durumu
    status = Column(Enum(ProjectStatus), default=ProjectStatus.PLANNING)
    
    # Proje tipi (YENİ)
    project_type = Column(
        Enum(ProjectType), 
        default=ProjectType.DEVELOPED_BY_MACS,
        nullable=False
    )
    
    # İlişkiler
    category_id = Column(Integer, ForeignKey("project_categories.id"))
    category = relationship("ProjectCategory", back_populates="projects")
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    creator = relationship("User", back_populates="projects")
    
    # Member ilişkisi (YENİ - Many-to-Many via ProjectMember)
    member_relationships = relationship(
        "ProjectMember", 
        back_populates="project",
        cascade="all, delete-orphan"  # Proje silinirse ilişkiler de silinir
    )
    
    # DEPRECATED: Eski sistem (geriye uyumluluk için kalsın)
    # Yeni projeler member_relationships kullanmalı
    team_members = Column(String)  # JSON string olarak ekip üyeleri
    
    # Durum bilgileri
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    
    # Zaman damgaları
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    started_at = Column(DateTime)  # Proje başlangıç tarihi
    completed_at = Column(DateTime)  # Proje bitiş tarihi

class ProjectCategory(Base):
    """
    Proje kategorisi modeli.
    
    Attributes:
        id: Kategori ID'si
        name: Kategori adı
        description: Kategori açıklaması
        projects: Bu kategorideki projeler
    """
    __tablename__ = "project_categories"

    # Temel bilgiler
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    icon = Column(String)  # Kategori ikonu (CSS class veya icon name)

    # İlişkiler
    projects = relationship("Project", back_populates="category")

    # Zaman damgaları
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now()) 