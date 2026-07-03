from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import NotificationLog, Order, User
from app.models.enums import NotificationStatus, OrderStatus


STATUS_TEMPLATES: dict[OrderStatus, str] = {
    OrderStatus.confirmed: "order_confirmed",
    OrderStatus.pending_pickup: "order_confirmed",
    OrderStatus.collected: "order_collected",
    OrderStatus.out_for_delivery: "rider_en_route",
    OrderStatus.delivered: "order_delivered",
}


def _build_message(template_key: str, order: Order) -> str:
    messages = {
        "order_confirmed": (
            f"WashnPick: Your order {order.id} is confirmed. "
            f"Pickup on {order.pickup_date} ({order.pickup_time_slot})."
        ),
        "order_collected": f"WashnPick: We've collected your laundry. Order {order.id}.",
        "rider_en_route": f"WashnPick: Your clean laundry is on the way! Order {order.id}.",
        "order_delivered": (
            f"WashnPick: Order {order.id} delivered. Thank you for using WashnPick!"
        ),
    }
    return messages.get(template_key, f"WashnPick update for order {order.id}")


async def send_order_status_whatsapp(
    db: AsyncSession,
    order: Order,
    user: User,
    new_status: OrderStatus,
) -> NotificationLog | None:
    template_key = STATUS_TEMPLATES.get(new_status)
    if not template_key or not user.phone:
        return None

    settings = get_settings()
    log = NotificationLog(
        order_id=order.id,
        template_key=template_key,
        recipient_phone=user.phone,
        status=NotificationStatus.queued,
    )
    db.add(log)
    await db.flush()

    if not settings.twilio_account_sid or not settings.twilio_auth_token:
        log.status = NotificationStatus.failed
        return log

    try:
        from twilio.rest import Client

        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        body = _build_message(template_key, order)
        to = user.phone if user.phone.startswith("whatsapp:") else f"whatsapp:{user.phone}"
        message = client.messages.create(
            body=body,
            from_=settings.twilio_whatsapp_from,
            to=to,
        )
        log.twilio_message_sid = message.sid
        log.status = NotificationStatus.sent
    except Exception:
        log.status = NotificationStatus.failed

    await db.flush()
    return log
