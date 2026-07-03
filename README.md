# WashnPick

Mobile-first laundry pickup & delivery website for Ololulunga, Kenya. UI-only phase — orders are stored locally in the browser.

## Getting started

```bash
npm install
cp .env.example .env.local
# Fill in Cloudinary and admin secrets (see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Use mobile viewport (320–428px) for the intended experience.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home — hero, how it works, service highlights |
| `/services` | Full service list with KES pricing |
| `/order` | 4-step pickup order wizard |
| `/track` | Order tracking by reference + phone |
| `/about` | About, contact, hours |
| `/admin/media` | Upload images to Cloudinary (admin) |

## Scripts

- `npm run dev` — start development server
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — run ESLint

## Configuration

Edit [`lib/site-config.ts`](lib/site-config.ts) to change business name, phone, and WhatsApp settings.

## Cloudinary images

Copy [`.env.example`](.env.example) to `.env.local` and set:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloud name (public, used for image URLs) |
| `CLOUDINARY_API_KEY` | Server upload API |
| `CLOUDINARY_API_SECRET` | Server upload API (never expose to browser) |
| `ADMIN_UPLOAD_SECRET` | Password for `/admin/media` uploads |
| `NEXT_PUBLIC_CLOUDINARY_FALLBACK_PUBLIC_ID` | Optional dev placeholder (e.g. `samples/coffee`) when slots are empty |

### Upload images

1. Start the dev server with env vars configured.
2. Open [`/admin/media`](http://localhost:3000/admin/media).
3. Enter your `ADMIN_UPLOAD_SECRET` (must **exactly** match `.env` — unlock verifies against the server).
4. Upload an image per slot — each slot uses a fixed Cloudinary public ID (e.g. `freshfold/hero`) and overwrites on re-upload.

Slot definitions live in [`lib/site-images.ts`](lib/site-images.ts). URLs are built in [`lib/cloudinary/url.ts`](lib/cloudinary/url.ts) with mobile-optimized transforms (`f_auto`, `q_auto`, `w_480`).

### Troubleshooting

| Issue | Fix |
|-------|-----|
| `POST /api/cloudinary/upload 401` | `ADMIN_UPLOAD_SECRET` in `.env` must match unlock password. Restart `npm run dev`, click **Lock**, re-unlock. |
| Terminal `upstream image response failed ... 404` | Image not uploaded yet for that `freshfold/*` slot — upload at `/admin/media`. Missing slots show placeholders (no 404 spam). |
| Wrong cloud name | Use **Cloud name** from Cloudinary dashboard (e.g. `dmzov4rh1`), not your brand name. |
| Upload 500 | Set `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in `.env`. |
| Empty slots in dev | Set `NEXT_PUBLIC_CLOUDINARY_FALLBACK_PUBLIC_ID=samples/coffee` to preview with Cloudinary's sample image. |

## Future integration

- WhatsApp Business API — enable via `whatsappEnabled` and `whatsappNumber` in site config
- Backend API — order types and validators in `lib/` are ready for reuse
