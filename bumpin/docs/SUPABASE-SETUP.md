# Supabase setup (BumpIn project)

## Env (local + Vercel)

Copy from dashboard → API Keys → **Publishable** key (not legacy `anon` unless you use that key type):

```
NEXT_PUBLIC_SUPABASE_URL=https://kotrvhfgnzoiwurifgou.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Store in `.env.local` (gitignored). **Do not commit** database passwords or secret keys.

## Auth

BumpIn mints **guest sessions** via `POST /api/session` (SQL `create_bumpin_guest` + GoTrue password grant). Anonymous Auth is **not required**.

Optional: you may still enable Anonymous in the dashboard; the app prefers `/api/session` so demos work either way.

Requires server env `DATABASE_URL` (session pooler) — never expose it to the client.

## Database

Schema is in `supabase/migrations/20261022160000_init.sql`.

If you need to re-apply on session pooler (EU):

```bash
PGPASSWORD='YOUR_DB_PASSWORD' psql \
  "postgresql://postgres.kotrvhfgnzoiwurifgou@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" \
  -f supabase/migrations/20261022160000_init.sql
```

## App wiring

This repo uses `@supabase/ssr` (already installed):

- `lib/supabase/client.ts` — browser
- `lib/supabase/server.ts` — Server Components / Route Handlers
- `middleware.ts` — refreshes session cookies

No Prisma / `@supabase/server` required for this Next.js app.
