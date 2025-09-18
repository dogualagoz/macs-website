"""add_is_featured_column

Revision ID: 63091e5ab38a
Revises: 39979e6a7ecf
Create Date: 2025-09-03 14:48:06.799223

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '63091e5ab38a'
down_revision: Union[str, Sequence[str], None] = '39979e6a7ecf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Events tablosuna is_featured sütunu ekle
    op.add_column('events', sa.Column('is_featured', sa.Boolean(), nullable=True, server_default='false'))
    
    # Projects tablosuna is_featured sütunu ekle
    op.add_column('projects', sa.Column('is_featured', sa.Boolean(), nullable=True, server_default='false'))


def downgrade() -> None:
    """Downgrade schema."""
    # Events tablosundan is_featured sütununu kaldır
    op.drop_column('events', 'is_featured')
    
    # Projects tablosundan is_featured sütununu kaldır
    op.drop_column('projects', 'is_featured')
