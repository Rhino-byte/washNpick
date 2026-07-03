# WashnPick Backend

FastAPI + Neon PostgreSQL API for WashnPick.

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env     # set DATABASE_URL and other secrets
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

## API

- `GET /health` — health check
- `POST /api/v1/auth/sync` — upsert user from Firebase token
- `GET /api/v1/me` — profile
- `GET /api/v1/services` — catalog (env-driven prices)
- `POST /api/v1/orders/quote` — server-side total
- `POST /api/v1/orders` — create order
- `GET /api/v1/orders/track?ref=&phone_last4=` — public tracking
- `POST /api/v1/payments/mpesa/stk-push` — M-Pesa STK push
- Admin routes require `X-Admin-Secret` header

See `docs/schema.md` for database design.
