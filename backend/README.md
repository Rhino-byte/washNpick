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

## WhatsApp / Twilio (sandbox)

Outbound order updates and the inbound chatbot use Twilio WhatsApp. In sandbox mode, messages only deliver to phones that have joined the sandbox.

### 1. Join the sandbox

From your test phone, send `join <your-sandbox-code>` to the Twilio sandbox number (default `+1 415 523 8886`).

### 2. Backend environment

Add to `backend/.env`:

```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+15559653603
PUBLIC_API_BASE_URL=https://your-subdomain.ngrok-free.app
TWILIO_AUTH_TOKEN_VALIDATION=true
STAFF_ESCALATION_PHONES=whatsapp:+2547xxxxxxxx

# WhatsApp bot LLM (openai | gemini)
WHATSAPP_LLM_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash
WHATSAPP_BOT_ENABLED=true
TWILIO_MPS_LIMIT=80
WHATSAPP_BOT_HISTORY_LIMIT=12
```

`PUBLIC_API_BASE_URL` must be a public HTTPS URL (ngrok, Cloudflare Tunnel, etc.) — Twilio cannot reach `localhost`.

**Important:** Use the **Twilio WhatsApp Sandbox** or a **utility-capable WhatsApp sender** for free-form bot replies. Marketing Messages Lite (MM Lite) senders only accept marketing templates and will reject bot text (error 63055).

### 3. Twilio Console webhooks

In **Twilio Console → Messaging → Try it out → Send a WhatsApp message → Sandbox settings**:

| Setting | URL |
|---------|-----|
| When a message comes in | `{PUBLIC_API_BASE_URL}/api/v1/webhooks/twilio/whatsapp` |
| Status callback URL (on outbound sends) | `{PUBLIC_API_BASE_URL}/api/v1/webhooks/twilio/status` |

Restart the API after changing env vars.

### 4. Test outbound

1. Advance an order on `/staff` (e.g. to **Collected**), or
2. `POST /api/v1/staff/messages/test` with body `{"phone": "2547..."}` (staff auth), or
3. Use **Test send** on `/staff/messages`.

Verify `notification_logs` shows `sent` then `delivered` after the status callback.

### 5. Test inbound bot

Text the sandbox number from a joined phone:

- `help` / `hi` / `habari` — welcome + options (LLM, with live catalog facts)
- `how much` / pricing questions — verified service prices from the database
- `track WP-YYYYMMDD-XXXX` — order status (last 4 digits of phone if prompted)
- `support` — escalates to staff inbox + `STAFF_ESCALATION_PHONES` alert (`human` still works as a legacy alias)
- Any other question — LLM reply via OpenAI or Gemini (async, a few seconds)

The webhook returns **200 immediately**; the bot processes and replies in the background. Duplicate `MessageSid` values are ignored (Twilio retry-safe).

Staff reply from `/staff/messages`. **Resolve** an escalation to hand the conversation back to the bot (customer gets a short notice). Legacy `closed` chats also reopen to the bot on the next inbound message. Edit the bot system prompt and LLM provider under **Bot prompt** on the same page.

If you already saved a custom bot prompt in the dashboard, re-save it (or paste the new default) so SUPPORT wording and Facts-first rules apply — code defaults only seed empty databases.

### 6. LLM bot configuration

Add to `backend/.env`:

```env
WHATSAPP_LLM_PROVIDER=openai   # openai | gemini
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash
WHATSAPP_BOT_ENABLED=true
TWILIO_MPS_LIMIT=80
WHATSAPP_BOT_HISTORY_LIMIT=12
```

To use Gemini:

```env
WHATSAPP_LLM_PROVIDER=gemini
GEMINI_API_KEY=your-google-ai-key
GEMINI_MODEL=gemini-2.0-flash
```

Staff can override the env default provider in `/staff/messages` → **Bot prompt** (OpenAI / Gemini / use env default).

- `TWILIO_MPS_LIMIT=80` — token-bucket rate limiter on all outbound Twilio sends
- `WHATSAPP_BOT_HISTORY_LIMIT=12` — conversation turns sent to the model
- Tune the prompt at `/staff/messages` → **Bot prompt** (save + preview without sending)

Run migration after pulling: `alembic upgrade head` (adds `whatsapp_bot_prompts` table and `llm_provider` column).

### 7. Frontend WhatsApp CTA (optional)

When Twilio is configured, set in frontend `.env`:

```env
NEXT_PUBLIC_WHATSAPP_ENABLED=true
NEXT_PUBLIC_WHATSAPP_NUMBER=15559653603
```

Use digits only (no `+` or `whatsapp:`). Sandbox uses the Twilio sandbox number; production uses your approved Business number.

Set `TWILIO_AUTH_TOKEN_VALIDATION=false` only for local debugging without valid signatures.

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
- **Staff messaging** (`/staff/messages` UI):
  - `GET /api/v1/staff/messages/analytics?from=&to=`
  - `GET /api/v1/staff/messages/bot-config`
  - `PUT /api/v1/staff/messages/bot-config`
  - `POST /api/v1/staff/messages/bot-config/preview`
  - `GET /api/v1/staff/messages/conversations`
  - `GET /api/v1/staff/messages/conversations/{id}`
  - `POST /api/v1/staff/messages/conversations/{id}/reply`
  - `PATCH /api/v1/staff/messages/escalations/{id}`
  - `POST /api/v1/staff/messages/test`
- **Twilio webhooks** (no Firebase auth; Twilio signature when enabled):
  - `POST /api/v1/webhooks/twilio/whatsapp`
  - `POST /api/v1/webhooks/twilio/status`

See `docs/schema.md` for database design.
