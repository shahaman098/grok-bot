# Architecture
Browser (Next.js React TS) → Supabase Auth/session + Postgres RLS + Realtime → optional server-side matching adapter. Vercel hosts frontend and API routes. MapLibre GL JS renders map tiles from a licensed provider. Browser Geolocation API obtains one-time position after permission.

## Key design
- Route `/e/[slug]` renders client-side map; SSR must not initialise WebGL or geolocation.
- Realtime for attendee join/leave and infrequent status updates; avoid high-frequency GPS broadcasting.
- Separate profile identity from public attendee projection. Public read returns only opted-in event profiles and approximate display coordinates, not raw GPS.
- Compute map positions near event venue using stable pseudorandom offsets per attendee, OR round/obfuscate consented GPS to a coarse grid with a clearly disclosed precision. For indoor demo prefer venue-anchored offsets; do not pretend these are precise locations.
- Use durable DB for attendee membership; Realtime presence for online state. Reconnect and resubscribe after network loss.
- Match engine: deterministic token overlap/skills matching, with reasons. Grok Bot adapter behind interface `recommend(attendees,query)`; only activate verified API integration.
- Luma: store explicit event URL and metadata; official API generally requires Luma Plus and calendar access. No dependency on scraping for MVP.

## API contracts (illustrative)
POST /api/join {eventSlug,name,linkedinUrl?,avatarSeed,building?,lookingFor?,visible,locationConsent}
GET /api/events/:slug/attendees → consented public projection only
PATCH /api/me {visible,building?,lookingFor?}
POST /api/recommend {eventSlug,query} → [{attendeeId,reason,score,source}]
Use server authentication and validation; don't implement unauthenticated arbitrary updates.
