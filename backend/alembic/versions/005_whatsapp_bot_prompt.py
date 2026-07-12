"""WhatsApp bot prompt table

Revision ID: 005_whatsapp_bot_prompt
Revises: 004_whatsapp_messaging
Create Date: 2026-07-12
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "005_whatsapp_bot_prompt"
down_revision: Union[str, None] = "004_whatsapp_messaging"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "whatsapp_bot_prompts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("system_prompt", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "updated_by_staff_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("staff_members.id"),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index(
        "ix_whatsapp_bot_prompts_is_active",
        "whatsapp_bot_prompts",
        ["is_active"],
    )


def downgrade() -> None:
    op.drop_index("ix_whatsapp_bot_prompts_is_active", table_name="whatsapp_bot_prompts")
    op.drop_table("whatsapp_bot_prompts")
