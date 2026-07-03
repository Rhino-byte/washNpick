from datetime import datetime

from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import verify_admin
from app.models import Order, OrderStatusHistory, User
from app.models.enums import OrderStatus
from app.schemas import AdminStatusUpdate, BurnUserRequest, FinalTotalUpdate, OrderResponse
from app.services.notifications import send_order_status_whatsapp

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(verify_admin)])


def _order_response(order: Order) -> OrderResponse:
    from app.api.routes.orders import _order_to_response

    return _order_to_response(order)


@router.patch("/users/{user_id}/burn", response_model=dict)
async def burn_user(
    user_id: str,
    payload: BurnUserRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    try:
        uid = UUID(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id") from exc
    user = await db.get(User, uid)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_burned = True
    user.burned_at = datetime.utcnow()
    user.burned_reason = payload.reason
    await db.flush()
    return {"id": str(user.id), "is_burned": True}


@router.patch("/orders/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: str,
    payload: AdminStatusUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id.upper())
        .options(
            selectinload(Order.items),
            selectinload(Order.addresses),
            selectinload(Order.status_history),
        )
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    order.status = payload.status
    db.add(OrderStatusHistory(order_id=order.id, status=payload.status, note=payload.note))
    await db.flush()

    user = await db.get(User, order.user_id)
    if user:
        background_tasks.add_task(_send_notification, order.id, payload.status.value)

    return _order_response(order)


async def _send_notification(order_id: str, status_value: str) -> None:
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Order).where(Order.id == order_id))
        order = result.scalar_one_or_none()
        if not order:
            return
        user = await db.get(User, order.user_id)
        if user:
            await send_order_status_whatsapp(db, order, user, OrderStatus(status_value))
            await db.commit()


@router.patch("/orders/{order_id}/final-total", response_model=OrderResponse)
async def set_final_total(
    order_id: str,
    payload: FinalTotalUpdate,
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id.upper())
        .options(
            selectinload(Order.items),
            selectinload(Order.addresses),
            selectinload(Order.status_history),
        )
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    order.final_total = payload.final_total
    await db.flush()
    return _order_response(order)
