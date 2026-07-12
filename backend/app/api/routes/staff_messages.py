from datetime import date, datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_staff
from app.models import (
    StaffMember,
    WhatsappConversation,
    WhatsappEscalation,
    WhatsappMessage,
)
from app.models.enums import ConversationState, EscalationStatus
from app.schemas import (
    StaffMessageReply,
    StaffMessageTestSend,
    StaffMessagingAnalytics,
    WhatsappBotConfigResponse,
    WhatsappBotConfigUpdate,
    WhatsappBotPreviewRequest,
    WhatsappBotPreviewResponse,
    WhatsappConversationDetail,
    WhatsappConversationSummary,
    WhatsappEscalationPatch,
    WhatsappEscalationResponse,
    WhatsappMessageResponse,
)
from app.services.twilio_client import send_whatsapp_message
from app.services.whatsapp_analytics import get_messaging_analytics
from app.services.whatsapp_bot_prompt import (
    DEFAULT_SYSTEM_PROMPT,
    get_active_prompt,
    save_active_prompt,
)
from app.services.whatsapp_escalation import send_staff_reply
from app.services.whatsapp_llm import generate_bot_decision

router = APIRouter(
    prefix="/staff/messages",
    tags=["staff-messages"],
    dependencies=[Depends(get_current_staff)],
)


@router.get("/analytics", response_model=StaffMessagingAnalytics)
async def messaging_analytics(
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    db: AsyncSession = Depends(get_db),
) -> StaffMessagingAnalytics:
    from_dt = datetime.combine(from_date, datetime.min.time(), tzinfo=timezone.utc) if from_date else None
    to_dt = (
        datetime.combine(to_date, datetime.max.time(), tzinfo=timezone.utc) if to_date else None
    )
    data = await get_messaging_analytics(db, from_dt=from_dt, to_dt=to_dt)
    return StaffMessagingAnalytics.model_validate(data)


@router.post("/test")
async def send_test_message(payload: StaffMessageTestSend) -> dict:
    body = payload.body or "WashnPick test message from staff dashboard."
    result = await send_whatsapp_message(payload.phone, body)
    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=result.error_message or "Failed to send test message",
        )
    return {"ok": True, "sid": result.sid, "status": result.status}


@router.get("/bot-config", response_model=WhatsappBotConfigResponse)
async def get_bot_config(db: AsyncSession = Depends(get_db)) -> WhatsappBotConfigResponse:
    active = await get_active_prompt(db)
    if not active:
        return WhatsappBotConfigResponse(
            id=None,
            system_prompt=DEFAULT_SYSTEM_PROMPT,
            updated_at=None,
            updated_by_name=None,
        )

    updated_by_name = None
    if active.updated_by_staff_id:
        staff = await db.get(StaffMember, active.updated_by_staff_id)
        if staff:
            updated_by_name = staff.display_name

    return WhatsappBotConfigResponse(
        id=active.id,
        system_prompt=active.system_prompt,
        updated_at=active.updated_at,
        updated_by_name=updated_by_name,
    )


@router.put("/bot-config", response_model=WhatsappBotConfigResponse)
async def update_bot_config(
    payload: WhatsappBotConfigUpdate,
    staff: StaffMember = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db),
) -> WhatsappBotConfigResponse:
    prompt = await save_active_prompt(db, payload.system_prompt, staff.id)
    await db.commit()
    return WhatsappBotConfigResponse(
        id=prompt.id,
        system_prompt=prompt.system_prompt,
        updated_at=prompt.updated_at,
        updated_by_name=staff.display_name,
    )


@router.post("/bot-config/preview", response_model=WhatsappBotPreviewResponse)
async def preview_bot_config(
    payload: WhatsappBotPreviewRequest,
    db: AsyncSession = Depends(get_db),
) -> WhatsappBotPreviewResponse:
    conv_result = await db.execute(
        select(WhatsappConversation).order_by(WhatsappConversation.last_message_at.desc()).limit(1)
    )
    conversation = conv_result.scalar_one_or_none()
    if not conversation:
        conversation = WhatsappConversation(customer_phone="254700000000")

    decision = await generate_bot_decision(
        db,
        conversation,
        system_prompt_override=payload.system_prompt,
        preview_message=payload.sample_message,
    )
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not generate preview. Check OPENAI_API_KEY and WHATSAPP_BOT_ENABLED.",
        )

    return WhatsappBotPreviewResponse(
        action=decision.action,
        message=decision.message,
        reason=decision.reason,
    )


