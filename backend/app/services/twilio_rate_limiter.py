"""Token-bucket rate limiter for Twilio outbound (default 80 MPS)."""

import asyncio
import time

from app.core.config import get_settings

_lock = asyncio.Lock()
_tokens: float = 0.0
_last_refill: float = 0.0


async def acquire_send_slot() -> None:
    """Wait until a send slot is available under TWILIO_MPS_LIMIT."""
    global _tokens, _last_refill

    settings = get_settings()
    limit = max(1, settings.twilio_mps_limit)
    refill_rate = float(limit)

    while True:
        async with _lock:
            now = time.monotonic()
            if _last_refill == 0.0:
                _last_refill = now
                _tokens = refill_rate

            elapsed = now - _last_refill
            if elapsed > 0:
                _tokens = min(refill_rate, _tokens + elapsed * refill_rate)
                _last_refill = now

            if _tokens >= 1.0:
                _tokens -= 1.0
                return

            wait_seconds = (1.0 - _tokens) / refill_rate

        await asyncio.sleep(max(0.001, wait_seconds))
