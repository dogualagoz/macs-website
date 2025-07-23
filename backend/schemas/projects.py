from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ProjectStatus(str, Enum):
    """Proje durumları"""
    PLANNING = "PLANNING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    ON_HOLD = "ON_HOLD"
    CANCELLED = "CANCELLED"

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
    github_url: Optional[str] = None
    live_url: Optional[str] = None
    status: ProjectStatus = ProjectStatus.PLANNING
    category_id: Optional[int] = None
    team_members: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class ProjectCreate(ProjectBase):
    """Proje oluşturma şeması"""
    pass

class ProjectUpdate(BaseModel):
    """Proje güncelleme şeması"""
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    github_url: Optional[str] = None
    live_url: Optional[str] = None
    status: Optional[ProjectStatus] = None
    category_id: Optional[int] = None
    team_members: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    is_active: Optional[bool] = None

class ProjectResponse(ProjectBase):
    """Proje yanıt şeması"""
    id: int
    created_by: int
    is_active: bool
    is_deleted: bool
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