"""WhatsApp messaging tables and notification_logs extensions

Revision ID: 004_whatsapp_messaging
Revises: 003_staff_members
Create Date: 2026-07-07
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "004_whatsapp_messaging"
down_revision: Union[str, None] = "003_staff_members"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE notificationstatus ADD VALUE IF NOT EXISTS 'delivered'")
    op.execute("ALTER TYPE notificationstatus ADD VALUE IF NOT EXISTS 'undelivered'")
    op.execute("ALTER TYPE notificationstatus ADD VALUE IF NOT EXISTS 'read'")

    message_direction = postgresql.ENUM(
        "inbound", "outbound", name="messagedirection", create_type=False
    )
    conversation_state = postgresql.ENUM(
        "bot", "escalated", "closed", name="conversationstate", create_type=False
    )
    escalation_status = postgresql.ENUM(
        "open", "claimed", "resolved", name="escalationstatus", create_type=False
    )
    message_direction.create(op.get_bind(), checkfirst=True)
    conversation_state.create(op.get_bind(), checkfirst=True)
    escalation_status.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "notification_logs",
        sa.Column(
            "direction",
            message_direction,
            nullable=False,
            server_default="outbound",
        ),
    )
    op.add_column("notification_logs", sa.Column("message_body", sa.Text()))
    op.add_column("notification_logs", sa.Column("twilio_status", sa.String(20)))
    op.add_column("notification_logs", sa.Column("error_code", sa.String(20)))
    op.add_column("notification_logs", sa.Column("error_message", sa.Text()))
    op.add_column("notification_logs", sa.Column("delivered_at", sa.DateTime(timezone=True)))

    op.create_table(
        "whatsapp_conversations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("customer_phone", sa.String(20), nullable=False, unique=True),
        sa.Column("state", conversation_state, nullable=False, server_default="bot"),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("order_id", sa.String(20), sa.ForeignKey("orders.id")),
        sa.Column("unknown_strikes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_message_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index(
        "ix_whatsapp_conversations_customer_phone",
        "whatsapp_conversations",
        ["customer_phone"],
        unique=True,
    )

    op.create_table(
        "whatsapp_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "conversation_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("whatsapp_conversations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("direction", message_direction, nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("twilio_message_sid", sa.String(50)),
        sa.Column("twilio_status", sa.String(20)),
        sa.Column("error_code", sa.String(20)),
        sa.Column("error_message", sa.Text()),
        sa.Column(
            "staff_member_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("staff_members.id"),
        ),
        sa.Column("delivered_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_whatsapp_messages_conversation_id", "whatsapp_messages", ["conversation_id"])
    op.create_index("ix_whatsapp_messages_twilio_message_sid", "whatsapp_messages", ["twilio_message_sid"])

    op.create_table(
        "whatsapp_escalations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "conversation_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("whatsapp_conversations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("reason", sa.String(100), nullable=False),
        sa.Column("status", escalation_status, nullable=False, server_default="open"),
        sa.Column(
            "claimed_by_staff_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("staff_members.id"),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("claimed_at", sa.DateTime(timezone=True)),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_whatsapp_escalations_conversation_id", "whatsapp_escalations", ["conversation_id"])
    op.create_index("ix_whatsapp_escalations_status", "whatsapp_escalations", ["status"])


def downgrade() -> None:
    op.drop_index("ix_whatsapp_escalations_status", table_name="whatsapp_escalations")
    op.drop_index("ix_whatsapp_escalations_conversation_id", table_name="whatsapp_escalations")
    op.drop_table("whatsapp_escalations")
    op.drop_index("ix_whatsapp_messages_twilio_message_sid", table_name="whatsapp_messages")
    op.drop_index("ix_whatsapp_messages_conversation_id", table_name="whatsapp_messages")
    op.drop_table("whatsapp_messages")
    op.drop_index("ix_whatsapp_conversations_customer_phone", table_name="whatsapp_conversations")
    op.drop_table("whatsapp_conversations")

    op.drop_column("notification_logs", "delivered_at")
    op.drop_column("notification_logs", "error_message")
    op.drop_column("notification_logs", "error_code")
    op.drop_column("notification_logs", "twilio_status")
    op.drop_column("notification_logs", "message_body")
    op.drop_column("notification_logs", "direction")

    op.execute("DROP TYPE IF EXISTS escalationstatus")
    op.execute("DROP TYPE IF EXISTS conversationstate")
    op.execute("DROP TYPE IF EXISTS messagedirection")
