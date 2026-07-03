"""staff_members table

Revision ID: 003_staff_members
Revises: 002_location_gps
Create Date: 2026-07-03
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "003_staff_members"
down_revision: Union[str, None] = "002_location_gps"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "staff_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("firebase_uid", sa.String(128), nullable=False),
        sa.Column("display_name", sa.String(100), nullable=False, server_default="Staff"),
        sa.Column("email", sa.String(255), nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_staff_members_firebase_uid", "staff_members", ["firebase_uid"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_staff_members_firebase_uid", table_name="staff_members")
    op.drop_table("staff_members")
