from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


# MEMBER SCHEMA

class MemberBase(BaseModel):
    """
    Member için temel schema. Ortak alanları içerir
    """
    full_name: str
    profile_image: Optional[str] = None 

class MemberCreate(MemberBase):
    """
    Yeni member oluşturma için schema.
    """
    pass

class MemberUpdate(BaseModel):
    """
    Member güncelleme için schema. TÜm alanlar opsiyonel
    """
    full_name: Optional[str] = None
    profile_image: Optional[str] = None 
    is_active: Optional[bool] = None 

class MemberResponse(MemberBase):
    """
    Member API response schema.
    Database'den dönen member bilgileri.
    """
    id: int 
    is_active: bool
    created_at: datetime 
    model_config = ConfigDict(from_attributes=True)

class MemberWithStats(MemberResponse):
    """
    Leaderboard için member ve istatistikler:
    """
    project_count: int = 0
    total_contributions: int = 0

# PROJECT MEMBER SCHEMAS 

class ProjectMemberBase(BaseModel):
    """
    ProjectMember için temel schema. Bir member'ın bir projedeki bilgileri.
    """
    member_id: int
    role: Optional[str] = None 
    contribution_count: int = 0

class ProjectMemberCreate(ProjectMemberBase):
    """
    Yeni proje-member ilişkisi oluşturma
    """
    pass

class ProjectMemberResponse(ProjectMemberBase):
    """
    ProjectMember API response.
    
    Response:
    {
        "id": 1,
        "project_id": 10,
        "member_id": 1,
        "role": "Lead Developer",
        "contribution_count": 150
    }
    """
    id: int
    project_id: int
    
    model_config = ConfigDict(from_attributes=True)
# ============================================
# MEMBER WITH PROJECT INFO
# ============================================
class MemberWithProjects(MemberResponse):
    """
    Member + katıldığı projeler.
    """
    projects: list = []  # ProjectMemberResponse listesi (ilerde eklenebilir)