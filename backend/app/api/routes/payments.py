from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import Order, User
from app.models.enums import OrderStatus, PaymentType
from app.schemas import StkPushRequest, StkPushResponse
from app.services.payments import handle_mpesa_callback, initiate_stk_push

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/mpesa/stk-push", response_model=StkPushResponse)
async def stk_push(
    payload: StkPushRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StkPushResponse:
    order = await db.get(Order, payload.order_id.upper())
    if not order or order.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    payment_type = payload.payment_type
    if order.requires_deposit and not order.deposit_paid:
        payment_type = PaymentType.deposit
    elif payment_type == PaymentType.deposit and not order.requires_deposit:
        payment_type = PaymentType.full

    try:
        payment = await initiate_stk_push(db, order, user, payment_type, payload.phone)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return StkPushResponse(
        payment_id=payment.id,
        checkout_request_id=payment.mpesa_checkout_request_id,
        message="STK push initiated. Check your phone to complete payment.",
    )


@router.post("/mpesa/callback")
async def mpesa_callback(body: dict, db: AsyncSession = Depends(get_db)) -> dict:
    await handle_mpesa_callback(db, body)
    return {"ResultCode": 0, "ResultDesc": "Accepted"}
