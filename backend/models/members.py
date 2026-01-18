from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey 
from sqlalchemy.orm import relationship
from database import Base
from sqlalchemy.sql import func 

class Member(Base):
    """
    Kulüp üyeleri modeli.
    
    Bu model proje ekip üyelerini temsil eder.
    Authentication gerektirmez, sadece profil bilgileri içerir.
    İlerde User modeli ile bağlanabilir (user_id üzerinden).
    
    Attributes:
        id: Üye ID'si (Primary Key)
        full_name: Üyenin tam adı (zorunlu)
        profile_image: Profil fotoğrafı URL'i (opsiyonel)
        is_active: Üye aktif mi? (soft delete için)
        user_id: İlerde User ile bağlantı için (şimdilik NULL)
        project_memberships: Bu üyenin katıldığı projeler (Many-to-Many ilişki)
        created_at: Oluşturulma zamanı
        updated_at: Son güncellenme zamanı
    """
    __tablename__ = "members"

    #Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Temel Bilgiler
    full_name = Column(String, nullable=False, index=True)

    profile_image = Column(String, nullable=True)

    #Durum 
    is_active = Column(Boolean, default=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    #İlişkiler
    #Bu üyenin katıldığı tüm projeleri ProjectMember üzerinden erişebiliriz
    project_memberships = relationship("ProjectMember", back_populates="member", cascade="all, delete-orphan")
    #Member silinirse ilişkiler de silinir

    # Zaman damgaları
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<Member {self.full_name}>"


# ⚠️ DİKKAT: ProjectMember AYRI CLASS (Member'ın içinde değil!)
class ProjectMember(Base):
    """
    Project ve Member arasındaki Many-to-Many ilişki tablosu.
    
    Bu tablo bir üyenin hangi projelerde yer aldığını ve
    o projedeki rolünü/katkısını tutar.
    
    Attributes:
        id: İlişki ID'si (Primary Key)
        project_id: Proje ID'si (Foreign Key)
        member_id: Üye ID'si (Foreign Key)
        role: Üyenin projedeki rolü (opsiyonel) - örn: "Lead Developer", "Designer"
        contribution_count: Katkı sayısı (leaderboard için)
        project: İlişkili proje (relationship)
        member: İlişkili üye (relationship)
        created_at: İlişki oluşturulma zamanı
    """
    __tablename__ = "project_members"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Foreign Keys
    project_id = Column(
        Integer, 
        ForeignKey("projects.id", ondelete="CASCADE"),  # Proje silinirse ilişki de silinir
        nullable=False,
        index=True  # Sık sorgulanan alan, index ekle
    )
    member_id = Column(
        Integer, 
        ForeignKey("members.id", ondelete="CASCADE"),  # Member silinirse ilişki de silinir
        nullable=False,
        index=True  # Sık sorgulanan alan, index ekle
    )

    # İlişkiye özel bilgiler 
    role = Column(String, nullable=True)  # "Lead Developer", "Designer", vb.
    contribution_count = Column(Integer, default=0)  # Leaderboard için katkı sayısı

    # İlişkiler
    # Project modeline erişim
    project = relationship("Project", back_populates="member_relationships")
    
    # Member modeline erişim
    member = relationship("Member", back_populates="project_memberships")
    
    # Zaman damgası
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<ProjectMember project_id={self.project_id} member_id={self.member_id}>"
