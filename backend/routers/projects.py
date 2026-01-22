from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Union
from datetime import datetime
from unidecode import unidecode
import re

from database import get_db
from models import Project, ProjectCategory, User, Member, ProjectMember
from schemas import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse,
    ProjectCategoryCreate, ProjectCategoryUpdate, ProjectCategoryResponse,
    ProjectMemberInput, ProjectMemberUpdate
)
from routers.auth import get_current_user

router = APIRouter(prefix="/projects", tags=["projects"])

# ==================== HELPER FUNCTIONS ====================

def create_slug(title: str) -> str:
    """
    Başlıktan URL-uyumlu slug oluşturur.
    
    Args:
        title: Proje başlığı
        
    Returns:
        URL-uyumlu slug
    """
    # Türkçe karakterleri İngilizce karakterlere çevir
    slug = unidecode(title).lower()
    # Sadece harf, rakam ve tire bırak, diğerlerini tire ile değiştir
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    # Başındaki ve sonundaki tireleri kaldır
    slug = slug.strip('-')
    return slug


def get_project_query_with_members(db: Session):
    """
    Project query'sine eager loading ekler (member'ları da yükler).
    
    Args:
        db: Database session
        
    Returns:
        Query object with joinedload
    """
    return db.query(Project).options(
        joinedload(Project.member_relationships).joinedload(ProjectMember.member)
    )


def populate_project_members(project: Union[Project, List[Project]]) -> None:
    """
    Project veya project listesine members attribute'u ekler.
    
    Args:
        project: Tek bir Project veya Project listesi
    """
    if isinstance(project, list):
        for p in project:
            p.members = [pm.member for pm in p.member_relationships if pm.member]
    else:
        project.members = [pm.member for pm in project.member_relationships if pm.member]


def handle_member_ids(db: Session, project_id: int, member_ids: List[ProjectMemberInput]) -> None:
    """
    Projeye member'ları ekler veya günceller.
    
    Args:
        db: Database session
        project_id: Proje ID'si
        member_ids: Eklenecek member'ların listesi
    """
    # Mevcut member ilişkilerini sil
    db.query(ProjectMember).filter(ProjectMember.project_id == project_id).delete()
    
    # Yeni member ilişkilerini ekle
    for member_input in member_ids:
        member_id = member_input.member_id
        
        # Member'ın var olduğunu kontrol et
        member = db.query(Member).filter(Member.id == member_id).first()
        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Member ID {member_id} bulunamadı"
            )
        
        # ProjectMember ilişkisi oluştur
        project_member = ProjectMember(
            project_id=project_id,
            member_id=member_id,
            role=member_input.role,
            contribution_count=1  # Otomatik olarak 1'den başlar
        )
        db.add(project_member)


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
    # Base query with eager loading
    query = get_project_query_with_members(db).filter(
        Project.is_deleted == False,
        Project.is_active == True
    )

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
    
    # Members listesini doldur
    populate_project_members(projects)

    return ProjectListResponse(
        projects=projects,
        total=total,
        page=skip // limit + 1,
        size=limit
    )

