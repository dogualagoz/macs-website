"""make_discount_info_nullable

Revision ID: d1a2b3c4d5e6
Revises: c7d19f4a2e58
Create Date: 2026-09-10 12:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'c7d19f4a2e58'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # discount_info artik NULL olabilir (indirimsiz kurumsal sponsorlar icin)
    op.alter_column('sponsors', 'discount_info', existing_type=sa.Text(), nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('sponsors', 'discount_info', existing_type=sa.Text(), nullable=False)
