"""backfill user role and status, add server defaults

get_current_user artık status == "approved" şartını arıyor. users.role ve
users.status nullable ve server default'suz olduğu için, uygulama dışında
oluşturulmuş (status NULL) satırlar bu değişiklikten sonra giriş yapamaz hale
gelirdi. Bu migration mevcut erişimi korur:

- NULL status -> "approved": bu satırlar değişiklikten önce de giriş
  yapabiliyordu, migration kimseye yeni yetki vermiyor.
- NULL role -> "moderator": modeldeki default ile aynı.

Yeni satırlar için server default "pending" veriliyor; uygulama üzerinden
kayıt olan herkes admin onayı bekler.

Revision ID: b1f4c7a92e10
Revises: 345ed2086eb2
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1f4c7a92e10'
down_revision: Union[str, Sequence[str], None] = '345ed2086eb2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE users SET role = 'moderator' WHERE role IS NULL")
    op.execute("UPDATE users SET status = 'approved' WHERE status IS NULL")
    op.execute("UPDATE users SET is_active = true WHERE is_active IS NULL")

    op.alter_column('users', 'role',
                    existing_type=sa.String(),
                    nullable=False,
                    server_default='moderator')
    op.alter_column('users', 'status',
                    existing_type=sa.String(),
                    nullable=False,
                    server_default='pending')


def downgrade() -> None:
    op.alter_column('users', 'status',
                    existing_type=sa.String(),
                    nullable=True,
                    server_default=None)
    op.alter_column('users', 'role',
                    existing_type=sa.String(),
                    nullable=True,
                    server_default=None)
