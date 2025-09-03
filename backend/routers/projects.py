from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from unidecode import unidecode
import re

from database import get_db
from models import Project, ProjectCategory, User
from schemas import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse,
    ProjectCategoryCreate, ProjectCategoryUpdate, ProjectCategoryResponse
)
from routers.auth import get_current_user

router = APIRouter(prefix="/projects", tags=["Proje İşlemleri"])

# ==================== PROJE KATEGORİLERİ ====================

@router.get("/categories", response_model=List[ProjectCategoryResponse])
def get_project_categories(db: Session = Depends(get_db)):
    """
    Tüm proje kategorilerini getir.
    """
    categories = db.query(ProjectCategory).all()
    return categories

@router.post("/categories", response_model=ProjectCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_project_category(
    category: ProjectCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Yeni proje kategorisi oluştur.
    """
    
    # Aynı isimde kategori var mı kontrol et
    existing_category = db.query(ProjectCategory).filter(
        ProjectCategory.name == category.name
    ).first()
    
    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu isimde bir kategori zaten mevcut"
        )
    
    db_category = ProjectCategory(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    
    return db_category

@router.get("/categories/{category_id}", response_model=ProjectCategoryResponse)
def get_project_category(category_id: int, db: Session = Depends(get_db)):
    """
    Belirli bir proje kategorisini getir.
    """
    category = db.query(ProjectCategory).filter(ProjectCategory.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kategori bulunamadı"
        )
    return category

@router.put("/categories/{category_id}", response_model=ProjectCategoryResponse)
def update_project_category(
    category_id: int,
    category_update: ProjectCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Proje kategorisini güncelle.
    """
    
    db_category = db.query(ProjectCategory).filter(ProjectCategory.id == category_id).first()
    if not db_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kategori bulunamadı"
        )
    
    update_data = category_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_category, field, value)
    
    db.commit()
    db.refresh(db_category)
    return db_category

@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Proje kategorisini sil.
    """
    db_category = db.query(ProjectCategory).filter(ProjectCategory.id == category_id).first()
    if not db_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kategori bulunamadı"
        )
    
    db.delete(db_category)
    db.commit()
    return None

# ==================== PROJELER ====================

@router.get("", response_model=ProjectListResponse)
def get_projects(
    skip: int = Query(0, ge=0, description="Atlanacak kayıt sayısı"),
    limit: int = Query(10, ge=1, le=100, description="Sayfa başına kayıt sayısı"),
    category_id: Optional[int] = Query(None, description="Kategori ID'si ile filtrele"),
    status: Optional[str] = Query(None, description="Durum ile filtrele"),
    search: Optional[str] = Query(None, description="Başlık veya açıklamada ara"),
    db: Session = Depends(get_db)
):
    """
    Projeleri listeler ve filtreler.
    
    - Arama: Başlığa göre
    - Filtreler: Kategori, durum
    - Sıralama: created_at (en yeni önce)
    - Sayfalama: skip, limit
    """
    # Base query
    query = db.query(Project).filter(Project.is_deleted == False)

    # İsme göre arama
    if search:
        query = query.filter(Project.title.ilike(f"%{search}%"))

    # Kategori filtresi
    if category_id:
        query = query.filter(Project.category_id == category_id)

    # Durum filtresi
    if status:
        query = query.filter(Project.status == status)

    # Sıralama: En yeni önce
    query = query.order_by(Project.created_at.desc())

    # Toplam sayı
    total = query.count()

    # Pagination
    projects = query.offset(skip).limit(limit).all()

    return ProjectListResponse(
        projects=projects,
        total=total,
        page=skip // limit + 1,
        size=limit
    )

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Yeni proje oluşturur.
    
    - Otomatik slug oluşturma
    - Kategori kontrolü
    - is_featured=True ise diğer projelerin is_featured değeri False yapılır
    """
    if project.category_id:
        category = db.query(ProjectCategory).filter(ProjectCategory.id == project.category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Belirtilen kategori bulunamadı")
    
    # Proje verilerini hazırla
    project_data = project.dict()
    
    # Basit slug oluştur
    base_slug = create_slug(project.title)
    
    # Eğer aynı slug varsa sonuna timestamp ekle
    if db.query(Project).filter(Project.slug == base_slug).first():
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        base_slug = f"{base_slug}-{timestamp}"
    
    project_data["slug"] = base_slug
    project_data["created_by"] = current_user.id
    
    # Eğer is_featured True ise diğer projelerin is_featured değerini False yap
    if project_data.get("is_featured", False):
        db.query(Project).filter(Project.is_featured == True).update({"is_featured": False})
    
    # Proje'yi oluştur
    db_project = Project(**project_data)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

# Spesifik route'lar - genel route'lardan önce
@router.get("/featured", response_model=ProjectResponse)
def get_featured_project(db: Session = Depends(get_db)):
    """
    Öne çıkan projeyi getirir.
    is_featured=True olan projeyi döndürür. Yoksa en yeni oluşturulan proje döndürülür.
    """
    # Önce is_featured=True olan aktif projeyi bul
    featured_project = db.query(Project).filter(
        Project.is_featured == True,
        Project.is_deleted == False,
        Project.is_active == True
    ).first()
    
    # Eğer öne çıkarılan proje yoksa, en yeni projeyi bul
    if not featured_project:
        featured_project = db.query(Project).filter(
            Project.is_deleted == False,
            Project.is_active == True
        ).order_by(Project.created_at.desc()).first()
    
    if not featured_project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Öne çıkan proje bulunamadı"
        )
    
    return featured_project

