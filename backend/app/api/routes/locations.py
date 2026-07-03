from fastapi import APIRouter, Query

from app.schemas import CoverageCheckResponse, ReverseGeocodeResponse
from app.services.geocoding import reverse_geocode
from app.services.pricing import check_coverage

service_areas_router = APIRouter(prefix="/service-areas", tags=["locations"])
locations_router = APIRouter(prefix="/locations", tags=["locations"])


@service_areas_router.get("/check", response_model=CoverageCheckResponse)
async def coverage_check(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
) -> CoverageCheckResponse:
    in_coverage, distance = check_coverage(lat, lng)
    return CoverageCheckResponse(in_coverage=in_coverage, distance_km=distance)


@locations_router.get("/reverse", response_model=ReverseGeocodeResponse)
async def reverse_geocode_endpoint(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
) -> ReverseGeocodeResponse:
    result = await reverse_geocode(lat, lng)
    return ReverseGeocodeResponse(
        formatted_address=result.formatted_address,
        area=result.area,
        place_id=result.place_id,
    )
