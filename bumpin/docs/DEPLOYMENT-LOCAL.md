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

Open `http://localhost:3000/e/grok-bot-london` (location permission is only requested if someone taps **Map → Locate me**).

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

## Love at First Bot release

Before starting this release against configured Supabase, apply both the venue-only migration and `20261022190000_love_at_first_bot.sql`. The latter adds the profile field and all connection RPCs. Apply each migration once, inside a database transaction. Do not run the disposable database test against production; it creates its own local cluster.

The app remains rules-based and never calls the unverified Grok adapter. Production and preview environments each need the four Supabase/app variables above; this project's existing Vercel variables were configured for Production only when inspected.

Rehearse the approved pair stage flow using the [checklist](REHEARSAL-CHECKLIST.md). Stage URLs deliberately reveal nothing before both permissions exist. Public repository publication is still required even when the Vercel app runs.

Release helpers:

```sh
# Existing installations: apply the two pending release migrations atomically.
npm run db:migrate:love
# Run against a started, configured production build (defaults to port 3109).
npm run test:connections:configured
# Override BUMPIN_TEST_APP_URL for the target deployment. For protected Vercel
# builds, BUMPIN_VERCEL_CURL=1 uses the authenticated CLI without logging tokens.
```

The configured smoke test writes synthetic identities and an isolated temporary QA event and removes them in cleanup. It does not submit the event-registration form or send messages. Run the disposable `test:connections:db` for ordinary local development without a configured account.
