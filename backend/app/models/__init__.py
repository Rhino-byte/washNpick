import uuid
from datetime import datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import (
    AddressType,
    NotificationChannel,
    NotificationStatus,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    PaymentType,
    ServiceUnit,
    TimeSlot,
)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    firebase_uid: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255))
    first_name: Mapped[str | None] = mapped_column(String(100))
    last_name: Mapped[str | None] = mapped_column(String(100))
    phone: Mapped[str | None] = mapped_column(String(20), unique=True, index=True)
    is_burned: Mapped[bool] = mapped_column(Boolean, default=False)
    burned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    burned_reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    addresses: Mapped[list["UserAddress"]] = relationship(back_populates="user")
    orders: Mapped[list["Order"]] = relationship(back_populates="user")


class UserAddress(Base):
    __tablename__ = "user_addresses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    label: Mapped[str] = mapped_column(String(50), default="Home")
    area: Mapped[str | None] = mapped_column(String(100), default="Ololulunga")
    address_line: Mapped[str | None] = mapped_column(Text)
    formatted_address: Mapped[str | None] = mapped_column(Text)
    place_id: Mapped[str | None] = mapped_column(String(255))
    latitude: Mapped[float] = mapped_column(Numeric(10, 7))
    longitude: Mapped[float] = mapped_column(Numeric(10, 7))
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped["User"] = relationship(back_populates="addresses")


class Service(Base):
    __tablename__ = "services"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text)
    unit: Mapped[ServiceUnit] = mapped_column()
    price_per_unit: Mapped[int] = mapped_column(Integer)
    turnaround: Mapped[str] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    status: Mapped[OrderStatus] = mapped_column(default=OrderStatus.draft)
    estimated_total: Mapped[int] = mapped_column(Integer)
    final_total: Mapped[int | None] = mapped_column(Integer)
    payment_method: Mapped[PaymentMethod | None] = mapped_column()
    requires_deposit: Mapped[bool] = mapped_column(Boolean, default=False)
    deposit_percent: Mapped[int] = mapped_column(Integer, default=0)
    deposit_amount: Mapped[int] = mapped_column(Integer, default=0)
    deposit_paid: Mapped[bool] = mapped_column(Boolean, default=False)
    estimated_weight_kg: Mapped[float] = mapped_column(Numeric(6, 2), default=5)
    special_instructions: Mapped[str] = mapped_column(Text, default="")
    pickup_date: Mapped[datetime | None] = mapped_column(Date)
    pickup_time_slot: Mapped[TimeSlot | None] = mapped_column()
    delivery_date: Mapped[datetime | None] = mapped_column(Date)
    same_delivery_address: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    addresses: Mapped[list["OrderAddress"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )
    status_history: Mapped[list["OrderStatusHistory"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )
    payments: Mapped[list["Payment"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    notifications: Mapped[list["NotificationLog"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    service_id: Mapped[str] = mapped_column(ForeignKey("services.id"))
    quantity: Mapped[float] = mapped_column(Numeric(8, 2))
    unit_price: Mapped[int] = mapped_column(Integer)
    line_total: Mapped[int] = mapped_column(Integer)

    order: Mapped["Order"] = relationship(back_populates="items")
    service: Mapped["Service"] = relationship()


class OrderAddress(Base):
    __tablename__ = "order_addresses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    type: Mapped[AddressType] = mapped_column()
    area: Mapped[str | None] = mapped_column(String(100), default="Ololulunga")
    address_line: Mapped[str | None] = mapped_column(Text)
    formatted_address: Mapped[str | None] = mapped_column(Text)
    place_id: Mapped[str | None] = mapped_column(String(255))
    latitude: Mapped[float] = mapped_column(Numeric(10, 7))
    longitude: Mapped[float] = mapped_column(Numeric(10, 7))

    order: Mapped["Order"] = relationship(back_populates="addresses")


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    status: Mapped[OrderStatus] = mapped_column()
    note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    order: Mapped["Order"] = relationship(back_populates="status_history")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    payment_type: Mapped[PaymentType] = mapped_column()
    method: Mapped[PaymentMethod] = mapped_column()
    amount: Mapped[int] = mapped_column(Integer)
    status: Mapped[PaymentStatus] = mapped_column(default=PaymentStatus.pending)
    mpesa_checkout_request_id: Mapped[str | None] = mapped_column(String(100))
    mpesa_receipt_number: Mapped[str | None] = mapped_column(String(50))
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    order: Mapped["Order"] = relationship(back_populates="payments")


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    channel: Mapped[NotificationChannel] = mapped_column(default=NotificationChannel.whatsapp)
    template_key: Mapped[str] = mapped_column(String(50))
    recipient_phone: Mapped[str] = mapped_column(String(20))
    twilio_message_sid: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[NotificationStatus] = mapped_column(default=NotificationStatus.queued)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    order: Mapped["Order"] = relationship(back_populates="notifications")
