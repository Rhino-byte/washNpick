import math
import random
import string
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.models import Order, OrderAddress, OrderItem, OrderStatusHistory, Service, User
from app.models.enums import AddressType, OrderStatus, PaymentMethod
from app.schemas import (
    AddressInput,
    OrderCreateRequest,
    OrderQuoteRequest,
    OrderQuoteResponse,
    ServiceSelectionInput,
)
from app.services.geocoding import DEFAULT_AREA, reverse_geocode


def price_label(service: Service) -> str:
    if service.unit.value == "kg":
        return f"KES {service.price_per_unit}/kg"
    return f"KES {service.price_per_unit}/item"


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def check_coverage(lat: float, lng: float, settings: Settings | None = None) -> tuple[bool, float]:
    settings = settings or get_settings()
    dist = haversine_km(lat, lng, settings.service_area_lat, settings.service_area_lng)
    return dist <= settings.service_area_radius_km, round(dist, 2)


async def get_active_services(db: AsyncSession) -> list[Service]:
    result = await db.execute(select(Service).where(Service.is_active.is_(True)))
    return list(result.scalars().all())


async def seed_services_from_env(db: AsyncSession, settings: Settings | None = None) -> None:
    settings = settings or get_settings()
    catalog = [
        {
            "id": "wash_fold",
            "name": "Wash & Fold",
            "description": "Everyday laundry washed, dried, and neatly folded.",
            "unit": "kg",
            "price_per_unit": settings.price_wash_fold_per_kg,
            "turnaround": "24–48 hours",
        },
        {
            "id": "duvet_king_queen",
            "name": "Duvet King/Queen",
            "description": "King or queen duvet washed and refreshed.",
            "unit": "item",
            "price_per_unit": settings.price_duvet_king_queen,
            "turnaround": "24 hours",
        },
        {
            "id": "double_duvet",
            "name": "Small Double / Standard Double",
            "description": "Small double or standard double duvet — same care, one price.",
            "unit": "item",
            "price_per_unit": settings.price_double_duvet,
            "turnaround": "24 hours",
        },
    ]
    for item in catalog:
        existing = await db.get(Service, item["id"])
        if existing:
            existing.name = item["name"]
            existing.description = item["description"]
            existing.price_per_unit = item["price_per_unit"]
            existing.turnaround = item["turnaround"]
            existing.is_active = True
        else:
            db.add(Service(**item, is_active=True))
    await db.flush()


def calculate_line_items(
    services: list[Service],
    selections: list[ServiceSelectionInput],
    estimated_weight_kg: float,
) -> tuple[list[dict], int]:
    service_map = {s.id: s for s in services}
    line_items: list[dict] = []
    total = 0
    for sel in selections:
        svc = service_map.get(sel.service_id)
        if not svc:
            raise ValueError(f"Unknown service: {sel.service_id}")
        if svc.unit.value == "kg":
            qty = estimated_weight_kg
            line_total = int(svc.price_per_unit * qty)
        else:
            qty = sel.quantity
            line_total = int(svc.price_per_unit * qty)
        line_items.append(
            {
                "service_id": svc.id,
                "quantity": qty,
                "unit_price": svc.price_per_unit,
                "line_total": line_total,
            }
        )
        total += line_total
    return line_items, total


async def quote_order(
    db: AsyncSession,
    payload: OrderQuoteRequest,
    user: User | None = None,
) -> OrderQuoteResponse:
    settings = get_settings()
    services = await get_active_services(db)
    line_items, total = calculate_line_items(
        services, payload.services, payload.estimated_weight_kg
    )
    requires_deposit = bool(user and user.is_burned)
    deposit_percent = settings.burned_user_deposit_percent if requires_deposit else 0
    deposit_amount = int(total * deposit_percent / 100) if requires_deposit else 0
    return OrderQuoteResponse(
        estimated_total=total,
        currency=settings.currency,
        requires_deposit=requires_deposit,
        deposit_percent=deposit_percent,
        deposit_amount=deposit_amount,
        line_items=line_items,
    )


