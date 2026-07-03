from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import Order, User, UserAddress
from app.schemas import (
    AddressInput,
    AddressResponse,
    OrderListItem,
    UserProfileResponse,
    UserProfileUpdate,
)
from app.services.users import build_profile_response, normalize_phone, upsert_address

router = APIRouter(prefix="/me", tags=["users"])


@router.get("", response_model=UserProfileResponse)
async def get_me(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    return await build_profile_response(db, user)


@router.patch("", response_model=UserProfileResponse)
async def update_me(
    payload: UserProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    if payload.first_name is not None:
        user.first_name = payload.first_name.strip() or None
    if payload.last_name is not None:
        user.last_name = payload.last_name.strip() or None
    if payload.phone is not None:
        normalized = normalize_phone(payload.phone)
        existing = await db.execute(
            select(User).where(User.phone == normalized, User.id != user.id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone already in use")
        user.phone = normalized
    await db.flush()
    return await build_profile_response(db, user)


@router.get("/orders", response_model=list[OrderListItem])
async def list_my_orders(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[OrderListItem]:
    result = await db.execute(
        select(Order)
        .where(Order.user_id == user.id)
        .order_by(Order.created_at.desc())
        .limit(50)
    )
    return [OrderListItem.model_validate(o) for o in result.scalars().all()]


@router.get("/addresses", response_model=list[AddressResponse])
async def list_addresses(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AddressResponse]:
    result = await db.execute(
        select(UserAddress).where(UserAddress.user_id == user.id).order_by(UserAddress.is_default.desc())
    )
    return [AddressResponse.model_validate(a) for a in result.scalars().all()]


@router.post("/addresses", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
async def create_address(
    payload: AddressInput,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AddressResponse:
    addr = await upsert_address(db, user, payload, set_default=True)
    return AddressResponse.model_validate(addr)
