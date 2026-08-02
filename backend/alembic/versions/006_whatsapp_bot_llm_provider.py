"""WhatsApp bot prompt LLM provider override

Revision ID: 006_whatsapp_bot_llm_provider
Revises: 005_whatsapp_bot_prompt
Create Date: 2026-07-13
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006_whatsapp_bot_llm_provider"
down_revision: Union[str, None] = "005_whatsapp_bot_prompt"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "whatsapp_bot_prompts",
        sa.Column("llm_provider", sa.String(length=16), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("whatsapp_bot_prompts", "llm_provider")
