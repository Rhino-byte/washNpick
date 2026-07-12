from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import (
    AddressType,
    ConversationState,
    EscalationStatus,
    MessageDirection,
    OrderStatus,
    PaymentMethod,
    PaymentType,
    ServiceUnit,
    TimeSlot,
)


class AddressInput(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address_line: str | None = None
    area: str | None = None
    formatted_address: str | None = None
    place_id: str | None = None
    label: str = "Home"


class AddressResponse(AddressInput):
    id: UUID
    is_default: bool

    model_config = {"from_attributes": True}


class UserProfileResponse(BaseModel):
    id: UUID
    email: str
    first_name: str | None
    last_name: str | None
    phone: str | None
    is_burned: bool
    profile_complete: bool
    default_address: AddressResponse | None = None

    model_config = {"from_attributes": True}


class UserProfileUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None


class AuthSyncResponse(BaseModel):
    user: UserProfileResponse
    is_new: bool


class ServiceResponse(BaseModel):
    id: str
    name: str
    description: str
    unit: ServiceUnit
    price_per_unit: int
    price_label: str
    turnaround: str
    is_active: bool

    model_config = {"from_attributes": True}


class ServiceSelectionInput(BaseModel):
    service_id: str
    quantity: float = Field(gt=0)


class OrderQuoteRequest(BaseModel):
    services: list[ServiceSelectionInput] = Field(min_length=1)
    estimated_weight_kg: float = Field(default=5, ge=1, le=50)


class OrderQuoteResponse(BaseModel):
    estimated_total: int
    currency: str
    requires_deposit: bool = False
    deposit_percent: int = 0
    deposit_amount: int = 0
    line_items: list[dict]


class OrderCreateRequest(BaseModel):
    services: list[ServiceSelectionInput] = Field(min_length=1)
    estimated_weight_kg: float = Field(default=5, ge=1, le=50)
    special_instructions: str = ""
    pickup_date: date
    pickup_time_slot: TimeSlot
    delivery_date: date | None = None
    same_delivery_address: bool = True
    pickup_address: AddressInput
    delivery_address: AddressInput | None = None
    payment_method: PaymentMethod


class OrderItemResponse(BaseModel):
    service_id: str
    quantity: float
    unit_price: int
    line_total: int

    model_config = {"from_attributes": True}


class OrderListItem(BaseModel):
    id: str
    status: OrderStatus
    estimated_total: int
    pickup_date: date | None
    created_at: datetime

    model_config = {"from_attributes": True}


class OrderAddressResponse(BaseModel):
    type: AddressType
    area: str
    address_line: str | None = None
    formatted_address: str | None
    latitude: float | None
    longitude: float | None

    model_config = {"from_attributes": True}


class StatusHistoryResponse(BaseModel):
    status: OrderStatus
    note: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    id: str
    status: OrderStatus
    estimated_total: int
    final_total: int | None
    payment_method: PaymentMethod | None
    requires_deposit: bool
    deposit_amount: int
    deposit_paid: bool
    estimated_weight_kg: float
    special_instructions: str
    pickup_date: date | None
    pickup_time_slot: TimeSlot | None
    delivery_date: date | None
    same_delivery_address: bool
    items: list[OrderItemResponse]
    addresses: list[OrderAddressResponse]
    status_history: list[StatusHistoryResponse]
    created_at: datetime

    model_config = {"from_attributes": True}


class StkPushRequest(BaseModel):
    order_id: str
    payment_type: PaymentType = PaymentType.full
    phone: str | None = None


class StkPushResponse(BaseModel):
    payment_id: UUID
    checkout_request_id: str | None
    message: str


class CoverageCheckResponse(BaseModel):
    in_coverage: bool
    distance_km: float | None = None


class ReverseGeocodeResponse(BaseModel):
    formatted_address: str
    area: str
    place_id: str | None = None


class BurnUserRequest(BaseModel):
    reason: str


class AdminStatusUpdate(BaseModel):
    status: OrderStatus
    note: str | None = None


class FinalTotalUpdate(BaseModel):
    final_total: int = Field(gt=0)


class StaffMemberResponse(BaseModel):
    id: UUID
    firebase_uid: str
    display_name: str
    email: str

    model_config = {"from_attributes": True}


class StaffOrderListItem(BaseModel):
    id: str
    status: OrderStatus
    estimated_total: int
    pickup_date: date | None
    pickup_time_slot: TimeSlot | None
    created_at: datetime
    customer_first_name: str | None
    customer_last_name: str | None
    customer_phone: str | None


class StaffStatusUpdate(BaseModel):
    status: OrderStatus
    note: str | None = None


class StaffMessageTestSend(BaseModel):
    phone: str = Field(..., min_length=9)
    body: str | None = None


class StaffMessageReply(BaseModel):
    body: str = Field(..., min_length=1, max_length=1600)


class WhatsappEscalationPatch(BaseModel):
    status: EscalationStatus


class WhatsappMessageResponse(BaseModel):
    id: UUID
    direction: MessageDirection
    body: str
    twilio_message_sid: str | None
    twilio_status: str | None
    error_code: str | None
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class WhatsappEscalationResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    reason: str
    status: EscalationStatus
    claimed_by_staff_id: UUID | None
    created_at: datetime
    claimed_at: datetime | None
    resolved_at: datetime | None

    model_config = {"from_attributes": True}


class WhatsappConversationSummary(BaseModel):
    id: UUID
    customer_phone: str
    state: ConversationState
    order_id: str | None
    last_message_at: datetime | None
    last_message_preview: str | None
    open_escalation_id: UUID | None


class WhatsappConversationDetail(BaseModel):
    id: UUID
    customer_phone: str
    state: ConversationState
    order_id: str | None
    last_message_at: datetime | None
    messages: list[WhatsappMessageResponse]
    escalations: list[WhatsappEscalationResponse]


class MessagingErrorBreakdown(BaseModel):
    error_code: str
    error_message: str | None
    count: int
    last_seen: str | None
    sample_message: str | None


class MessagingFailureItem(BaseModel):
    id: str
    order_id: str
    recipient_phone: str
    error_code: str | None
    error_message: str | None
    message_body: str | None
    created_at: str | None


class StaffMessagingAnalytics(BaseModel):
    from_: str = Field(alias="from")
    to: str
    outbound: dict
    inbound_count: int
    escalations: dict
    errors: list[MessagingErrorBreakdown]
    recent_failures: list[MessagingFailureItem]

    model_config = {"populate_by_name": True}


class WhatsappBotConfigResponse(BaseModel):
    id: UUID | None
    system_prompt: str
    updated_at: datetime | None
    updated_by_name: str | None


class WhatsappBotConfigUpdate(BaseModel):
    system_prompt: str = Field(..., min_length=20, max_length=8000)


class WhatsappBotPreviewRequest(BaseModel):
    sample_message: str = Field(..., min_length=1, max_length=1600)
    system_prompt: str | None = Field(default=None, max_length=8000)


class WhatsappBotPreviewResponse(BaseModel):
    action: str
    message: str
    reason: str | None = None
