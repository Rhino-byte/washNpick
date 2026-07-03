"""Initial schema

Revision ID: 001_initial
Revises:
Create Date: 2026-06-27
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("firebase_uid", sa.String(128), nullable=False, unique=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("first_name", sa.String(100)),
        sa.Column("last_name", sa.String(100)),
        sa.Column("phone", sa.String(20), unique=True),
        sa.Column("is_burned", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("burned_at", sa.DateTime(timezone=True)),
        sa.Column("burned_reason", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_users_firebase_uid", "users", ["firebase_uid"])
    op.create_index("ix_users_phone", "users", ["phone"])

    op.create_table(
        "user_addresses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("label", sa.String(50), server_default="Home"),
        sa.Column("area", sa.String(100), nullable=False),
        sa.Column("address_line", sa.Text(), nullable=False),
        sa.Column("formatted_address", sa.Text()),
        sa.Column("place_id", sa.String(255)),
        sa.Column("latitude", sa.Numeric(10, 7)),
        sa.Column("longitude", sa.Numeric(10, 7)),
        sa.Column("is_default", sa.Boolean(), server_default="false"),
    )

    service_unit = postgresql.ENUM("kg", "item", name="serviceunit", create_type=False)
    service_unit.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "services",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("unit", service_unit, nullable=False),
        sa.Column("price_per_unit", sa.Integer(), nullable=False),
        sa.Column("turnaround", sa.String(50), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
    )

    order_status = postgresql.ENUM(
        "draft", "pending_deposit", "pending_payment", "confirmed", "pending_pickup",
        "collected", "in_progress", "ready", "out_for_delivery", "delivered", "completed", "cancelled",
        name="orderstatus", create_type=False,
    )
    payment_method = postgresql.ENUM("mpesa", "cod", name="paymentmethod", create_type=False)
    time_slot = postgresql.ENUM("morning", "afternoon", "evening", name="timeslot", create_type=False)
    order_status.create(op.get_bind(), checkfirst=True)
    payment_method.create(op.get_bind(), checkfirst=True)
    time_slot.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "orders",
        sa.Column("id", sa.String(20), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("status", order_status, nullable=False),
        sa.Column("estimated_total", sa.Integer(), nullable=False),
        sa.Column("final_total", sa.Integer()),
        sa.Column("payment_method", payment_method),
        sa.Column("requires_deposit", sa.Boolean(), server_default="false"),
        sa.Column("deposit_percent", sa.Integer(), server_default="0"),
        sa.Column("deposit_amount", sa.Integer(), server_default="0"),
        sa.Column("deposit_paid", sa.Boolean(), server_default="false"),
        sa.Column("estimated_weight_kg", sa.Numeric(6, 2), server_default="5"),
        sa.Column("special_instructions", sa.Text(), server_default=""),
        sa.Column("pickup_date", sa.Date()),
        sa.Column("pickup_time_slot", time_slot),
        sa.Column("delivery_date", sa.Date()),
        sa.Column("same_delivery_address", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    op.create_table(
        "order_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", sa.String(20), sa.ForeignKey("orders.id", ondelete="CASCADE")),
        sa.Column("service_id", sa.String(50), sa.ForeignKey("services.id")),
        sa.Column("quantity", sa.Numeric(8, 2), nullable=False),
        sa.Column("unit_price", sa.Integer(), nullable=False),
        sa.Column("line_total", sa.Integer(), nullable=False),
    )

    address_type = postgresql.ENUM("pickup", "delivery", name="addresstype", create_type=False)
    address_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "order_addresses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", sa.String(20), sa.ForeignKey("orders.id", ondelete="CASCADE")),
        sa.Column("type", address_type, nullable=False),
        sa.Column("area", sa.String(100), nullable=False),
        sa.Column("address_line", sa.Text(), nullable=False),
        sa.Column("formatted_address", sa.Text()),
        sa.Column("place_id", sa.String(255)),
        sa.Column("latitude", sa.Numeric(10, 7)),
        sa.Column("longitude", sa.Numeric(10, 7)),
    )

    op.create_table(
        "order_status_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", sa.String(20), sa.ForeignKey("orders.id", ondelete="CASCADE")),
        sa.Column("status", order_status, nullable=False),
        sa.Column("note", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    payment_type = postgresql.ENUM("deposit", "full", "balance", name="paymenttype", create_type=False)
    payment_status = postgresql.ENUM("pending", "completed", "failed", "refunded", name="paymentstatus", create_type=False)
    payment_type.create(op.get_bind(), checkfirst=True)
    payment_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", sa.String(20), sa.ForeignKey("orders.id", ondelete="CASCADE")),
        sa.Column("payment_type", payment_type, nullable=False),
        sa.Column("method", payment_method, nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("status", payment_status, nullable=False),
        sa.Column("mpesa_checkout_request_id", sa.String(100)),
        sa.Column("mpesa_receipt_number", sa.String(50)),
        sa.Column("paid_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    notification_channel = postgresql.ENUM("whatsapp", name="notificationchannel", create_type=False)
    notification_status = postgresql.ENUM("queued", "sent", "failed", name="notificationstatus", create_type=False)
    notification_channel.create(op.get_bind(), checkfirst=True)
    notification_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "notification_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", sa.String(20), sa.ForeignKey("orders.id", ondelete="CASCADE")),
        sa.Column("channel", notification_channel, server_default="whatsapp"),
        sa.Column("template_key", sa.String(50), nullable=False),
        sa.Column("recipient_phone", sa.String(20), nullable=False),
        sa.Column("twilio_message_sid", sa.String(50)),
        sa.Column("status", notification_status, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )


def downgrade() -> None:
    op.drop_table("notification_logs")
    op.drop_table("payments")
    op.drop_table("order_status_history")
    op.drop_table("order_addresses")
    op.drop_table("order_items")
    op.drop_table("orders")
    op.drop_table("services")
    op.drop_table("user_addresses")
    op.drop_table("users")
    for name in (
        "notificationstatus", "notificationchannel", "paymentstatus", "paymenttype",
        "addresstype", "timeslot", "paymentmethod", "orderstatus", "serviceunit",
    ):
        sa.Enum(name=name).drop(op.get_bind(), checkfirst=True)
