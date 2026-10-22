# Primary-source research notes (22 October 2026)
These are **summaries and links**, not wholesale copied third-party documentation. Agents should open the primary docs and check version-specific guidance before coding.

1. MapLibre GL JS — https://maplibre.org/maplibre-gl-js/docs/ — open-source TypeScript/WebGL vector map library; supports markers, events, map controls. Next.js integration must initialise map in browser only. Demo tile server not production tile hosting.
2. Supabase Realtime Presence — https://supabase.com/docs/guides/realtime/presence — track joined/left clients and sync shared state; do not send rapid GPS updates through Presence. Use Postgres + RLS for durable memberships.
3. MDN Geolocation API — https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API — secure context (HTTPS) required, user permission required; browser/device settings can deny. Permissions Policy can restrict iframe access.
4. MDN geolocation permissions policy — https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/geolocation — cross-origin iframe access restricted; use top-level Vercel page.
5. Luma API — https://docs.luma.com/reference/getting-started-with-your-api — official API requires Luma Plus and scoped calendar key; not a general unauthenticated event-discovery endpoint. Manually seed the event for POC.
6. Vercel docs — https://vercel.com/docs — use HTTPS deployment, project environment variables and rollback.
7. Supabase security — https://supabase.com/docs/guides/database/postgres/row-level-security — enforce row-level security for user-owned data.
8. DiceBear — https://www.dicebear.com/ — generated avatars; review licence for selected style.
9. Vaul — https://vaul.emilkowal.ski/ — drawer/bottom sheet UI.
10. Playwright — https://playwright.dev/docs/intro — browser E2E testing.

Not verified: exact hackathon tracks, Grok Bot API surface, organiser-provided event API credentials, actual event Luma URL and precise venue map coordinates. Do not substitute guessed values.
