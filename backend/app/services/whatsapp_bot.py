"""Hybrid WhatsApp bot: rule shortcuts + GPT-4o mini fallback."""

import re
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import Order, User, WhatsappConversation, WhatsappMessage
from app.models.enums import ConversationState, MessageDirection, OrderStatus
from app.services.twilio_client import send_whatsapp_message
from app.services.twilio_phone import from_whatsapp_address
from app.services.whatsapp_escalation import escalate_conversation
from app.services.whatsapp_llm import generate_bot_decision

ORDER_REF_RE = re.compile(r"WP-\d{8}-[A-Z0-9]+", re.IGNORECASE)
LAST4_RE = re.compile(r"\b(\d{4})\b")

STATUS_LABELS: dict[OrderStatus, str] = {
    OrderStatus.pending_pickup: "Pending pickup",
    OrderStatus.collected: "Collected",
    OrderStatus.in_progress: "In progress",
    OrderStatus.ready: "Ready",
    OrderStatus.out_for_delivery: "Out for delivery",
    OrderStatus.delivered: "Delivered",
    OrderStatus.confirmed: "Confirmed",
    OrderStatus.completed: "Completed",
    OrderStatus.cancelled: "Cancelled",
}

HELP_MENU = (
    "WashnPick WhatsApp\n\n"
    "Reply with:\n"
    "• TRACK + your order ref (e.g. TRACK WP-20260707-AB12)\n"
    "• PICKUP — schedule info\n"
    "• HUMAN — speak to our team"
)

PICKUP_REPLY = (
    "To schedule a pickup, visit washnpick.co.ke and place an order, "
    "or reply HUMAN to chat with our team."
)

FALLBACK_REPLY = (
    "Sorry, I didn't understand. Reply HELP for options or HUMAN to reach our team."
)


async def get_or_create_conversation(
    db: AsyncSession, from_address: str
) -> WhatsappConversation:
    phone = from_whatsapp_address(from_address)
    result = await db.execute(
        select(WhatsappConversation).where(WhatsappConversation.customer_phone == phone)
    )
    conv = result.scalar_one_or_none()
    if conv:
        return conv

    conv = WhatsappConversation(customer_phone=phone)
    db.add(conv)
    await db.flush()

    user_result = await db.execute(select(User).where(User.phone == phone))
    user = user_result.scalar_one_or_none()
    if user:
        conv.user_id = user.id

    return conv


async def inbound_message_exists(db: AsyncSession, message_sid: str) -> bool:
    if not message_sid:
        return False
    result = await db.execute(
        select(WhatsappMessage.id).where(WhatsappMessage.twilio_message_sid == message_sid)
    )
    return result.scalar_one_or_none() is not None


async def log_inbound_message(
    db: AsyncSession,
    conversation: WhatsappConversation,
    *,
    body: str,
    message_sid: str,
) -> WhatsappMessage:
    return await _log_message(
        db,
        conversation,
        direction=MessageDirection.inbound,
        body=body,
        twilio_sid=message_sid or None,
    )


async def _log_message(
    db: AsyncSession,
    conversation: WhatsappConversation,
    *,
    direction: MessageDirection,
    body: str,
    twilio_sid: str | None = None,
    twilio_status: str | None = None,
    error_code: str | None = None,
    error_message: str | None = None,
    staff_member_id=None,
) -> WhatsappMessage:
    msg = WhatsappMessage(
        conversation_id=conversation.id,
        direction=direction,
        body=body,
        twilio_message_sid=twilio_sid,
        twilio_status=twilio_status,
        error_code=error_code,
        error_message=error_message,
        staff_member_id=staff_member_id,
    )
    db.add(msg)
    conversation.last_message_at = datetime.now(timezone.utc)
    await db.flush()
    return msg


async def _send_bot_reply(
    db: AsyncSession,
    conversation: WhatsappConversation,
    body: str,
) -> None:
    result = await send_whatsapp_message(conversation.customer_phone, body)
    await _log_message(
        db,
        conversation,
        direction=MessageDirection.outbound,
        body=body,
        twilio_sid=result.sid,
        twilio_status=result.status if result.success else None,
        error_code=result.error_code,
        error_message=result.error_message,
    )


async def _load_order_for_track(
    db: AsyncSession,
    order_ref: str,
    phone: str,
    last4: str | None,
) -> Order | None:
    result = await db.execute(select(Order).where(Order.id == order_ref.upper()))
    order = result.scalar_one_or_none()
    if not order:
        return None

    user = await db.get(User, order.user_id)
    if not user or not user.phone:
        return None

    if user.phone != phone:
        return None

    if last4:
        digits = "".join(c for c in last4 if c.isdigit())
        if user.phone[-4:] != digits[-4:]:
            return None

    return order


