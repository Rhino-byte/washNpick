import enum


class ServiceUnit(str, enum.Enum):
    kg = "kg"
    item = "item"


class OrderStatus(str, enum.Enum):
    draft = "draft"
    pending_deposit = "pending_deposit"
    pending_payment = "pending_payment"
    confirmed = "confirmed"
    pending_pickup = "pending_pickup"
    collected = "collected"
    in_progress = "in_progress"
    ready = "ready"
    out_for_delivery = "out_for_delivery"
    delivered = "delivered"
    completed = "completed"
    cancelled = "cancelled"


class PaymentMethod(str, enum.Enum):
    mpesa = "mpesa"
    cod = "cod"


class PaymentType(str, enum.Enum):
    deposit = "deposit"
    full = "full"
    balance = "balance"


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    refunded = "refunded"


class AddressType(str, enum.Enum):
    pickup = "pickup"
    delivery = "delivery"


class TimeSlot(str, enum.Enum):
    morning = "morning"
    afternoon = "afternoon"
    evening = "evening"


class NotificationChannel(str, enum.Enum):
    whatsapp = "whatsapp"


class NotificationStatus(str, enum.Enum):
    queued = "queued"
    sent = "sent"
    failed = "failed"
