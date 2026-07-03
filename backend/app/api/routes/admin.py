"""Legacy admin routes — order ops moved to /staff (Firebase auth)."""

from fastapi import APIRouter

router = APIRouter(prefix="/admin", tags=["admin"])
