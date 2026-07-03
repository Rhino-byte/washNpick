from fastapi import APIRouter, Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import verify_firebase_token
from app.models import User
from app.schemas import AuthSyncResponse
from app.services.users import build_profile_response

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/sync", response_model=AuthSyncResponse)
async def sync_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> AuthSyncResponse:
    claims = await verify_firebase_token(authorization)
    firebase_uid = claims.get("uid") or claims.get("sub")
    email = claims.get("email") or ""

    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    user = result.scalar_one_or_none()
    is_new = user is None

    if is_new:
        user = User(firebase_uid=firebase_uid, email=email)
        db.add(user)
        await db.flush()
    elif email and user.email != email:
        user.email = email
        await db.flush()

    profile = await build_profile_response(db, user)
    return AuthSyncResponse(user=profile, is_new=is_new)
