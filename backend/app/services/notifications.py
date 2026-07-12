from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import NotificationLog, Order, User
from app.models.enums import MessageDirection, NotificationStatus, OrderStatus
from app.services.twilio_client import send_whatsapp_message


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
    body = _build_message(template_key, order)
    log = NotificationLog(
        order_id=order.id,
        template_key=template_key,
        recipient_phone=user.phone,
        direction=MessageDirection.outbound,
        message_body=body,
        status=NotificationStatus.queued,
    )
    db.add(log)
    await db.flush()

    if not settings.twilio_configured:
        log.status = NotificationStatus.failed
        log.error_code = "not_configured"
        log.error_message = "Twilio credentials are not configured"
        await db.flush()
        return log

    result = await send_whatsapp_message(user.phone, body)
    if result.success:
        log.twilio_message_sid = result.sid
        log.status = NotificationStatus.sent
        log.twilio_status = result.status
    else:
        log.status = NotificationStatus.failed
        log.error_code = result.error_code
        log.error_message = result.error_message

    await db.flush()
    return log
