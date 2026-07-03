from dataclasses import dataclass

import httpx

from app.core.config import get_settings

DEFAULT_AREA = "Ololulunga"

AREA_TYPES = (
    "sublocality",
    "sublocality_level_1",
    "locality",
    "administrative_area_level_2",
    "neighborhood",
)


@dataclass
class ReverseGeocodeResult:
    formatted_address: str
    area: str
    place_id: str | None = None


def _extract_area(components: list[dict]) -> str:
    for type_name in AREA_TYPES:
        for component in components:
            if type_name in component.get("types", []):
                name = component.get("long_name")
                if name:
                    return name
    return DEFAULT_AREA


async def reverse_geocode(lat: float, lng: float) -> ReverseGeocodeResult:
    settings = get_settings()
    if not settings.google_maps_api_key:
        return ReverseGeocodeResult(
            formatted_address=f"{lat:.6f}, {lng:.6f}",
            area=DEFAULT_AREA,
        )

    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={
                "latlng": f"{lat},{lng}",
                "key": settings.google_maps_api_key,
            },
            timeout=15.0,
        )
        data = response.json()

    results = data.get("results", [])
    if not results:
        return ReverseGeocodeResult(
            formatted_address=f"{lat:.6f}, {lng:.6f}",
            area=DEFAULT_AREA,
        )

    top = results[0]
    return ReverseGeocodeResult(
        formatted_address=top.get("formatted_address", f"{lat:.6f}, {lng:.6f}"),
        area=_extract_area(top.get("address_components", [])),
        place_id=top.get("place_id"),
    )
