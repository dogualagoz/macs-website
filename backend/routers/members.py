from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional

from database import get_db
from models import Member, ProjectMember, Project, User
from schemas import (
    MemberCreate, MemberUpdate, MemberResponse, MemberWithStats,
    MemberWithProjects, ProjectMemberResponse
)
from routers.auth import get_current_user

router = APIRouter(prefix="/members", tags=["members"])

# ==================== MEMBER CRUD ====================

@router.post("", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
def create_member(
    member: MemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Yeni member oluşturur.
    
    - Sadece giriş yapmış kullanıcılar oluşturabilir
    - full_name zorunludur
    - profile_image opsiyoneldir
    """
    # Aynı isimde aktif member var mı kontrol et (opsiyonel)
    existing_member = db.query(Member).filter(
        Member.full_name == member.full_name,
        Member.is_active == True
    ).first()
    
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"'{member.full_name}' isimli aktif bir üye zaten mevcut"
        )
    
    # Yeni member oluştur
    db_member = Member(**member.model_dump())
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    
    return db_member


@router.get("", response_model=List[MemberResponse])
def get_members(
    skip: int = Query(0, ge=0, description="Atlanacak kayıt sayısı"),
    limit: int = Query(50, ge=1, le=200, description="Sayfa başına kayıt sayısı"),
    search: Optional[str] = Query(None, description="İsimde ara"),
    is_active: Optional[bool] = Query(None, description="Aktif/pasif filtresi"),
    db: Session = Depends(get_db)
):
    """
    Tüm member'ları listeler.
    
    - Arama: İsme göre
    - Filtreleme: Aktif/pasif duruma göre
    - Sıralama: created_at (en yeni önce)
    - Sayfalama: skip, limit
    """
    # Base query
    query = db.query(Member)
    
    # Aktif/pasif filtresi
    if is_active is not None:
        query = query.filter(Member.is_active == is_active)
    
    # İsme göre arama
    if search:
        query = query.filter(Member.full_name.ilike(f"%{search}%"))
    
    # Sıralama: En yeni önce
    query = query.order_by(Member.created_at.desc())
    
    # Pagination
    members = query.offset(skip).limit(limit).all()
    
    return members


@router.get("/leaderboard", response_model=List[MemberWithStats])
def get_members_leaderboard(
    limit: int = Query(10, ge=1, le=100, description="Gösterilecek üye sayısı"),
    db: Session = Depends(get_db)
):
    """
    Member leaderboard - En çok katkı yapan üyeler.
    
    - Proje sayısına ve toplam katkıya göre sıralanır
    - Sadece aktif member'lar gösterilir
    - Her member için proje sayısı ve toplam contribution_count hesaplanır
    """
    # Member'ları ve istatistiklerini al
    members_with_stats = db.query(
        Member,
        func.count(ProjectMember.id).label('project_count'),
        func.coalesce(func.sum(ProjectMember.contribution_count), 0).label('total_contributions')
    ).outerjoin(
        ProjectMember, Member.id == ProjectMember.member_id
    ).filter(
        Member.is_active == True
    ).group_by(
        Member.id
    ).order_by(
        desc('total_contributions'),
        desc('project_count')
    ).limit(limit).all()
    
    # Response formatına çevir
    result = []
    for member, project_count, total_contributions in members_with_stats:
        member_dict = {
            "id": member.id,
            "full_name": member.full_name,
            "profile_image": member.profile_image,
            "is_active": member.is_active,
            "created_at": member.created_at,
            "project_count": project_count,
            "total_contributions": int(total_contributions)
        }
        result.append(MemberWithStats(**member_dict))
    
    return result


@router.get("/{member_id}", response_model=MemberResponse)
def get_member(member_id: int, db: Session = Depends(get_db)):
    """
    Belirli bir member'ı getirir.
    """
    db_member = db.query(Member).filter(Member.id == member_id).first()
    
    if not db_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Üye bulunamadı"
        )
    
    return db_member


@router.get("/{member_id}/stats", response_model=MemberWithStats)
def get_member_stats(member_id: int, db: Session = Depends(get_db)):
    """
    Member istatistiklerini getirir.
    
    - Katıldığı proje sayısı
    - Toplam katkı sayısı
    """
    # Member'ı kontrol et
    db_member = db.query(Member).filter(Member.id == member_id).first()
    
    if not db_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Üye bulunamadı"
        )
    
    # İstatistikleri hesapla
    stats = db.query(
        func.count(ProjectMember.id).label('project_count'),
        func.coalesce(func.sum(ProjectMember.contribution_count), 0).label('total_contributions')
    ).filter(
        ProjectMember.member_id == member_id
    ).first()
    
    project_count = stats.project_count if stats else 0
    total_contributions = int(stats.total_contributions) if stats else 0
    
    # Response oluştur
    member_dict = {
        "id": db_member.id,
        "full_name": db_member.full_name,
        "profile_image": db_member.profile_image,
        "is_active": db_member.is_active,
        "created_at": db_member.created_at,
        "project_count": project_count,
        "total_contributions": total_contributions
    }
    
    return MemberWithStats(**member_dict)


@router.get("/{member_id}/projects", response_model=List[ProjectMemberResponse])
def get_member_projects(
    member_id: int,
    db: Session = Depends(get_db)
):
    """
    Member'ın katıldığı tüm projeleri getirir.
    
    - ProjectMember ilişkileri döndürülür
    - Her ilişki member'ın o projedeki rolünü ve katkısını içerir
    """
    # Member'ı kontrol et
    db_member = db.query(Member).filter(Member.id == member_id).first()
    
    if not db_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Üye bulunamadı"
        )
    
    # Member'ın proje ilişkilerini getir
    project_memberships = db.query(ProjectMember).filter(
        ProjectMember.member_id == member_id
    ).all()
    
    return project_memberships


@router.put("/{member_id}", response_model=MemberResponse)
def update_member(
    member_id: int,
    member_update: MemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Member bilgilerini günceller.
    
    - full_name, profile_image, is_active güncellenebilir
    - Tüm alanlar opsiyoneldir
    """
    db_member = db.query(Member).filter(Member.id == member_id).first()
    
    if not db_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Üye bulunamadı"
        )
    
    # Güncelleme verilerini hazırla
    update_data = member_update.model_dump(exclude_unset=True)
    
    # Member'ı güncelle
    for field, value in update_data.items():
        setattr(db_member, field, value)
    
    db.commit()
    db.refresh(db_member)
    
    return db_member


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Member'ı soft delete yapar (is_active = False).
    
    - Member silinmez, sadece pasif hale getirilir
    - Proje ilişkileri korunur
    """
    db_member = db.query(Member).filter(Member.id == member_id).first()
    
    if not db_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Üye bulunamadı"
        )
    
    # Soft delete
    db_member.is_active = False
    db.commit()
    
    return None


@router.delete("/{member_id}/hard", status_code=status.HTTP_204_NO_CONTENT)
def hard_delete_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Member'ı kalıcı olarak siler.
    
    ⚠️ DİKKAT: Bu işlem geri alınamaz!
    - Member ve tüm proje ilişkileri silinir (CASCADE)
    - Sadmin yetkisi gerekir
    """
    # Admin kontrolü
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için admin yetkisi gereklidir"
        )
    
    db_member = db.query(Member).filter(Member.id == member_id).first()
    
    if not db_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Üye bulunamadı"
        )
    
    # Hard delete (CASCADE ile ilişkiler de silinir)
    db.delete(db_member)
    db.commit()
    
    return None
