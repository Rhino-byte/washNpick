"""Hybrid WhatsApp bot: deterministic facts + LLM replies (OpenAI or Gemini)."""

import re
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import Order, User, WhatsappConversation, WhatsappMessage
from app.models.enums import ConversationState, MessageDirection, OrderStatus
from app.services.pricing import get_active_services, price_label
from app.services.twilio_client import send_whatsapp_message, send_whatsapp_template
from app.services.twilio_phone import from_whatsapp_address, to_whatsapp_address
from app.services.whatsapp_escalation import escalate_conversation
from app.services.whatsapp_llm import generate_bot_decision, is_llm_available

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

LLM_UNAVAILABLE_REPLY = (
    "Thanks for your message. Our team will get back to you shortly. "
    "Reply SUPPORT if you need help right away."
)

HINT_CONSTRAINTS = (
    "Under 400 chars; plain WhatsApp text; do not invent prices, ETAs, or order status."
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


async def _get_track_facts(
    db: AsyncSession,
    conversation: WhatsappConversation,
    text: str,
) -> str | None:
    """Return verified order-tracking facts for the LLM to phrase naturally."""
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
                f"Order {order_ref} exists but needs verification. "
                "Ask the customer for the last 4 digits of the phone number on the order."
            )
        return (
            f"No order matched reference {order_ref} with the phone digits provided. "
            "Ask them to double-check the reference and last 4 digits."
        )

    if conversation.order_id:
        order = await db.get(Order, conversation.order_id)
        if order:
            return _format_order_status(order)

    if _is_track_request(text):
        return (
            "Customer wants to track an order but no valid reference was found. "
            "Explain they can reply with TRACK and their order reference "
            "(e.g. TRACK WP-20260707-AB12)."
        )

    return None


def _is_support_request(text: str) -> bool:
    lowered = text.lower()
    return any(
        phrase in lowered
        for phrase in (
            "support",
            "talk to support",
            "customer care",
            "agent",
            "speak to someone",
            "talk to someone",
            "real person",
            "human",  # legacy alias
        )
    )


def _is_track_request(text: str) -> bool:
    lowered = text.lower()
    return "track" in lowered or "status" in lowered or ORDER_REF_RE.search(text) is not None


def _contains_any(text: str, phrases: tuple[str, ...]) -> bool:
    return any(p in text for p in phrases)


def _is_greeting_message(lowered: str) -> bool:
    greetings = (
        "hi",
        "hello",
        "hey",
        "habari",
        "mambo",
        "good morning",
        "good afternoon",
        "good evening",
    )
    if lowered in greetings:
        return True
    return any(
        lowered.startswith(f"{g} ") or lowered.startswith(f"{g},") or lowered.startswith(f"{g}!")
        for g in greetings
    )


def _detect_primary_intent(text: str) -> str | None:
    """Return the most specific matching intent (priority order)."""
    lowered = text.lower().strip()

    if _is_support_request(text):
        return "support"
    if _is_track_request(text):
        return "track"
    if _contains_any(
        lowered,
        ("price", "pricing", "cost", "how much", "duvet", "per kg", "kes"),
    ):
        return "pricing"
    if _contains_any(
        lowered,
        ("area", "cover", "deliver", "delivery area", "ololulunga", "far", " km"),
    ) or lowered.endswith("km") or " km" in lowered:
        return "coverage"
    if _contains_any(lowered, ("pickup", "pick up", "collect", "schedule")):
        return "pickup"
    if _contains_any(
        lowered,
        ("late", "missing", "angry", "refund", "complaint", "wrong"),
    ):
        return "complaint"
    if lowered in ("help", "menu", "options", "start") or _contains_any(
        lowered,
        (
            "help",
            "menu",
            "options",
            "services",
            "service",
            "laundry",
            "what do you offer",
            "what can you do",
        ),
    ):
        return "help"
    if _is_greeting_message(lowered):
        return "greeting"
    return None


async def _catalog_facts(db: AsyncSession, *, short: bool = False) -> str:
    services = await get_active_services(db)
    if not services:
        return "No active service prices available."
    lines = [f"- {svc.name}: {price_label(svc)}" for svc in services]
    if short and len(lines) > 3:
        lines = lines[:3]
        lines.append("- (more services available on washnpick.com)")
    return "Verified services (KES):\n" + "\n".join(lines)


def _coverage_facts() -> str:
    settings = get_settings()
    return (
        "Service area: Ololulunga, Kenya "
        f"(approx. {settings.service_area_radius_km:g} km radius from service center). "
        "Orders are placed at washnpick.com."
    )


def _format_task_hint(
    *,
    intent: str,
    facts: str,
    goal: str,
) -> str:
    return (
        f"Intent: {intent}\n"
        f"Facts:\n{facts}\n"
        f"Goal: {goal}\n"
        f"Constraints: {HINT_CONSTRAINTS}"
    )


