from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas import ServiceResponse
from app.services.pricing import get_active_services, price_label

router = APIRouter(prefix="/services", tags=["services"])


@router.get("", response_model=list[ServiceResponse])
async def list_services(db: AsyncSession = Depends(get_db)) -> list[ServiceResponse]:
    services = await get_active_services(db)
    return [
        ServiceResponse(
            id=s.id,
            name=s.name,
            description=s.description,
            unit=s.unit,
            price_per_unit=s.price_per_unit,
            price_label=price_label(s),
            turnaround=s.turnaround,
            is_active=s.is_active,
        )
        for s in services
    ]
