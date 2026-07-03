import base64
from datetime import datetime
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import Order, OrderStatusHistory, Payment, User
from app.models.enums import OrderStatus, PaymentMethod, PaymentStatus, PaymentType


async def initiate_stk_push(
    db: AsyncSession,
    order: Order,
    user: User,
    payment_type: PaymentType,
    phone_override: str | None = None,
) -> Payment:
    settings = get_settings()
    phone = phone_override or user.phone
    if not phone:
        raise ValueError("Phone number required for M-Pesa payment")

    if payment_type == PaymentType.deposit:
        amount = order.deposit_amount
    elif payment_type == PaymentType.balance:
        amount = (order.final_total or order.estimated_total) - (
            order.deposit_amount if order.deposit_paid else 0
        )
    else:
        amount = order.estimated_total

    if amount <= 0:
        raise ValueError("Invalid payment amount")

    payment = Payment(
        order_id=order.id,
        payment_type=payment_type,
        method=PaymentMethod.mpesa,
        amount=amount,
        status=PaymentStatus.pending,
    )
    db.add(payment)
    await db.flush()

    if not settings.mpesa_consumer_key:
        payment.mpesa_checkout_request_id = f"DEV-{payment.id}"
        return payment

    token = await _get_mpesa_token(settings)
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(
        f"{settings.mpesa_shortcode}{settings.mpesa_passkey}{timestamp}".encode()
    ).decode()
    phone_digits = phone.lstrip("+")
    if phone_digits.startswith("0"):
        phone_digits = f"254{phone_digits[1:]}"

    payload = {
        "BusinessShortCode": settings.mpesa_shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": amount,
        "PartyA": phone_digits,
        "PartyB": settings.mpesa_shortcode,
        "PhoneNumber": phone_digits,
        "CallBackURL": settings.mpesa_callback_url,
        "AccountReference": order.id,
        "TransactionDesc": f"WashnPick {payment_type.value}",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.mpesa_base_url}/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30.0,
        )
        data = response.json()

    checkout_id = data.get("CheckoutRequestID")
    payment.mpesa_checkout_request_id = checkout_id
    await db.flush()
    return payment


async def _get_mpesa_token(settings) -> str:
    auth = base64.b64encode(
        f"{settings.mpesa_consumer_key}:{settings.mpesa_consumer_secret}".encode()
    ).decode()
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.mpesa_base_url}/oauth/v1/generate?grant_type=client_credentials",
            headers={"Authorization": f"Basic {auth}"},
            timeout=30.0,
        )
        return response.json()["access_token"]


async def handle_mpesa_callback(db: AsyncSession, body: dict) -> None:
    result = body.get("Body", {}).get("stkCallback", {})
    checkout_id = result.get("CheckoutRequestID")
    result_code = result.get("ResultCode")

    if not checkout_id:
        return

    pay_result = await db.execute(
        select(Payment).where(Payment.mpesa_checkout_request_id == checkout_id)
    )
    payment = pay_result.scalar_one_or_none()
    if not payment:
        return

    order = await db.get(Order, payment.order_id)
    if not order:
        return

    if result_code != 0:
        payment.status = PaymentStatus.failed
        return

    payment.status = PaymentStatus.completed
    payment.paid_at = datetime.utcnow()
    metadata = result.get("CallbackMetadata", {}).get("Item", [])
    for item in metadata:
        if item.get("Name") == "MpesaReceiptNumber":
            payment.mpesa_receipt_number = str(item.get("Value"))

    if payment.payment_type == PaymentType.deposit:
        order.deposit_paid = True
        order.status = OrderStatus.pending_pickup
        db.add(
            OrderStatusHistory(
                order_id=order.id,
                status=OrderStatus.confirmed,
                note="Deposit paid via M-Pesa",
            )
        )
        db.add(
            OrderStatusHistory(
                order_id=order.id,
                status=OrderStatus.pending_pickup,
                note="Awaiting pickup",
            )
        )
    elif payment.payment_type == PaymentType.full:
        order.status = OrderStatus.pending_pickup
        db.add(
            OrderStatusHistory(
                order_id=order.id,
                status=OrderStatus.confirmed,
                note="Full payment via M-Pesa",
            )
        )
        db.add(
            OrderStatusHistory(
                order_id=order.id,
                status=OrderStatus.pending_pickup,
                note="Awaiting pickup",
            )
        )

    await db.flush()
