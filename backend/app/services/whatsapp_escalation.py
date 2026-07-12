"""WhatsApp escalation: staff alerts + conversation state."""

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import WhatsappConversation, WhatsappEscalation, WhatsappMessage
from app.models.enums import ConversationState, EscalationStatus, MessageDirection
from app.services.twilio_client import send_whatsapp_message


async def escalate_conversation(
    db: AsyncSession,
    conversation: WhatsappConversation,
    *,
    reason: str,
    last_message: str,
) -> WhatsappEscalation:
    conversation.state = ConversationState.escalated
    conversation.unknown_strikes = 0

    escalation = WhatsappEscalation(
        conversation_id=conversation.id,
        reason=reason,
        status=EscalationStatus.open,
    )
    db.add(escalation)
    await db.flush()

    customer_reply = (
        "Thanks — a WashnPick team member will reply shortly. "
        "Please keep this chat open."
    )
    result = await send_whatsapp_message(conversation.customer_phone, customer_reply)
    msg = WhatsappMessage(
        conversation_id=conversation.id,
        direction=MessageDirection.outbound,
        body=customer_reply,
        twilio_message_sid=result.sid,
        twilio_status=result.status if result.success else None,
        error_code=result.error_code,
        error_message=result.error_message,
    )
    db.add(msg)

    settings = get_settings()
    snippet = last_message[:120].replace("\n", " ")
    alert_body = f"WashnPick escalation from {conversation.customer_phone}: {snippet}"
    for staff_phone in settings.staff_escalation_phone_list:
        await send_whatsapp_message(staff_phone, alert_body)

    await db.flush()
    return escalation


async def send_staff_reply(
    db: AsyncSession,
    conversation: WhatsappConversation,
    body: str,
    staff_member_id,
) -> WhatsappMessage:
    result = await send_whatsapp_message(conversation.customer_phone, body)
    msg = WhatsappMessage(
        conversation_id=conversation.id,
        direction=MessageDirection.outbound,
        body=body,
        twilio_message_sid=result.sid,
        twilio_status=result.status if result.success else None,
        error_code=result.error_code,
        error_message=result.error_message,
        staff_member_id=staff_member_id,
    )
    db.add(msg)
    conversation.last_message_at = datetime.now(timezone.utc)
    await db.flush()
    return msg
