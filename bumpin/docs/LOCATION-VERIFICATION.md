# Location verification — 22 October 2026

Verified the existing private location implementation; no application changes were needed in this verification pass.

Acceptance: request location only after Locate me; render and centre the private dot with accuracy; recover from denial, timeout, unavailable and unsupported APIs; cancel late callbacks; clear on hide, map exit and backgrounding; keep coordinates out of storage and application requests.

Environment: local production E2E build at `http://127.0.0.1:3132/e/grok-bot-london`, Supabase disabled. Used repository Playwright because the Browser plugin was unavailable. Preserved other work in progress and used a separate port after the initial build attempt encountered another active build.

Checks completed:

- `npm run typecheck`, `npm run lint`, `npm test`: passed; 106 unit tests across 23 files.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3132 BUMPIN_E2E_OUTPUT=/tmp/bumpin-location-codex-results npm run test:e2e -- e2e/private-location.spec.ts --workers=2`: all 14 tests passed on mobile Chromium and WebKit, including 320px layout and privacy clearing.
- Native browser geolocation API with emulated coordinates: passed on Pixel 7 Chromium, iPhone 13 WebKit and desktop Chromium (1440×1000). Verified accuracy, refresh, recentring, hiding, and absence of raw coordinates in storage and captured network requests. Chromium denial followed by granting permission and retry also passed.
- Real OpenStreetMap tile smoke: 60 successful tile responses, no failed tile responses or page exceptions; private location rendered over the actual map.
- Correct event title, meaningful content, working controls and no framework error overlay. Screenshots inspected for mobile and desktop.

The isolated build returns an expected 503 from `/api/concierge/config` without Supabase. This was the only browser console error in the native API checks and does not affect location. Chromium also emitted software-rendering GPU performance warnings. One permission-retry camera assertion exceeded the original five-second assertion deadline under concurrent test load; the isolated reproduction and complete rerun passed with a fifteen-second rendering assertion deadline. Application location timeouts were unchanged.

Evidence outside the repository:

- `/tmp/bumpin-location-browser-check.cjs` and `/tmp/bumpin-location-browser-results.json`
- `/tmp/bumpin-location-denial-check.cjs`
- `/tmp/bumpin-location-real-map-check.cjs`
- `/tmp/bumpin-location-native-chromium.png`
- `/tmp/bumpin-location-native-webkit.png`
- `/tmp/bumpin-location-native-desktop.png`
- `/tmp/bumpin-location-real-map.png`

Limits: browser coordinates were emulated, not obtained from physical GPS hardware. This pass verified the local build, not deployment to production or a physical two-phone rehearsal. The existing privacy disclosure still applies: tile requests reveal the viewed map area to the tile provider.