def generate_order_id() -> str:
    today = date.today().strftime("%Y%m%d")
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"WP-{today}-{suffix}"


def _address_to_model(order_id: str, addr_type: AddressType, addr: AddressInput) -> OrderAddress:
    return OrderAddress(
        order_id=order_id,
        type=addr_type,
        area=addr.area or DEFAULT_AREA,
        address_line=addr.address_line,
        formatted_address=addr.formatted_address,
        place_id=addr.place_id,
        latitude=addr.latitude,
        longitude=addr.longitude,
    )


async def normalize_address(addr: AddressInput) -> AddressInput:
    if not addr.area or not addr.formatted_address:
        geocoded = await reverse_geocode(addr.latitude, addr.longitude)
        return addr.model_copy(
            update={
                "area": addr.area or geocoded.area,
                "formatted_address": addr.formatted_address or geocoded.formatted_address,
                "place_id": addr.place_id or geocoded.place_id,
            }
        )
    return addr.model_copy(update={"area": addr.area or DEFAULT_AREA})


async def create_order(
    db: AsyncSession,
    user: User,
    payload: OrderCreateRequest,
) -> Order:
    settings = get_settings()
    services = await get_active_services(db)
    line_items, total = calculate_line_items(
        services, payload.services, payload.estimated_weight_kg
    )

    requires_deposit = user.is_burned
    deposit_percent = settings.burned_user_deposit_percent if requires_deposit else 0
    deposit_amount = int(total * deposit_percent / 100) if requires_deposit else 0

    if requires_deposit and payload.payment_method == PaymentMethod.cod and deposit_amount > 0:
        raise ValueError("Burned users must pay deposit via M-Pesa before order is accepted")

    if payload.payment_method == PaymentMethod.mpesa:
        initial_status = OrderStatus.pending_payment
    elif requires_deposit and deposit_amount > 0:
        initial_status = OrderStatus.pending_deposit
    else:
        initial_status = OrderStatus.confirmed

    pickup_address = await normalize_address(payload.pickup_address)
    delivery_address = None
    if not payload.same_delivery_address and payload.delivery_address:
        delivery_address = await normalize_address(payload.delivery_address)

    order_id = generate_order_id()
    order = Order(
        id=order_id,
        user_id=user.id,
        status=initial_status,
        estimated_total=total,
        payment_method=payload.payment_method,
        requires_deposit=requires_deposit,
        deposit_percent=deposit_percent,
        deposit_amount=deposit_amount,
        estimated_weight_kg=payload.estimated_weight_kg,
        special_instructions=payload.special_instructions,
        pickup_date=payload.pickup_date,
        pickup_time_slot=payload.pickup_time_slot,
        delivery_date=payload.delivery_date,
        same_delivery_address=payload.same_delivery_address,
    )
    db.add(order)

    for item in line_items:
        db.add(
            OrderItem(
                order_id=order_id,
                service_id=item["service_id"],
                quantity=item["quantity"],
                unit_price=item["unit_price"],
                line_total=item["line_total"],
            )
        )

    db.add(_address_to_model(order_id, AddressType.pickup, pickup_address))
    if payload.same_delivery_address:
        db.add(
            _address_to_model(order_id, AddressType.delivery, pickup_address)
        )
    elif delivery_address:
        db.add(_address_to_model(order_id, AddressType.delivery, delivery_address))

    db.add(
        OrderStatusHistory(order_id=order_id, status=initial_status, note="Order created")
    )

    if initial_status == OrderStatus.confirmed:
        db.add(
            OrderStatusHistory(
                order_id=order_id, status=OrderStatus.pending_pickup, note="Awaiting pickup"
            )
        )
        order.status = OrderStatus.pending_pickup

    await db.flush()
    return order
