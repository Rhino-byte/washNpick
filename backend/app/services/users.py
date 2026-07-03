from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, UserAddress
from app.schemas import AddressInput, AddressResponse, UserProfileResponse
from app.services.geocoding import DEFAULT_AREA
from app.services.pricing import normalize_address


def normalize_phone(phone: str) -> str:
    digits = "".join(c for c in phone if c.isdigit())
    if digits.startswith("0"):
        return f"254{digits[1:]}"
    if digits.startswith("254"):
        return digits
    if len(digits) == 9:
        return f"254{digits}"
    return digits


def profile_complete(user: User) -> bool:
    return bool(user.first_name and user.last_name and user.phone)


async def build_profile_response(db: AsyncSession, user: User) -> UserProfileResponse:
    result = await db.execute(
        select(UserAddress)
        .where(UserAddress.user_id == user.id, UserAddress.is_default.is_(True))
        .limit(1)
    )
    default_addr = result.scalar_one_or_none()
    return UserProfileResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        is_burned=user.is_burned,
        profile_complete=profile_complete(user),
        default_address=AddressResponse.model_validate(default_addr) if default_addr else None,
    )


async def upsert_address(
    db: AsyncSession,
    user: User,
    payload: AddressInput,
    set_default: bool = True,
) -> UserAddress:
    payload = await normalize_address(payload)

    if set_default:
        result = await db.execute(select(UserAddress).where(UserAddress.user_id == user.id))
        for addr in result.scalars().all():
            addr.is_default = False

    addr = UserAddress(
        user_id=user.id,
        label=payload.label,
        area=payload.area or DEFAULT_AREA,
        address_line=payload.address_line,
        formatted_address=payload.formatted_address,
        place_id=payload.place_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        is_default=set_default,
    )
    db.add(addr)
    await db.flush()
    return addr
