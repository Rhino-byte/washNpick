"""WhatsApp bot LLM replies (OpenAI or Gemini)."""

import asyncio
import json
import logging
from dataclasses import dataclass
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import Order, User, WhatsappConversation, WhatsappMessage
from app.models.enums import MessageDirection, OrderStatus
from app.services.whatsapp_bot_prompt import DEFAULT_SYSTEM_PROMPT, get_active_prompt

logger = logging.getLogger(__name__)

LlmProvider = Literal["openai", "gemini"]

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

RESPONSE_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "action": {"type": "string", "enum": ["reply", "escalate"]},
        "message": {"type": "string"},
        "reason": {"type": "string"},
    },
    "required": ["action", "message", "reason"],
    "additionalProperties": False,
}

# Gemini rejects additionalProperties / additional_properties in response_schema.
GEMINI_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "action": {"type": "string", "enum": ["reply", "escalate"]},
        "message": {"type": "string"},
        "reason": {"type": "string"},
    },
    "required": ["action", "message", "reason"],
}

OPENAI_RESPONSE_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "whatsapp_bot_response",
        "strict": True,
        "schema": RESPONSE_JSON_SCHEMA,
    },
}


@dataclass
class LlmBotDecision:
    action: str
    message: str
    reason: str | None = None


def _normalize_provider(provider: str) -> LlmProvider:
    if provider == "gemini":
        return "gemini"
    return "openai"


async def resolve_effective_provider(
    db: AsyncSession,
    *,
    llm_provider_override: str | None = None,
) -> LlmProvider:
    if llm_provider_override in ("openai", "gemini"):
        return llm_provider_override

    active = await get_active_prompt(db)
    if active and active.llm_provider in ("openai", "gemini"):
        return active.llm_provider

    settings = get_settings()
    return _normalize_provider(settings.whatsapp_llm_provider)


async def is_llm_available(db: AsyncSession) -> bool:
    settings = get_settings()
    if not settings.whatsapp_bot_enabled:
        return False
    provider = await resolve_effective_provider(db)
    return settings.llm_provider_configured(provider)


async def _build_context_block(db: AsyncSession, conversation: WhatsappConversation) -> str:
    parts = [f"Customer phone: {conversation.customer_phone}"]

    if conversation.user_id:
        user = await db.get(User, conversation.user_id)
        if user:
            name = " ".join(filter(None, [user.first_name, user.last_name])).strip()
            if name:
                parts.append(f"Customer name: {name}")

    if conversation.order_id:
        order = await db.get(Order, conversation.order_id)
        if order:
            label = STATUS_LABELS.get(
                order.status, order.status.value.replace("_", " ").title()
            )
            parts.append(f"Linked order: {order.id} — status: {label}")

    return "\n".join(parts)


async def _load_history(
    db: AsyncSession,
    conversation_id,
    *,
    limit: int,
) -> list[dict[str, str]]:
    if not conversation_id:
        return []
    result = await db.execute(
        select(WhatsappMessage)
        .where(WhatsappMessage.conversation_id == conversation_id)
        .order_by(WhatsappMessage.created_at.desc())
        .limit(limit)
    )
    messages = list(reversed(result.scalars().all()))
    history: list[dict[str, str]] = []
    for msg in messages:
        role = "assistant" if msg.direction == MessageDirection.outbound else "user"
        history.append({"role": role, "content": msg.body})
    return history


def _parse_decision(raw: str) -> LlmBotDecision | None:
    try:
        data = json.loads(raw)
        action = data.get("action", "reply")
        message = (data.get("message") or "").strip()
        reason = data.get("reason") or None
        if action not in ("reply", "escalate"):
            return None
        if not message and action == "reply":
            return None
        return LlmBotDecision(action=action, message=message, reason=reason)
    except (json.JSONDecodeError, TypeError):
        return None