def _format_order_status(order: Order) -> str:
    label = STATUS_LABELS.get(order.status, order.status.value.replace("_", " ").title())
    pickup = ""
    if order.pickup_date and order.pickup_time_slot:
        pickup = f"\nPickup: {order.pickup_date} ({order.pickup_time_slot.value})"
    return f"Order {order.id}\nStatus: {label}{pickup}"


async def _handle_track(
    db: AsyncSession,
    conversation: WhatsappConversation,
    text: str,
) -> str | None:
    ref_match = ORDER_REF_RE.search(text)
    last4_match = LAST4_RE.search(text)

    if ref_match:
        order_ref = ref_match.group(0).upper()
        last4 = last4_match.group(1) if last4_match else None
        order = await _load_order_for_track(
            db, order_ref, conversation.customer_phone, last4
        )
        if order:
            conversation.order_id = order.id
            conversation.unknown_strikes = 0
            await db.flush()
            return _format_order_status(order)
        if not last4:
            return (
                f"Found order {order_ref}. "
                "Please reply with the last 4 digits of the phone number on the order."
            )
        return "We couldn't find that order. Check the ref and last 4 digits, then try again."

    if conversation.order_id:
        order = await db.get(Order, conversation.order_id)
        if order:
            return _format_order_status(order)

    return (
        "To track your order, reply with TRACK and your order reference "
        "(e.g. TRACK WP-20260707-AB12)."
    )


def _is_human_request(text: str) -> bool:
    lowered = text.lower()
    return any(
        phrase in lowered
        for phrase in ("human", "agent", "speak to someone", "talk to someone", "real person")
    )


def _is_help_request(text: str) -> bool:
    lowered = text.lower().strip()
    return lowered in ("help", "menu", "hi", "hello", "start")


def _is_track_request(text: str) -> bool:
    lowered = text.lower()
    return "track" in lowered or "status" in lowered or ORDER_REF_RE.search(text) is not None


def _is_pickup_request(text: str) -> bool:
    return "pickup" in text.lower()


async def _try_rule_shortcut(
    db: AsyncSession,
    conversation: WhatsappConversation,
    text: str,
    body: str,
) -> bool:
    """Return True if a rule handled the message."""
    if _is_human_request(text):
        await escalate_conversation(db, conversation, reason="customer_request", last_message=body)
        return True

    if _is_help_request(text):
        conversation.unknown_strikes = 0
        await _send_bot_reply(db, conversation, HELP_MENU)
        return True

    if _is_pickup_request(text):
        conversation.unknown_strikes = 0
        await _send_bot_reply(db, conversation, PICKUP_REPLY)
        return True

    if _is_track_request(text) or conversation.order_id:
        reply = await _handle_track(db, conversation, text)
        if reply:
            conversation.unknown_strikes = 0
            await _send_bot_reply(db, conversation, reply)
            return True

    return False


async def _handle_llm_fallback(
    db: AsyncSession,
    conversation: WhatsappConversation,
    body: str,
) -> None:
    settings = get_settings()
    if not settings.whatsapp_bot_enabled or not settings.openai_configured:
        conversation.unknown_strikes += 1
        if conversation.unknown_strikes >= 2:
            await escalate_conversation(db, conversation, reason="bot_unknown", last_message=body)
            return
        await _send_bot_reply(db, conversation, FALLBACK_REPLY)
        return

    decision = await generate_bot_decision(db, conversation)
    if not decision:
        conversation.unknown_strikes += 1
        if conversation.unknown_strikes >= 2:
            await escalate_conversation(db, conversation, reason="bot_unknown", last_message=body)
            return
        await _send_bot_reply(db, conversation, FALLBACK_REPLY)
        return

    if decision.action == "escalate":
        conversation.unknown_strikes = 0
        reason = decision.reason or "llm_escalate"
        await escalate_conversation(db, conversation, reason=reason, last_message=body)
        return

    conversation.unknown_strikes = 0
    await _send_bot_reply(db, conversation, decision.message)


async def process_conversation_reply(
    db: AsyncSession,
    conversation: WhatsappConversation,
    body: str,
) -> None:
    """Generate and send a bot reply for an already-logged inbound message."""
    if conversation.state == ConversationState.escalated:
        return

    text = body.strip()
    if not text:
        return

    handled = await _try_rule_shortcut(db, conversation, text, body)
    if handled:
        return

    await _handle_llm_fallback(db, conversation, body)


async def receive_inbound_whatsapp(
    db: AsyncSession,
    *,
    from_address: str,
    body: str,
    message_sid: str,
) -> tuple[WhatsappConversation | None, bool]:
    """
    Fast webhook path: dedupe, log inbound, return (conversation, is_duplicate).
    Does not send replies — caller should enqueue async processing.
    """
    if await inbound_message_exists(db, message_sid):
        return None, True

    conversation = await get_or_create_conversation(db, from_address)
    await log_inbound_message(
        db,
        conversation,
        body=body,
        message_sid=message_sid,
    )
    return conversation, False