@router.get("/by-slug/{slug}", response_model=ProjectResponse)
def get_project_by_slug(slug: str, db: Session = Depends(get_db)):
    """Slug'a göre proje getirir."""
    db_project = db.query(Project).filter(
        Project.slug == slug,
        Project.is_deleted == False
    ).first()
    
    if not db_project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
    return db_project

def create_slug(title: str) -> str:
    """Başlıktan URL-uyumlu slug oluşturur"""
    # Türkçe karakterleri İngilizce karakterlere çevir
    slug = unidecode(title).lower()
    # Sadece harf, rakam ve tire bırak, diğerlerini tire ile değiştir
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    # Başındaki ve sonundaki tireleri kaldır
    slug = slug.strip('-')
    return slug

# Genel route'lar - spesifik route'lardan sonra
@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    """ID'ye göre proje getirir."""
    db_project = db.query(Project).filter(
        Project.id == project_id,
        Project.is_deleted == False
    ).first()

    if not db_project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
    return db_project

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Proje bilgilerini günceller.
    
    - Başlık değişirse yeni slug oluşturulur
    - Kategori kontrolü yapılır
    - is_featured=True ise diğer projelerin is_featured değeri False yapılır
    """
    db_project = db.query(Project).filter(
        Project.id == project_id,
        Project.is_deleted == False
    ).first()
    
    if not db_project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proje bulunamadı"
        )
    
    # Kategori kontrolü
    if project_update.category_id:
        category = db.query(ProjectCategory).filter(ProjectCategory.id == project_update.category_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Belirtilen kategori bulunamadı"
            )
    
    # Güncelleme verilerini hazırla
    update_data = project_update.dict(exclude_unset=True)
    
    # Slug güncelleme (eğer başlık değiştiyse)
    if "title" in update_data and update_data["title"] != db_project.title:
        base_slug = create_slug(update_data["title"])
        
        # Eğer aynı slug varsa sonuna timestamp ekle
        if db.query(Project).filter(
            Project.slug == base_slug,
            Project.id != project_id
        ).first():
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            base_slug = f"{base_slug}-{timestamp}"
        
        update_data["slug"] = base_slug
    
    # is_featured değiştiriliyorsa ve True ise diğer projelerin is_featured değerini False yap
    if "is_featured" in update_data and update_data["is_featured"] == True:
        db.query(Project).filter(
            Project.id != project_id,
            Project.is_featured == True
        ).update({"is_featured": False})
    
    # Projeyi güncelle
    for field, value in update_data.items():
        setattr(db_project, field, value)
    
    db.commit()
    db.refresh(db_project)
    return db_project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Projeyi soft delete yapar.
    """
    db_project = db.query(Project).filter(
        Project.id == project_id,
        Project.is_deleted == False
    ).first()
    
    if not db_project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proje bulunamadı"
        )
    
    # Soft delete
    db_project.is_deleted = True
    db_project.deleted_at = datetime.now()
    db.commit()
    
    return None

@router.delete("/{project_id}/hard", status_code=status.HTTP_204_NO_CONTENT)
def hard_delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Projeyi kalıcı olarak siler.
    """
    db_project = db.query(Project).filter(Project.id == project_id).first()
    
    if not db_project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proje bulunamadı"
        )
    
    # Hard delete
    db.delete(db_project)
    db.commit()
    
    return None 