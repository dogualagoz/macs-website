from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime
from models.projects import ProjectStatus, ProjectType
from .members import MemberResponse

class ProjectCategoryBase(BaseModel):
    """Proje kategorisi temel şeması"""
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None

class ProjectCategoryCreate(ProjectCategoryBase):
    """Proje kategorisi oluşturma şeması"""
    pass

class ProjectCategoryUpdate(ProjectCategoryBase):
    """Proje kategorisi güncelleme şeması"""
    name: Optional[str] = None

class ProjectCategoryResponse(ProjectCategoryBase):
    """Proje kategorisi yanıt şeması"""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    """Proje temel şeması"""
    title: str
    description: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    technologies: Optional[str] = None
    github_url: Optional[str] = None
    live_url: Optional[str] = None
    status: ProjectStatus = ProjectStatus.PLANNING
    project_type: ProjectType = ProjectType.DEVELOPED_BY_MACS  # YENİ
    category_id: Optional[int] = None
    team_members: Optional[str] = None  # DEPRECATED
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    is_active: Optional[bool] = True
    is_featured: Optional[bool] = False

class ProjectCreate(ProjectBase):
    """Proje oluşturma şeması"""
    member_ids: Optional[List[dict]] = []  # YENİ: [{"id": 1, "role": "...", "contribution_count": 0}]

class ProjectUpdate(BaseModel):
    """Proje güncelleme şeması"""
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    technologies: Optional[str] = None
    github_url: Optional[str] = None
    live_url: Optional[str] = None
    status: Optional[ProjectStatus] = None
    project_type: Optional[ProjectType] = None  # YENİ
    category_id: Optional[int] = None
    member_ids: Optional[List[dict]] = None  # YENİ
    team_members: Optional[str] = None  # DEPRECATED
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None

class ProjectResponse(ProjectBase):
    """Proje yanıt şeması"""
    id: int
    slug: str
    created_by: int
    members: List[MemberResponse] = []  # YENİ: Member listesi
    is_active: bool
    is_deleted: bool
    is_featured: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    category: Optional[ProjectCategoryResponse] = None

    class Config:
        from_attributes = True

class ProjectListResponse(BaseModel):
    """Proje listesi yanıt şeması"""
    projects: List[ProjectResponse]
    total: int
    page: int
    size: int 