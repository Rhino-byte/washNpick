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

## Staff dashboard access

Support staff use Firebase Google sign-in at `/staff` (frontend). The backend checks the Firebase UID against:

1. **`STAFF_FIREBASE_UIDS`** in `backend/.env` (comma-separated) — always grants access; remove a UID here to revoke immediately
2. **`staff_members`** table — active rows grant access when the UID is not in the env list

### First-time setup

1. Sign in once on the main app with Google (or use Firebase Console → Authentication → Users).
2. Copy your Firebase UID.
3. Add to `backend/.env`:
   ```env
   STAFF_FIREBASE_UIDS=your-firebase-uid-here
   ```
4. Restart the backend and run migrations (`alembic upgrade head`).
5. Open `http://localhost:3000/staff` and sign in with the same Google account.

On first startup, env UIDs are seeded into `staff_members` when the table is empty.

## API

- `GET /health` — health check
- `POST /api/v1/auth/sync` — upsert user from Firebase token
- `GET /api/v1/me` — profile
- `GET /api/v1/services` — catalog (env-driven prices)
- `POST /api/v1/orders/quote` — server-side total
- `POST /api/v1/orders` — create order
- `GET /api/v1/orders/track?ref=&phone_last4=` — public tracking
- `POST /api/v1/payments/mpesa/stk-push` — M-Pesa STK push
- **Staff** (Firebase Bearer token, staff UID allowlist):
  - `GET /api/v1/staff/me`
  - `GET /api/v1/staff/orders` — queue (`status`, `pickup_date`, `search` filters)
  - `GET /api/v1/staff/orders/{id}`
  - `PATCH /api/v1/staff/orders/{id}/status` — updates `orders.status` + `order_status_history`
  - `PATCH /api/v1/staff/orders/{id}/final-total`
  - `PATCH /api/v1/staff/users/{id}/burn`

See `docs/schema.md` for database design.