def _build_system_layers(
    system_prompt: str,
    context_block: str,
    *,
    task_hint: str | None = None,
) -> str:
    parts = [system_prompt, f"Customer context:\n{context_block}"]
    if task_hint:
        parts.append(
            "Use these verified facts for this reply. Do not contradict them.\n"
            f"{task_hint}"
        )
    return "\n\n".join(parts)


async def _call_openai(
    system_prompt: str,
    context_block: str,
    history: list[dict[str, str]],
    *,
    task_hint: str | None = None,
    preview_only: bool = False,
) -> LlmBotDecision | None:
    settings = get_settings()
    if not settings.openai_configured:
        return None

    messages: list[dict[str, str]] = [
        {"role": "system", "content": system_prompt},
        {"role": "system", "content": f"Customer context:\n{context_block}"},
    ]
    if task_hint:
        messages.append(
            {
                "role": "system",
                "content": (
                    "Use these verified facts for this reply. Do not contradict them.\n"
                    f"{task_hint}"
                ),
            }
        )
    messages.extend(history)

    def _run() -> LlmBotDecision | None:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=messages,
            response_format=OPENAI_RESPONSE_SCHEMA,
            temperature=0.4 if not preview_only else 0.6,
            max_tokens=400,
        )
        content = response.choices[0].message.content or ""
        return _parse_decision(content)

    try:
        return await asyncio.to_thread(_run)
    except Exception as exc:
        logger.warning("OpenAI call failed: %s", exc)
        return None


async def _call_gemini(
    system_prompt: str,
    context_block: str,
    history: list[dict[str, str]],
    *,
    task_hint: str | None = None,
    preview_only: bool = False,
) -> LlmBotDecision | None:
    settings = get_settings()
    if not settings.gemini_configured:
        return None

    system_instruction = _build_system_layers(
        system_prompt, context_block, task_hint=task_hint
    )

    def _run() -> LlmBotDecision | None:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.gemini_api_key)
        contents: list[types.Content] = []
        for msg in history:
            role = "model" if msg["role"] == "assistant" else "user"
            contents.append(
                types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=msg["content"])],
                )
            )

        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=GEMINI_RESPONSE_SCHEMA,
                temperature=0.4 if not preview_only else 0.6,
                max_output_tokens=400,
            ),
        )
        content = response.text or ""
        return _parse_decision(content)

    try:
        return await asyncio.to_thread(_run)
    except Exception as exc:
        logger.warning("Gemini call failed: %s", exc)
        return None


async def _call_llm(
    provider: LlmProvider,
    system_prompt: str,
    context_block: str,
    history: list[dict[str, str]],
    *,
    task_hint: str | None = None,
    preview_only: bool = False,
) -> LlmBotDecision | None:
    if provider == "gemini":
        return await _call_gemini(
            system_prompt,
            context_block,
            history,
            task_hint=task_hint,
            preview_only=preview_only,
        )
    return await _call_openai(
        system_prompt,
        context_block,
        history,
        task_hint=task_hint,
        preview_only=preview_only,
    )


async def generate_bot_decision(
    db: AsyncSession,
    conversation: WhatsappConversation,
    *,
    system_prompt_override: str | None = None,
    preview_message: str | None = None,
    task_hint: str | None = None,
    llm_provider_override: str | None = None,
) -> LlmBotDecision | None:
    settings = get_settings()
    if not settings.whatsapp_bot_enabled:
        return None

    provider = await resolve_effective_provider(db, llm_provider_override=llm_provider_override)
    if not settings.llm_provider_configured(provider):
        return None

    if system_prompt_override:
        system_prompt = system_prompt_override
    else:
        active = await get_active_prompt(db)
        system_prompt = active.system_prompt if active else DEFAULT_SYSTEM_PROMPT

    context_block = await _build_context_block(db, conversation)
    history = await _load_history(
        db,
        conversation.id,
        limit=settings.whatsapp_bot_history_limit,
    )

    if preview_message:
        history = history + [{"role": "user", "content": preview_message}]

    return await _call_llm(
        provider,
        system_prompt,
        context_block,
        history,
        task_hint=task_hint,
        preview_only=preview_message is not None,
    )
