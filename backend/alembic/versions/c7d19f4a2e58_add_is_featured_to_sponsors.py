"""add_is_featured_to_sponsors

Revision ID: c7d19f4a2e58
Revises: b1f4c7a92e10
Create Date: 2026-09-10 11:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7d19f4a2e58'
down_revision: Union[str, Sequence[str], None] = 'b1f4c7a92e10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Sponsors tablosuna is_featured sütunu ekle
    op.add_column('sponsors', sa.Column('is_featured', sa.Boolean(), nullable=True, server_default='false'))


def downgrade() -> None:
    """Downgrade schema."""
    # Sponsors tablosundan is_featured sütununu kaldır
    op.drop_column('sponsors', 'is_featured')
