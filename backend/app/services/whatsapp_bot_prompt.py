"""Default and seed WhatsApp bot system prompts."""

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import WhatsappBotPrompt

DEFAULT_SYSTEM_PROMPT = """You are WashnPick's WhatsApp assistant for a laundry pickup and delivery service in Ololulunga, Kenya.

Your role:
- Answer questions about services, pricing, pickup areas, and how to place orders.
- Be friendly, concise, and professional. Keep replies under 500 characters when possible.
- Use plain text suitable for WhatsApp (no markdown).

Rules:
- NEVER invent order status, prices, or delivery times. If you don't know, say so.
- For order tracking, tell the customer to reply with TRACK and their order reference (e.g. TRACK WP-20260707-AB12).
- If the customer is upset, asks for a person, or you cannot help confidently, respond with action "escalate".
- Suggest visiting washnpick.co.ke to place a new order.
- Currency is KES.

You must respond with JSON only in this format:
{"action": "reply" | "escalate", "message": "your reply text", "reason": "optional reason if escalating"}
"""


async def get_active_prompt(db: AsyncSession) -> WhatsappBotPrompt | None:
    result = await db.execute(
        select(WhatsappBotPrompt)
        .where(WhatsappBotPrompt.is_active.is_(True))
        .order_by(WhatsappBotPrompt.updated_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def seed_bot_prompt_if_empty(db: AsyncSession) -> None:
    count = await db.scalar(select(func.count()).select_from(WhatsappBotPrompt))
    if count and count > 0:
        return

    db.add(
        WhatsappBotPrompt(
            system_prompt=DEFAULT_SYSTEM_PROMPT,
            is_active=True,
        )
    )
    await db.flush()


async def save_active_prompt(
    db: AsyncSession,
    system_prompt: str,
    staff_member_id,
) -> WhatsappBotPrompt:
    await db.execute(update(WhatsappBotPrompt).values(is_active=False))
    prompt = WhatsappBotPrompt(
        system_prompt=system_prompt.strip(),
        is_active=True,
        updated_by_staff_id=staff_member_id,
    )
    db.add(prompt)
    await db.flush()
    return prompt