async def _build_task_hint(
    db: AsyncSession,
    conversation: WhatsappConversation,
    text: str,
) -> str | None:
    intent = _detect_primary_intent(text)
    # Support escalates before the LLM; no hint needed.
    if intent is None or intent == "support":
        return None

    if intent == "track":
        track_facts = await _get_track_facts(db, conversation, text)
        facts = track_facts or (
            "No verified order found yet. Customer should reply TRACK with order ref "
            "(e.g. TRACK WP-20260707-AB12)."
        )
        return _format_task_hint(
            intent="track",
            facts=facts,
            goal=(
                "Tell the customer the status using only Facts. "
                "Offer SUPPORT if they need to change pickup or speak to the team."
            ),
        )

    if intent == "pricing":
        return _format_task_hint(
            intent="pricing",
            facts=await _catalog_facts(db),
            goal=(
                "Answer using only Facts. Offer washnpick.com to place an order, "
                "or SUPPORT for staff."
            ),
        )

    if intent == "coverage":
        return _format_task_hint(
            intent="coverage",
            facts=_coverage_facts(),
            goal=(
                "Explain coverage using only Facts. "
                "Suggest washnpick.com to check/order, or SUPPORT for staff."
            ),
        )

    if intent == "pickup":
        catalog = await _catalog_facts(db, short=True)
        facts = (
            f"{catalog}\n"
            "Pickup scheduling: place an order at washnpick.com to choose a pickup slot."
        )
        return _format_task_hint(
            intent="pickup",
            facts=facts,
            goal=(
                "Explain how to schedule pickup using Facts. "
                "Offer SUPPORT if they need help from the team."
            ),
        )

    if intent == "complaint":
        return _format_task_hint(
            intent="complaint",
            facts="No additional verified case details available.",
            goal=(
                "Acknowledge briefly and prefer action escalate unless a simple FAQ "
                "from conversation history clearly answers them. "
                "Do not invent refunds, ETAs, or promises."
            ),
        )

    # greeting / help
    catalog = await _catalog_facts(db, short=True)
    facts = (
        f"{catalog}\n"
        "Customers can TRACK + order ref, ask about pickup/pricing, "
        "or reply SUPPORT for the team."
    )
    goal = (
        "Short welcome; offer TRACK, pricing, pickup, or SUPPORT."
        if intent == "greeting"
        else (
            "List the main options clearly: TRACK + ref, pricing, pickup, "
            "or SUPPORT for staff."
        )
    )
    return _format_task_hint(intent=intent, facts=facts, goal=goal)


async def _handle_llm_reply(
    db: AsyncSession,
    conversation: WhatsappConversation,
    body: str,
    *,
    task_hint: str | None = None,
) -> None:
    if not await is_llm_available(db):
        conversation.unknown_strikes += 1
        if conversation.unknown_strikes >= 2:
            await escalate_conversation(db, conversation, reason="bot_unknown", last_message=body)
            return
        await _send_bot_reply(db, conversation, LLM_UNAVAILABLE_REPLY)
        return

    decision = await generate_bot_decision(db, conversation, task_hint=task_hint)
    if not decision:
        conversation.unknown_strikes += 1
        if conversation.unknown_strikes >= 2:
            await escalate_conversation(db, conversation, reason="bot_unknown", last_message=body)
            return
        await _send_bot_reply(db, conversation, LLM_UNAVAILABLE_REPLY)
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

    # Legacy/resolved rows may still be closed — reopen for the bot.
    if conversation.state == ConversationState.closed:
        conversation.state = ConversationState.bot
        conversation.unknown_strikes = 0

    text = body.strip()
    if not text:
        return

    if _is_support_request(text):
        await escalate_conversation(db, conversation, reason="customer_request", last_message=body)
        return

    task_hint = await _build_task_hint(db, conversation, text)
    await _handle_llm_reply(db, conversation, body, task_hint=task_hint)


async def initiate_conversation_with_template(
    db: AsyncSession,
    *,
    phone: str,
    content_sid: str,
    content_variables: dict | None = None,
    preview_body: str | None = None,
) -> tuple[WhatsappConversation, WhatsappMessage]:
    """
    Business-initiate a WhatsApp conversation with an approved template.

    Sends the template via the Content API, then logs it as an outbound message
    on the conversation so the chatbot can take over once the customer replies.
    """
    conversation = await get_or_create_conversation(db, to_whatsapp_address(phone))
    conversation.state = ConversationState.bot

    result = await send_whatsapp_template(
        conversation.customer_phone,
        content_sid=content_sid,
        content_variables=content_variables,
    )

    logged_body = preview_body or f"[template {content_sid}]"
    msg = await _log_message(
        db,
        conversation,
        direction=MessageDirection.outbound,
        body=logged_body,
        twilio_sid=result.sid,
        twilio_status=result.status if result.success else None,
        error_code=result.error_code,
        error_message=result.error_message,
    )
    return conversation, msg


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
