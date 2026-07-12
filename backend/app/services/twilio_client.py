"""Shared Twilio WhatsApp send helper."""

import asyncio
import time
from typing import Any

from app.core.config import get_settings
from app.services.twilio_phone import to_whatsapp_address
from app.services.twilio_rate_limiter import acquire_send_slot


class TwilioSendResult:
    def __init__(
        self,
        *,
        success: bool,
        sid: str | None = None,
        status: str | None = None,
        error_code: str | None = None,
        error_message: str | None = None,
    ) -> None:
        self.success = success
        self.sid = sid
        self.status = status
        self.error_code = error_code
        self.error_message = error_message


def _is_rate_limit_error(exc: Exception) -> bool:
    code = str(getattr(exc, "code", "") or "")
    status = str(getattr(exc, "status", "") or "")
    return code == "20429" or status == "429"


def _send_sync_once(
    to_phone: str,
    body: str,
    *,
    status_callback: str | None = None,
) -> TwilioSendResult:
    settings = get_settings()
    if not settings.twilio_configured:
        return TwilioSendResult(
            success=False,
            error_code="not_configured",
            error_message="Twilio credentials are not configured",
        )

    from twilio.rest import Client

    client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
    kwargs: dict[str, Any] = {
        "body": body,
        "from_": settings.twilio_whatsapp_from,
        "to": to_whatsapp_address(to_phone),
    }
    callback = status_callback or settings.twilio_status_callback_url
    if callback:
        kwargs["status_callback"] = callback

    message = client.messages.create(**kwargs)
    return TwilioSendResult(
        success=True,
        sid=message.sid,
        status=getattr(message, "status", None) or "queued",
    )


def _send_sync_with_retries(
    to_phone: str,
    body: str,
    *,
    status_callback: str | None = None,
) -> TwilioSendResult:
    last_result: TwilioSendResult | None = None
    for attempt in range(3):
        try:
            return _send_sync_once(to_phone, body, status_callback=status_callback)
        except Exception as exc:
            code = str(getattr(exc, "code", "") or "")
            msg = str(exc)
            if hasattr(exc, "msg"):
                msg = str(exc.msg)
            last_result = TwilioSendResult(
                success=False,
                error_code=code or "send_failed",
                error_message=msg,
            )
            if _is_rate_limit_error(exc) and attempt < 2:
                time.sleep(0.5 * (2**attempt))
                continue
            return last_result
    return last_result or TwilioSendResult(
        success=False,
        error_code="send_failed",
        error_message="Failed to send message",
    )


async def send_whatsapp_message(
    to_phone: str,
    body: str,
    *,
    status_callback: str | None = None,
) -> TwilioSendResult:
    await acquire_send_slot()
    return await asyncio.to_thread(
        _send_sync_with_retries,
        to_phone,
        body,
        status_callback=status_callback,
    )
