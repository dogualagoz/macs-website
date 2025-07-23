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

def create_slug(title: str) -> str:
    """Başlıktan URL-uyumlu slug oluşturur"""
    # Türkçe karakterleri İngilizce karakterlere çevir
    slug = unidecode(title).lower()
    # Sadece harf, rakam ve tire bırak, diğerlerini tire ile değiştir
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    # Başındaki ve sonundaki tireleri kaldır
    slug = slug.strip('-')
    return slug

# ==================== PROJE KATEGORİLERİ ====================

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

@router.get("/categories", response_model=List[ProjectCategoryResponse])
def get_project_categories(db: Session = Depends(get_db)):
    """
    Tüm proje kategorilerini getir.
    """
    categories = db.query(ProjectCategory).all()
    return categories

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
    
    # Bu kategoride proje var mı kontrol et
    projects_in_category = db.query(Project).filter(Project.category_id == category_id).count()
    if projects_in_category > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu kategoride projeler bulunduğu için silinemez"
        )
    
    db.delete(db_category)
    db.commit()

# ==================== PROJELER ====================

@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Yeni proje oluştur.
    """
    # Proje verilerini dict'e çevir
    project_data = project.dict()
    
    # Otomatik slug oluştur
    base_slug = create_slug(project.title)
    
    # Eğer aynı slug varsa sonuna timestamp ekle
    if db.query(Project).filter(Project.slug == base_slug).first():
        timestamp = int(datetime.now().timestamp())
        base_slug = f"{base_slug}-{timestamp}"
    
    project_data["slug"] = base_slug
    
    # Kategori var mı kontrol et
    if project.category_id:
        category = db.query(ProjectCategory).filter(ProjectCategory.id == project.category_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Belirtilen kategori bulunamadı"
            )
    
    db_project = Project(**project_data, created_by=current_user.id)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    return db_project

@router.get("/", response_model=ProjectListResponse)
def get_projects(
    skip: int = Query(0, ge=0, description="Atlanacak kayıt sayısı"),
    limit: int = Query(10, ge=1, le=100, description="Sayfa başına kayıt sayısı"),
    category_id: Optional[int] = Query(None, description="Kategori ID'si ile filtrele"),
    status: Optional[str] = Query(None, description="Durum ile filtrele"),
    search: Optional[str] = Query(None, description="Başlık veya açıklamada ara"),
    db: Session = Depends(get_db)
):
    """
    Projeleri listele. Filtreleme ve arama özellikleri mevcut.
    """
    query = db.query(Project).filter(Project.is_deleted == False)
    
    # Kategori filtresi
    if category_id:
        query = query.filter(Project.category_id == category_id)
    
    # Durum filtresi
    if status:
        query = query.filter(Project.status == status)
    
    # Arama filtresi
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Project.title.ilike(search_term)) |
            (Project.description.ilike(search_term))
        )
    
    total = query.count()
    projects = query.offset(skip).limit(limit).all()
    
    return ProjectListResponse(
        projects=projects,
        total=total,
        page=skip // limit + 1,
        size=limit
    )

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    """
    Belirli bir projeyi ID ile getir.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proje bulunamadı"
        )
    
    return project

@router.get("/slug/{slug}", response_model=ProjectResponse)
def get_project_by_slug(slug: str, db: Session = Depends(get_db)):
    """
    Belirli bir projeyi slug ile getir.
    """
    project = db.query(Project).filter(
        Project.slug == slug,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proje bulunamadı"
        )
    
    return project

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Projeyi güncelle.
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
    
    # Eğer başlık değiştiyse yeni slug oluştur
    if project_update.title and project_update.title != db_project.title:
        base_slug = create_slug(project_update.title)
        
        # Aynı slug var mı kontrol et (kendisi hariç)
        existing_project = db.query(Project).filter(
            Project.slug == base_slug,
            Project.id != project_id
        ).first()
        
        if existing_project:
            timestamp = int(datetime.now().timestamp())
            base_slug = f"{base_slug}-{timestamp}"
        
        update_data["slug"] = base_slug
    
    # Kategori kontrolü
    if project_update.category_id:
        category = db.query(ProjectCategory).filter(ProjectCategory.id == project_update.category_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Belirtilen kategori bulunamadı"
            )
    
    update_data = project_update.dict(exclude_unset=True)
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
    Projeyi sil (soft delete).
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
    db_project.is_active = False
    db.commit()

@router.delete("/{project_id}/hard", status_code=status.HTTP_204_NO_CONTENT)
def hard_delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Projeyi kalıcı olarak sil (hard delete).
    """
    db_project = db.query(Project).filter(Project.id == project_id).first()
    
    if not db_project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proje bulunamadı"
        )
    
    # Hard delete - veritabanından tamamen sil
    db.delete(db_project)
    db.commit() 