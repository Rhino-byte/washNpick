"""Staff roster seeding and helpers."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models import StaffMember


async def seed_staff_from_env(db: AsyncSession, settings: Settings) -> None:
    uids = settings.staff_uid_list
    if not uids:
        return

    count = await db.scalar(select(func.count()).select_from(StaffMember))
    if count and count > 0:
        return

    for uid in uids:
        db.add(
            StaffMember(
                firebase_uid=uid,
                display_name="Staff",
                email="",
                is_active=True,
            )
        )
    await db.flush()


async def get_or_create_staff_member(
    db: AsyncSession,
    firebase_uid: str,
    email: str = "",
    display_name: str = "",
) -> StaffMember:
    result = await db.execute(
        select(StaffMember).where(StaffMember.firebase_uid == firebase_uid)
    )
    member = result.scalar_one_or_none()
    if member:
        if email and member.email != email:
            member.email = email
        if display_name and member.display_name in ("", "Staff") and display_name:
            member.display_name = display_name
        await db.flush()
        return member

    member = StaffMember(
        firebase_uid=firebase_uid,
        email=email,
        display_name=display_name or "Staff",
        is_active=True,
    )
    db.add(member)
    await db.flush()
    return member
