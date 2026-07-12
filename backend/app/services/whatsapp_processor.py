"""Async worker for inbound WhatsApp message processing."""

import asyncio
import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models import WhatsappConversation, WhatsappMessage
from app.services.whatsapp_bot import process_conversation_reply

logger = logging.getLogger(__name__)


async def process_inbound_message(conversation_id: str, message_sid: str) -> None:
    async with AsyncSessionLocal() as db:
        try:
            conv = await db.get(WhatsappConversation, UUID(conversation_id))
            if not conv:
                return

            msg_result = await db.execute(
                select(WhatsappMessage).where(WhatsappMessage.twilio_message_sid == message_sid)
            )
            inbound = msg_result.scalar_one_or_none()
            if not inbound:
                return

            await process_conversation_reply(db, conv, inbound.body)
            await db.commit()
        except Exception:
            logger.exception(
                "Failed processing inbound WhatsApp message sid=%s conv=%s",
                message_sid,
                conversation_id,
            )
            await db.rollback()


def enqueue_inbound_processing(conversation_id: str, message_sid: str) -> None:
    asyncio.create_task(process_inbound_message(conversation_id, message_sid))
