from typing import Annotated
import asyncio

from fastapi import Depends, Header, HTTPException, status
from firebase_admin import auth, credentials, initialize_app
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models import StaffMember, User
from app.services.staff import get_or_create_staff_member

_firebase_app = None


def init_firebase() -> None:
    global _firebase_app
    settings = get_settings()
    if not settings.firebase_configured:
        return
    if _firebase_app is not None:
        return
    private_key = settings.firebase_private_key.replace("\\n", "\n")
    cred = credentials.Certificate(
        {
            "type": "service_account",
            "project_id": settings.firebase_project_id,
            "private_key": private_key,
            "client_email": settings.firebase_client_email,
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    )
    _firebase_app = initialize_app(cred)


async def verify_firebase_token(authorization: str | None) -> dict:
    settings = get_settings()
    if not settings.firebase_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase auth is not configured",
        )
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        return await asyncio.to_thread(auth.verify_id_token, token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Firebase token",
        ) from exc


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> User:
    claims = await verify_firebase_token(authorization)
    firebase_uid = claims.get("uid") or claims.get("sub")
    if not firebase_uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token claims")

    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found. Call /auth/sync first.")
    return user


async def get_optional_user(
    authorization: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        return await get_current_user(authorization=authorization, db=db)
    except HTTPException:
        return None


async def verify_admin(x_admin_secret: Annotated[str | None, Header()] = None) -> None:
    settings = get_settings()
    if not settings.admin_api_secret or x_admin_secret != settings.admin_api_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


async def get_current_staff(
    authorization: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> StaffMember:
    claims = await verify_firebase_token(authorization)
    firebase_uid = claims.get("uid") or claims.get("sub")
    if not firebase_uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token claims")

    settings = get_settings()
    email = claims.get("email") or ""
    display_name = claims.get("name") or email or "Staff"

    if firebase_uid in settings.staff_uid_list:
        return await get_or_create_staff_member(db, firebase_uid, email, display_name)

    result = await db.execute(
        select(StaffMember).where(StaffMember.firebase_uid == firebase_uid)
    )
    member = result.scalar_one_or_none()
    if not member or not member.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized for staff access",
        )
    if email and member.email != email:
        member.email = email
    if display_name and member.display_name in ("", "Staff"):
        member.display_name = display_name
    await db.flush()
    return member
