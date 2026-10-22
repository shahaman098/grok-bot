# BumpIn — submission blurb

**BumpIn** turns a crowded hackathon into a consenting live floor map. Scan a QR, join with name + optional LinkedIn, opt into visibility, and see other attendees as avatars around the venue. Tap a profile for LinkedIn; open the event pin for Luma. **Ask Grok who to meet** ranks collaborators from opt-in `building` / `looking for` text (Grok Bot API when available; otherwise labelled rules-based matching).

**Stack:** Next.js · MapLibre / react-map-gl · Supabase (Postgres + RLS + Realtime) · DiceBear · Vaul · Turf.js · Vercel.

**Grok Bot role:** modular `recommend()` adapter — community context → explainable intros.

**Live:** https://bumpin-silk.vercel.app/e/grok-bot-london · QR: https://bumpin-silk.vercel.app/qr · Event: [Luma](https://luma.com/eveur09a)

**10x vs today:** Discord scroll / check-in lists → opt-in realtime presence map + one-tap intro.
