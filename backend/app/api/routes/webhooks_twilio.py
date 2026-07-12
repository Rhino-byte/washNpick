"""Twilio webhooks: inbound WhatsApp + delivery status callbacks."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models import NotificationLog, WhatsappMessage
from app.models.enums import NotificationStatus
from app.services.whatsapp_bot import receive_inbound_whatsapp
from app.services.whatsapp_processor import enqueue_inbound_processing

router = APIRouter(prefix="/webhooks/twilio", tags=["webhooks"])


def _validate_twilio_signature(request: Request, form_data: dict[str, str]) -> None:
    settings = get_settings()
    if not settings.twilio_auth_token_validation:
        return
    if not settings.twilio_auth_token:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Twilio not configured")

    signature = request.headers.get("X-Twilio-Signature", "")
    from twilio.request_validator import RequestValidator

    validator = RequestValidator(settings.twilio_auth_token)
    url = str(request.url)
    if not validator.validate(url, form_data, signature):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid Twilio signature")


def _map_twilio_status(twilio_status: str) -> NotificationStatus | None:
    mapping = {
        "queued": NotificationStatus.queued,
        "sent": NotificationStatus.sent,
        "delivered": NotificationStatus.delivered,
        "read": NotificationStatus.read,
        "failed": NotificationStatus.failed,
        "undelivered": NotificationStatus.undelivered,
    }
    return mapping.get(twilio_status.lower())


@router.post("/whatsapp")
async def inbound_whatsapp(request: Request, db: AsyncSession = Depends(get_db)) -> Response:
    form = await request.form()
    form_data = {k: str(v) for k, v in form.items()}
    _validate_twilio_signature(request, form_data)

    from_addr = form_data.get("From", "")
    body = form_data.get("Body", "")
    message_sid = form_data.get("MessageSid", "")

    if from_addr and body and message_sid:
        conversation, is_duplicate = await receive_inbound_whatsapp(
            db,
            from_address=from_addr,
            body=body,
            message_sid=message_sid,
        )
        await db.commit()

        if conversation and not is_duplicate:
            enqueue_inbound_processing(str(conversation.id), message_sid)

    return Response(content="<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", media_type="application/xml")


@router.post("/status")
async def twilio_status_callback(request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    form = await request.form()
    form_data = {k: str(v) for k, v in form.items()}
    _validate_twilio_signature(request, form_data)

    message_sid = form_data.get("MessageSid", "")
    twilio_status = form_data.get("MessageStatus", form_data.get("SmsStatus", ""))
    error_code = form_data.get("ErrorCode") or None
    error_message = form_data.get("ErrorMessage") or None

    if not message_sid:
        return {"ok": True}

    mapped = _map_twilio_status(twilio_status) if twilio_status else None
    now = datetime.now(timezone.utc)

    notif_result = await db.execute(
        select(NotificationLog).where(NotificationLog.twilio_message_sid == message_sid)
    )
    notif = notif_result.scalar_one_or_none()
    if notif:
        if mapped:
            notif.status = mapped
            notif.twilio_status = twilio_status
        if error_code:
            notif.error_code = error_code
        if error_message:
            notif.error_message = error_message
        if mapped in (NotificationStatus.delivered, NotificationStatus.read):
            notif.delivered_at = now

    msg_result = await db.execute(
        select(WhatsappMessage).where(WhatsappMessage.twilio_message_sid == message_sid)
    )
    msg = msg_result.scalar_one_or_none()
    if msg:
        msg.twilio_status = twilio_status
        if error_code:
            msg.error_code = error_code
        if error_message:
            msg.error_message = error_message
        if twilio_status.lower() in ("delivered", "read"):
            msg.delivered_at = now

    await db.commit()
    return {"ok": True}
