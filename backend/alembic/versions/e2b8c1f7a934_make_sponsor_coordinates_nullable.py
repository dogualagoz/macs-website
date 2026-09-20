"""make_sponsor_coordinates_nullable

Revision ID: e2b8c1f7a934
Revises: d1a2b3c4d5e6
Create Date: 2026-09-20 10:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e2b8c1f7a934'
down_revision: Union[str, Sequence[str], None] = 'd1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Kurumsal sponsorlarin (HackerRank, Rade Hosting) Eskisehir'de fiziksel
    # adresi yok. Koordinat zorunlu oldugu surece sehir merkezine sahte pin
    # koymak gerekiyordu; frontend zaten koordinatsiz sponsoru haritadan eliyor.
    op.alter_column('sponsors', 'latitude', existing_type=sa.Float(), nullable=True)
    op.alter_column('sponsors', 'longitude', existing_type=sa.Float(), nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    # NOT NULL geri konmadan once koordinatsiz kayitlar doldurulmali,
    # aksi halde alter_column hata verir.
    op.alter_column('sponsors', 'longitude', existing_type=sa.Float(), nullable=False)
    op.alter_column('sponsors', 'latitude', existing_type=sa.Float(), nullable=False)
