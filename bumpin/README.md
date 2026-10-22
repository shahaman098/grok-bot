# BumpIn

Mobile-first QR web app for opt-in event networking — live attendee map, profile sheets, and transparent rules-based introductions. The optional Grok adapter requires a verified API and credentials.

**Event:** [Grok Bot Community Engineering London Hackathon](https://luma.com/eveur09a) · `/e/grok-bot-london`

## Live demo

- **App:** https://bumpin-silk.vercel.app  
- **Event:** https://bumpin-silk.vercel.app/e/grok-bot-london  
- **QR:** https://bumpin-silk.vercel.app/qr  

## Quick start

```bash
cp .env.example .env.local
# Add Supabase + DATABASE_URL (see docs/DEPLOYMENT-LOCAL.md / SUPABASE-SETUP.md)
npm run dev
```

- Join: http://localhost:3000/e/grok-bot-london
- QR helper: http://localhost:3000/qr

Without Supabase env vars, the app runs in **demo mode** (localStorage + BroadcastChannel, tabs within the same browser only). Each tab has its own session identity; refresh restores membership, and hiding preserves profile details.

Markers are arranged around the venue. This build does not request or collect GPS. Apply all SQL migrations in order; `20261022180000_venue_only_positions.sql` removes previously stored client positions and enforces venue-based placement for direct database writes.

Cross-device updates use Realtime plus a three-second refresh through the membership-protected attendee endpoint. If map loading fails, attendees remain accessible in a list.

## Phone interface

People open first, with Map loaded only on demand. The bottom navigation respects safe areas; profile, event and matching sheets scroll within the available viewport. Registration starts with a name and optional map visibility; other profile details are expandable. Controls support keyboard focus, pinch zoom and reduced motion.

Without a MapTiler key, the map uses attributed OpenStreetMap street tiles, requested normally by the browser with its HTTP cache; there is no offline download or tile prefetch feature. See the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/). A configured MapTiler key retains the dark MapTiler style. Map failures and a 12-second loading timeout expose an attendee list and retry control.

## Scripts

- `npm run dev` — development
- `npm run build` / `npm start` — production
- `npm run typecheck` / `npm run lint` / `npm test` — quality gates
- `npm run test:e2e` — isolated production build in `.next-e2e`, mobile Chromium and WebKit on port 3108, with Supabase disabled; tests seed demo membership without submitting registration

The map worker is copied from the installed MapLibre package into `public/maplibre/` automatically before development and production builds.

## Stack

Next.js, MapLibre + react-map-gl, Supabase (Auth, Postgres, Realtime), DiceBear, Vaul, Turf.js.

Agent docs: `AGENTS.md`, `docs/`.
