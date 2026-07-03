# WashnPick Database Schema

See `alembic/versions/` for migrations.

## Address tables (GPS-first)

`user_addresses` and `order_addresses` store pin-based locations:

| Column | Type | Notes |
|--------|------|-------|
| latitude, longitude | DECIMAL NOT NULL | Required pin from GPS/map |
| formatted_address | TEXT | Reverse geocode (Google) |
| address_line | TEXT nullable | Optional landmark for riders |
| area | VARCHAR nullable | Auto from reverse geocode; default Ololulunga |
| place_id | VARCHAR nullable | Set when user uses Places search fallback |

User no longer selects area from a dropdown. Geofencing uses lat/lng via `GET /service-areas/check`.

## Other tables

See `001_initial_schema.py` for users, services, orders, payments, notification_logs.

## Burned-user deposit rule

`deposit_amount = estimated_total × BURNED_USER_DEPOSIT_PERCENT / 100` (default 50%).
