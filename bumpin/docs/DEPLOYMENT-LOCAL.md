# Local deploy (no git push)

## Supabase

1. Create a Supabase project (hackathon sponsor credits).
2. Apply **all** SQL files under `supabase/migrations/` in filename order. The venue-only migration scrubs old GPS coordinates and enforces venue-based markers on every membership write.
3. Set server-only `DATABASE_URL` for the current guest-session flow (`20261022170000_guest_session.sql`); enabling Anonymous Auth alone does not configure this flow.
4. Copy URL + publishable key into `.env.local`.

## Run locally

```bash
cd bumpin
cp .env.example .env.local
# fill keys
npm run dev
```

Open `http://localhost:3000/e/grok-bot-london` (no GPS permission is requested).

## Vercel CLI (HTTPS for phones)

```bash
cd bumpin
npx vercel login
npx vercel --yes
# set env vars in Vercel dashboard or `vercel env add`
npx vercel --prod
```

Set `NEXT_PUBLIC_APP_URL` to the production URL. Open `/qr` to print or show the join QR.

**Current production (2026-10-22):** https://bumpin-silk.vercel.app  
Env required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`.

## Two-phone test

1. Both phones open the same `/e/grok-bot-london` URL over HTTPS.
2. Join with **Appear on attendee map** checked.
3. Confirm second avatar within a few seconds.
