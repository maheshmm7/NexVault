"""add is_demo columns

Revision ID: 7a7b7c7d7e7f
Revises: 9c9d9e9f9a9b
Create Date: 2026-05-18 02:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a7b7c7d7e7f'
down_revision: Union[str, Sequence[str], None] = '9c9d9e9f9a9b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add column to payment_sources
    op.add_column('payment_sources', sa.Column('is_demo', sa.Boolean(), nullable=False, server_default=sa.sql.expression.false()))
    # Add column to transactions
    op.add_column('transactions', sa.Column('is_demo', sa.Boolean(), nullable=False, server_default=sa.sql.expression.false()))
    # Add column to coupons
    op.add_column('coupons', sa.Column('is_demo', sa.Boolean(), nullable=False, server_default=sa.sql.expression.false()))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('coupons', 'is_demo')
    op.drop_column('transactions', 'is_demo')
    op.drop_column('payment_sources', 'is_demo')
