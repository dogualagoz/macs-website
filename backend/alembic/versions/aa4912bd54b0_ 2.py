"""empty message

Revision ID: aa4912bd54b0
Revises: 56785435eb28
Create Date: 2025-07-29 21:53:14.264057

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'aa4912bd54b0'
down_revision: Union[str, Sequence[str], None] = '56785435eb28'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
