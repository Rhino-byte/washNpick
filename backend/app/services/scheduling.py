"""Pickup time-slot rules (Africa/Nairobi)."""

from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.models.enums import TimeSlot

BUSINESS_TIMEZONE = ZoneInfo("Africa/Nairobi")

SLOT_START_HOUR: dict[TimeSlot, int] = {
    TimeSlot.morning: 8,
    TimeSlot.afternoon: 12,
    TimeSlot.evening: 16,
}

TIME_SLOT_ORDER = [TimeSlot.morning, TimeSlot.afternoon, TimeSlot.evening]


def _now_in_business_tz(now: datetime | None = None) -> datetime:
    if now is None:
        return datetime.now(BUSINESS_TIMEZONE)
    if now.tzinfo is None:
        return now.replace(tzinfo=BUSINESS_TIMEZONE)
    return now.astimezone(BUSINESS_TIMEZONE)


def is_pickup_slot_available(
    pickup_date: date,
    slot: TimeSlot,
    now: datetime | None = None,
) -> bool:
    current = _now_in_business_tz(now)
    today = current.date()

    if pickup_date > today:
        return True
    if pickup_date < today:
        return False

    slot_start = datetime.combine(
        pickup_date,
        datetime.min.time().replace(hour=SLOT_START_HOUR[slot]),
        tzinfo=BUSINESS_TIMEZONE,
    )
    return current < slot_start


def validate_pickup_schedule(pickup_date: date, slot: TimeSlot, now: datetime | None = None) -> None:
    if not is_pickup_slot_available(pickup_date, slot, now):
        if pickup_date == _now_in_business_tz(now).date():
            raise ValueError(
                f"The {slot.value} pickup slot has already started. "
                "Choose a later time or another date."
            )
        raise ValueError("This pickup time is no longer available.")
