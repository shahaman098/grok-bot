# BumpIn architecture (one page)

```
QR → HTTPS Next.js (Vercel)
       ├─ /e/[slug] map UI (MapLibre + react-map-gl)
       ├─ Join / privacy / leave
       ├─ Ask Grok panel
       └─ API routes
            ├─ POST /api/session   → guest mint (SQL) + GoTrue tokens
            ├─ POST /api/join
            ├─ PATCH /api/me
            ├─ POST /api/leave
            ├─ GET  /api/events/[slug]/attendees  → list_event_attendees RPC
            └─ POST /api/recommend → rules | Grok adapter
                    ↓
              Supabase
                ├─ Auth (guest sessions)
                ├─ Postgres + RLS
                └─ Realtime on event_memberships
```

**Privacy:** visibility + location are separate opt-ins; markers are venue-anchored / approximate; raw GPS is not stored in MVP.
