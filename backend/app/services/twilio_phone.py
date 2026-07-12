"""Twilio WhatsApp address formatting."""

from app.services.users import normalize_phone


def to_whatsapp_address(phone: str) -> str:
    """Convert stored phone or partial input to whatsapp:+E164."""
    if phone.startswith("whatsapp:"):
        rest = phone.removeprefix("whatsapp:")
        if rest.startswith("+"):
            return f"whatsapp:{rest}"
        normalized = normalize_phone(rest)
        return f"whatsapp:+{normalized}"

    normalized = normalize_phone(phone)
    return f"whatsapp:+{normalized}"


def from_whatsapp_address(address: str) -> str:
    """Strip whatsapp: prefix and return normalized digits (254...)."""
    raw = address.removeprefix("whatsapp:").lstrip("+")
    return normalize_phone(raw)