@router.get("/admin", response_model=ProjectListResponse)
def get_projects_admin(
    skip: int = Query(0, ge=0, description="Atlanacak kayıt sayısı"),
    limit: int = Query(50, ge=1, le=200, description="Sayfa başına kayıt sayısı"),
    category_id: Optional[int] = Query(None, description="Kategori ID'si ile filtrele"),
    status: Optional[str] = Query(None, description="Durum ile filtrele"),
    search: Optional[str] = Query(None, description="Başlık veya açıklamada ara"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Admin/mode için projeleri listeler. Pasif projeler de dahildir.
    """
    query = db.query(Project).options(
        joinedload(Project.member_relationships).joinedload(ProjectMember.member)
    ).filter(
        Project.is_deleted == False
    )

    if search:
        query = query.filter(Project.title.ilike(f"%{search}%"))

    if category_id:
        query = query.filter(Project.category_id == category_id)

    if status:
        query = query.filter(Project.status == status)

    query = query.order_by(Project.created_at.desc())

    total = query.count()
    projects = query.offset(skip).limit(limit).all()
    
    # Her proje için members listesini oluştur
    for project in projects:
        project.members = [pm.member for pm in project.member_relationships if pm.member]

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
    featured_project = db.query(Project).options(
        joinedload(Project.member_relationships).joinedload(ProjectMember.member)
    ).filter(
        Project.is_featured == True,
        Project.is_deleted == False,
        Project.is_active == True
    ).first()
    
    # Eğer öne çıkarılan proje yoksa, en yeni projeyi bul
    if not featured_project:
        featured_project = db.query(Project).options(
            joinedload(Project.member_relationships).joinedload(ProjectMember.member)
        ).filter(
            Project.is_deleted == False,
            Project.is_active == True
        ).order_by(Project.created_at.desc()).first()
    
    if not featured_project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Öne çıkan proje bulunamadı"
        )
    
    # Members listesini oluştur
    featured_project.members = [pm.member for pm in featured_project.member_relationships if pm.member]
    
    return featured_project

@router.get("/by-slug/{slug}", response_model=ProjectResponse)
def get_project_by_slug(slug: str, db: Session = Depends(get_db)):
    """Slug'a göre proje getirir."""
    db_project = db.query(Project).options(
        joinedload(Project.member_relationships).joinedload(ProjectMember.member)
    ).filter(
        Project.slug == slug,
        Project.is_deleted == False,
        Project.is_active == True
    ).first()
    
    if not db_project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
    
    # Members listesini oluştur
    db_project.members = [pm.member for pm in db_project.member_relationships if pm.member]
    
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
    db_project = db.query(Project).options(
        joinedload(Project.member_relationships).joinedload(ProjectMember.member)
    ).filter(
        Project.id == project_id,
        Project.is_deleted == False,
        Project.is_active == True
    ).first()

    if not db_project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
    
    # Members listesini oluştur
    db_project.members = [pm.member for pm in db_project.member_relationships if pm.member]
    
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
    - member_ids ile proje üyeleri güncellenebilir
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
    
    # Member IDs'i ayrı işle (ilişki tablosu için)
    member_ids = update_data.pop("member_ids", None)
    
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
    
    # Member IDs güncellemesi (eğer gönderildiyse)
    if member_ids is not None:
        # Mevcut member ilişkilerini sil
        db.query(ProjectMember).filter(ProjectMember.project_id == project_id).delete()
        
        # Yeni member ilişkilerini ekle
        for member_input in member_ids:
            member_id = member_input.member_id
            
            # Member'ın var olduğunu kontrol et
            member = db.query(Member).filter(Member.id == member_id).first()
            if not member:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Member ID {member_id} bulunamadı"
                )
            
            # ProjectMember ilişkisi oluştur
            # contribution_count otomatik olarak 1'den başlar
            project_member = ProjectMember(
                project_id=project_id,
                member_id=member_id,
                role=member_input.role,
                contribution_count=1  # Otomatik olarak 1'den başlar
            )
            db.add(project_member)
    
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

# ==================== PROJECT MEMBER YÖNETİMİ ====================

@router.get("/{project_id}/members")
def get_project_members(
    project_id: int,
    db: Session = Depends(get_db)
):
    """
    Projedeki tüm member'ları getirir.
    
    Response:
    [
        {
            "id": 1,
            "project_id": 10,
            "member_id": 1,
            "role": "Lead Developer",
            "contribution_count": 50,
            "member": {
                "id": 1,
                "full_name": "Ahmet Yılmaz",
                "profile_image": "..."
            }
        }
    ]
    """
    # Proje kontrolü
    db_project = db.query(Project).filter(
        Project.id == project_id,
        Project.is_deleted == False
    ).first()
    
    if not db_project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proje bulunamadı"
        )
    
    # Proje member'larını getir
    project_members = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id
    ).all()
    
    # Member bilgilerini de ekle
    result = []
    for pm in project_members:
        member = db.query(Member).filter(Member.id == pm.member_id).first()
        result.append({
            "id": pm.id,
            "project_id": pm.project_id,
            "member_id": pm.member_id,
            "role": pm.role,
            "contribution_count": pm.contribution_count,
            "member": {
                "id": member.id,
                "full_name": member.full_name,
                "profile_image": member.profile_image,
                "is_active": member.is_active
            } if member else None
        })
    
    return result


@router.post("/{project_id}/members", status_code=status.HTTP_201_CREATED)
def add_member_to_project(
    project_id: int,
    member_data: ProjectMemberInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Projeye yeni member ekler.
    
    contribution_count otomatik olarak 1'den başlar.
    
    Request body:
    {
        "member_id": 1,
        "role": "Lead Developer"
    }
    """
    # Proje kontrolü
    db_project = db.query(Project).filter(
        Project.id == project_id,
        Project.is_deleted == False
    ).first()
    
    if not db_project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proje bulunamadı"
        )
    
    member_id = member_data.member_id
    
    # Member kontrolü
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Member ID {member_id} bulunamadı"
        )
    
    # Zaten ekli mi kontrol et
    existing = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.member_id == member_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu member zaten projeye ekli"
        )
    
    # Yeni ProjectMember oluştur
    # contribution_count otomatik olarak 1'den başlar
    project_member = ProjectMember(
        project_id=project_id,
        member_id=member_id,
        role=member_data.role,
        contribution_count=1  # Otomatik olarak 1'den başlar
    )
    
    db.add(project_member)
    db.commit()
    db.refresh(project_member)
    
    return {
        "id": project_member.id,
        "project_id": project_member.project_id,
        "member_id": project_member.member_id,
        "role": project_member.role,
        "contribution_count": project_member.contribution_count,
        "message": "Member başarıyla projeye eklendi"
    }


@router.put("/{project_id}/members/{member_id}")
def update_project_member(
    project_id: int,
    member_id: int,
    member_data: ProjectMemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Projedeki member'ın rolünü veya katkısını günceller.
    
    Request body:
    {
        "role": "Senior Developer",
        "contribution_count": 100
    }
    """
    # ProjectMember ilişkisini bul
    project_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.member_id == member_id
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bu member bu projede bulunamadı"
        )
    
    # Güncelleme
    if member_data.role is not None:
        project_member.role = member_data.role
    if member_data.contribution_count is not None:
        project_member.contribution_count = member_data.contribution_count
    
    db.commit()
    db.refresh(project_member)
    
    return {
        "id": project_member.id,
        "project_id": project_member.project_id,
        "member_id": project_member.member_id,
        "role": project_member.role,
        "contribution_count": project_member.contribution_count,
        "message": "Member bilgileri güncellendi"
    }


@router.delete("/{project_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member_from_project(
    project_id: int,
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Projeden member çıkarır.
    """
    # ProjectMember ilişkisini bul
    project_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.member_id == member_id
    ).first()
    
    if not project_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bu member bu projede bulunamadı"
        )
    
    # İlişkiyi sil
    db.delete(project_member)
    db.commit()
    
    return None
 