@router.get("/conversations", response_model=list[WhatsappConversationSummary])
async def list_conversations(
    state: ConversationState | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[WhatsappConversationSummary]:
    query = (
        select(WhatsappConversation)
        .options(selectinload(WhatsappConversation.escalations))
        .order_by(WhatsappConversation.last_message_at.desc().nullslast())
    )
    if state:
        query = query.where(WhatsappConversation.state == state)
    else:
        query = query.where(
            or_(
                WhatsappConversation.state == ConversationState.escalated,
                WhatsappConversation.state == ConversationState.bot,
            )
        )

    result = await db.execute(query)
    conversations = result.scalars().all()

    summaries: list[WhatsappConversationSummary] = []
    for conv in conversations:
        last_msg_result = await db.execute(
            select(WhatsappMessage)
            .where(WhatsappMessage.conversation_id == conv.id)
            .order_by(WhatsappMessage.created_at.desc())
            .limit(1)
        )
        last_msg = last_msg_result.scalar_one_or_none()
        open_esc = next(
            (e for e in conv.escalations if e.status in (EscalationStatus.open, EscalationStatus.claimed)),
            None,
        )
        summaries.append(
            WhatsappConversationSummary(
                id=conv.id,
                customer_phone=conv.customer_phone,
                state=conv.state,
                order_id=conv.order_id,
                last_message_at=conv.last_message_at,
                last_message_preview=last_msg.body[:120] if last_msg else None,
                open_escalation_id=open_esc.id if open_esc else None,
            )
        )
    return summaries


@router.get("/conversations/{conversation_id}", response_model=WhatsappConversationDetail)
async def get_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> WhatsappConversationDetail:
    conv = await db.get(WhatsappConversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    msg_result = await db.execute(
        select(WhatsappMessage)
        .where(WhatsappMessage.conversation_id == conv.id)
        .order_by(WhatsappMessage.created_at.asc())
    )
    messages = msg_result.scalars().all()

    esc_result = await db.execute(
        select(WhatsappEscalation)
        .where(WhatsappEscalation.conversation_id == conv.id)
        .order_by(WhatsappEscalation.created_at.desc())
    )
    escalations = esc_result.scalars().all()

    return WhatsappConversationDetail(
        id=conv.id,
        customer_phone=conv.customer_phone,
        state=conv.state,
        order_id=conv.order_id,
        last_message_at=conv.last_message_at,
        messages=[WhatsappMessageResponse.model_validate(m) for m in messages],
        escalations=[WhatsappEscalationResponse.model_validate(e) for e in escalations],
    )


@router.post("/conversations/{conversation_id}/reply", response_model=WhatsappMessageResponse)
async def reply_to_conversation(
    conversation_id: UUID,
    payload: StaffMessageReply,
    staff: StaffMember = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db),
) -> WhatsappMessageResponse:
    conv = await db.get(WhatsappConversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    msg = await send_staff_reply(db, conv, payload.body.strip(), staff.id)
    if conv.state == ConversationState.bot:
        conv.state = ConversationState.escalated
    await db.flush()
    return WhatsappMessageResponse.model_validate(msg)


@router.patch("/escalations/{escalation_id}", response_model=WhatsappEscalationResponse)
async def update_escalation(
    escalation_id: UUID,
    payload: WhatsappEscalationPatch,
    staff: StaffMember = Depends(get_current_staff),
    db: AsyncSession = Depends(get_db),
) -> WhatsappEscalationResponse:
    escalation = await db.get(WhatsappEscalation, escalation_id)
    if not escalation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escalation not found")

    now = datetime.now(timezone.utc)
    if payload.status == EscalationStatus.claimed:
        escalation.status = EscalationStatus.claimed
        escalation.claimed_by_staff_id = staff.id
        escalation.claimed_at = now
    elif payload.status == EscalationStatus.resolved:
        escalation.status = EscalationStatus.resolved
        escalation.resolved_at = now
        conv = await db.get(WhatsappConversation, escalation.conversation_id)
        if conv:
            conv.state = ConversationState.closed

    await db.flush()
    return WhatsappEscalationResponse.model_validate(escalation)
