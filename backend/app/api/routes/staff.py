from datetime import date, datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_staff
from app.models import Order, OrderStatusHistory, StaffMember, User
from app.models.enums import OrderStatus
from app.schemas import (
    BurnUserRequest,
    FinalTotalUpdate,
    OrderResponse,
    StaffMemberResponse,
    StaffOrderListItem,
    StaffStatusUpdate,
)
from app.services.notifications import send_order_status_whatsapp
from app.services.order_status import validate_status_transition

router = APIRouter(prefix="/staff", tags=["staff"], dependencies=[Depends(get_current_staff)])

EXCLUDED_DEFAULT = {OrderStatus.draft, OrderStatus.cancelled}


def _order_response(order: Order) -> OrderResponse:
    from app.api.routes.orders import _order_to_response

    return _order_to_response(order)


async def _load_order(db: AsyncSession, order_id: str) -> Order | None:
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id.upper())
        .options(
            selectinload(Order.items),
            selectinload(Order.addresses),
            selectinload(Order.status_history),
        )
    )
    return result.scalar_one_or_none()


@router.get("/me", response_model=StaffMemberResponse)
async def staff_me(staff: StaffMember = Depends(get_current_staff)) -> StaffMemberResponse:
    return StaffMemberResponse.model_validate(staff)


@router.get("/orders", response_model=list[StaffOrderListItem])
async def list_staff_orders(
    status_filter: OrderStatus | None = Query(default=None, alias="status"),
    pickup_date: date | None = Query(default=None),
    search: str | None = Query(default=None, min_length=2),
    include_cancelled: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
) -> list[StaffOrderListItem]:
    query = (
        select(Order, User)
        .join(User, Order.user_id == User.id)
        .order_by(Order.pickup_date.asc().nullslast(), Order.created_at.desc())
    )

    if status_filter:
        query = query.where(Order.status == status_filter)
    elif not include_cancelled:
        query = query.where(Order.status.notin_(list(EXCLUDED_DEFAULT)))

    if pickup_date:
        query = query.where(Order.pickup_date == pickup_date)

    if search:
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Order.id.ilike(term),
                User.phone.ilike(term),
                User.first_name.ilike(term),
                User.last_name.ilike(term),
            )
        )

    result = await db.execute(query)
    rows = result.all()

    return [
        StaffOrderListItem(
            id=order.id,
            status=order.status,
            estimated_total=order.estimated_total,
            pickup_date=order.pickup_date,
            pickup_time_slot=order.pickup_time_slot,
            created_at=order.created_at,
            customer_first_name=user.first_name,
            customer_last_name=user.last_name,
            customer_phone=user.phone,
        )
        for order, user in rows
    ]


@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_staff_order(
    order_id: str,
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    order = await _load_order(db, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return _order_response(order)


@router.patch("/orders/{order_id}/status", response_model=OrderResponse)
async def update_staff_order_status(
    order_id: str,
    payload: StaffStatusUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    order = await _load_order(db, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    validate_status_transition(order.status, payload.status)

    order.status = payload.status
    db.add(
        OrderStatusHistory(
            order_id=order.id,
            status=payload.status,
            note=payload.note,
        )
    )
    await db.flush()

    user = await db.get(User, order.user_id)
    if user:
        background_tasks.add_task(_send_notification, order.id, payload.status.value)

    return _order_response(order)


@router.patch("/orders/{order_id}/final-total", response_model=OrderResponse)
async def set_staff_final_total(
    order_id: str,
    payload: FinalTotalUpdate,
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    order = await _load_order(db, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    order.final_total = payload.final_total
    await db.flush()
    return _order_response(order)


@router.patch("/users/{user_id}/burn", response_model=dict)
async def burn_user_staff(
    user_id: str,
    payload: BurnUserRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    from uuid import UUID

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
