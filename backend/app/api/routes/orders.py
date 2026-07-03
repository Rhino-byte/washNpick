from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user, get_optional_user
from app.models import Order, User
from app.models.enums import PaymentMethod, PaymentType
from app.schemas import (
    OrderCreateRequest,
    OrderQuoteRequest,
    OrderQuoteResponse,
    OrderResponse,
    StkPushRequest,
    StkPushResponse,
)
from app.services.notifications import send_order_status_whatsapp
from app.services.payments import initiate_stk_push
from app.services.pricing import check_coverage, create_order, normalize_address, quote_order
from app.services.users import profile_complete, upsert_address

router = APIRouter(prefix="/orders", tags=["orders"])


def _order_to_response(order: Order) -> OrderResponse:
    return OrderResponse(
        id=order.id,
        status=order.status,
        estimated_total=order.estimated_total,
        final_total=order.final_total,
        payment_method=order.payment_method,
        requires_deposit=order.requires_deposit,
        deposit_amount=order.deposit_amount,
        deposit_paid=order.deposit_paid,
        estimated_weight_kg=float(order.estimated_weight_kg),
        special_instructions=order.special_instructions,
        pickup_date=order.pickup_date,
        pickup_time_slot=order.pickup_time_slot,
        delivery_date=order.delivery_date,
        same_delivery_address=order.same_delivery_address,
        items=order.items,
        addresses=order.addresses,
        status_history=sorted(order.status_history, key=lambda h: h.created_at),
        created_at=order.created_at,
    )


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


@router.post("/quote", response_model=OrderQuoteResponse)
async def quote(
    payload: OrderQuoteRequest,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> OrderQuoteResponse:
    try:
        return await quote_order(db, payload, user)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order_endpoint(
    payload: OrderCreateRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    if not profile_complete(user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complete your profile (name and phone) before placing an order",
        )

    in_coverage, _ = check_coverage(
        payload.pickup_address.latitude,
        payload.pickup_address.longitude,
    )
    if not in_coverage:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pickup location is outside our service area",
        )

    if not payload.same_delivery_address and payload.delivery_address:
        del_coverage, _ = check_coverage(
            payload.delivery_address.latitude,
            payload.delivery_address.longitude,
        )
        if not del_coverage:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Delivery location is outside our service area",
            )

    try:
        order = await create_order(db, user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    pickup_normalized = await normalize_address(payload.pickup_address)
    await upsert_address(db, user, pickup_normalized, set_default=True)
    await db.refresh(order, ["items", "addresses", "status_history"])

    if order.status.value in ("confirmed", "pending_pickup"):
        background_tasks.add_task(_notify_status, order.id, order.status.value)

    return _order_to_response(order)


async def _notify_status(order_id: str, status_value: str) -> None:
    from app.core.database import AsyncSessionLocal
    from app.models.enums import OrderStatus

    async with AsyncSessionLocal() as db:
        order = await _load_order(db, order_id)
        if not order:
            return
        user = await db.get(User, order.user_id)
        if user:
            await send_order_status_whatsapp(db, order, user, OrderStatus(status_value))
            await db.commit()


@router.get("/track", response_model=OrderResponse)
async def track_order(
    ref: str = Query(..., min_length=5),
    phone_last4: str = Query(..., min_length=4, max_length=4),
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    order = await _load_order(db, ref)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    user = await db.get(User, order.user_id)
    if not user or not user.phone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    digits = "".join(c for c in phone_last4 if c.isdigit())
    if user.phone[-4:] != digits[-4:]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    return _order_to_response(order)


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    order = await _load_order(db, order_id)
    if not order or order.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return _order_to_response(order)
