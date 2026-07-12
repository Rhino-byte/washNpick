"""Messaging analytics for staff admin panel."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import NotificationLog, WhatsappEscalation, WhatsappMessage
from app.models.enums import EscalationStatus, MessageDirection, NotificationStatus


def _default_range() -> tuple[datetime, datetime]:
    now = datetime.now(timezone.utc)
    return now - timedelta(days=7), now


async def get_messaging_analytics(
    db: AsyncSession,
    *,
    from_dt: datetime | None = None,
    to_dt: datetime | None = None,
) -> dict:
    if not from_dt or not to_dt:
        from_dt, to_dt = _default_range()

    outbound_q = await db.execute(
        select(
            func.count().label("total"),
            func.sum(
                case((NotificationLog.status == NotificationStatus.delivered, 1), else_=0)
            ).label("delivered"),
            func.sum(
                case((NotificationLog.status == NotificationStatus.sent, 1), else_=0)
            ).label("sent"),
            func.sum(
                case((NotificationLog.status == NotificationStatus.failed, 1), else_=0)
            ).label("failed"),
        ).where(
            NotificationLog.created_at >= from_dt,
            NotificationLog.created_at <= to_dt,
        )
    )
    outbound = outbound_q.one()

    inbound_q = await db.execute(
        select(func.count())
        .select_from(WhatsappMessage)
        .where(
            WhatsappMessage.direction == MessageDirection.inbound,
            WhatsappMessage.created_at >= from_dt,
            WhatsappMessage.created_at <= to_dt,
        )
    )
    inbound_count = inbound_q.scalar() or 0

    error_rows = await db.execute(
        select(
            NotificationLog.error_code,
            NotificationLog.error_message,
            func.count().label("count"),
            func.max(NotificationLog.created_at).label("last_seen"),
            func.max(NotificationLog.message_body).label("sample_message"),
        )
        .where(
            NotificationLog.status == NotificationStatus.failed,
            NotificationLog.created_at >= from_dt,
            NotificationLog.created_at <= to_dt,
            NotificationLog.error_code.isnot(None),
        )
        .group_by(NotificationLog.error_code, NotificationLog.error_message)
        .order_by(func.count().desc())
        .limit(20)
    )

    msg_error_rows = await db.execute(
        select(
            WhatsappMessage.error_code,
            WhatsappMessage.error_message,
            func.count().label("count"),
            func.max(WhatsappMessage.created_at).label("last_seen"),
            func.max(WhatsappMessage.body).label("sample_message"),
        )
        .where(
            WhatsappMessage.error_code.isnot(None),
            WhatsappMessage.created_at >= from_dt,
            WhatsappMessage.created_at <= to_dt,
        )
        .group_by(WhatsappMessage.error_code, WhatsappMessage.error_message)
        .order_by(func.count().desc())
        .limit(20)
    )

    open_esc = await db.execute(
        select(func.count())
        .select_from(WhatsappEscalation)
        .where(WhatsappEscalation.status == EscalationStatus.open)
    )
    resolved_esc = await db.execute(
        select(func.count())
        .select_from(WhatsappEscalation)
        .where(
            WhatsappEscalation.status == EscalationStatus.resolved,
            WhatsappEscalation.resolved_at >= from_dt,
            WhatsappEscalation.resolved_at <= to_dt,
        )
    )

    avg_claim_q = await db.execute(
        select(
            func.avg(
                func.extract("epoch", WhatsappEscalation.claimed_at)
                - func.extract("epoch", WhatsappEscalation.created_at)
            )
        ).where(
            WhatsappEscalation.claimed_at.isnot(None),
            WhatsappEscalation.created_at >= from_dt,
            WhatsappEscalation.created_at <= to_dt,
        )
    )
    avg_claim_seconds = avg_claim_q.scalar()

    recent_failures_q = await db.execute(
        select(NotificationLog)
        .where(
            NotificationLog.status == NotificationStatus.failed,
            NotificationLog.created_at >= from_dt,
        )
        .order_by(NotificationLog.created_at.desc())
        .limit(50)
    )
    recent_failures = [
        {
            "id": str(row.id),
            "order_id": row.order_id,
            "recipient_phone": row.recipient_phone,
            "error_code": row.error_code,
            "error_message": row.error_message,
            "message_body": row.message_body,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in recent_failures_q.scalars().all()
    ]

    def _error_item(row) -> dict:
        return {
            "error_code": row.error_code or "unknown",
            "error_message": row.error_message,
            "count": int(row.count),
            "last_seen": row.last_seen.isoformat() if row.last_seen else None,
            "sample_message": row.sample_message,
        }

    errors = [_error_item(r) for r in error_rows.all()]
    errors.extend(_error_item(r) for r in msg_error_rows.all())
    errors.sort(key=lambda e: e["count"], reverse=True)

    return {
        "from": from_dt.isoformat(),
        "to": to_dt.isoformat(),
        "outbound": {
            "total": int(outbound.total or 0),
            "delivered": int(outbound.delivered or 0),
            "sent": int(outbound.sent or 0),
            "failed": int(outbound.failed or 0),
        },
        "inbound_count": int(inbound_count),
        "escalations": {
            "open": int(open_esc.scalar() or 0),
            "resolved": int(resolved_esc.scalar() or 0),
            "avg_claim_seconds": float(avg_claim_seconds) if avg_claim_seconds else None,
        },
        "errors": errors[:20],
        "recent_failures": recent_failures,
    }
