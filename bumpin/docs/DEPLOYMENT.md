# Deployment runbook
1. Create repo, initialise Next.js TypeScript/Tailwind app, install `maplibre-gl`, `@supabase/supabase-js`, `@supabase/ssr`, `vaul`, `@dicebear/core`, chosen avatar collection, `zod`, `lucide-react`, `@turf/turf` only if needed.
2. Configure Supabase Auth, tables, RLS and migrations. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; keep any privileged keys server-only. Use `.env.example` placeholders, never actual secrets.
3. Choose properly licensed map tiles. Demo tiles are for testing only; obey tile service attribution and limits.
4. Connect Git repository to Vercel, set environment variables, deploy. Vercel-hosted HTTPS should establish secure context, but geolocation is still user/browser controlled.
5. Use the top-level deployment URL and test two phones. This build uses venue-based markers without collecting GPS. Apply every migration in filename order, including the venue-only position trigger.
6. Seed exact verified Luma URL, event name and venue coordinates manually; print QR for `/e/grok-bot-london`.
7. Smoke test on mobile data if venue Wi-Fi is unreliable; keep a labelled backup walkthrough.

Rollback: previous Vercel deployment; maintain read-only seeded demo mode if backend unavailable (explicitly marked simulated).
