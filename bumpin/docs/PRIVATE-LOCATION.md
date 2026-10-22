# Private map location — 22 October 2026

Acceptance: Map provides a clear **Locate me** action that asks for browser/device permission only after a tap, centres an approximate own-position dot, and explains accuracy. Permission denial, timeout, unsupported APIs and unavailable positions provide recovery instructions without breaking venue browsing. Users can hide their dot or return to the venue. GPS must not be stored or shared with attendees, BumpIn APIs or AI.

Implementation: a one-shot `getCurrentPosition` request with a ten-second native timeout and eleven-second callback deadline. Position is held only in the mounted map component. Hide/cancel, map unmount and backgrounding invalidate callbacks and discard the dot. A distinct blue **You · private** marker includes the phone's reported accuracy. It is not an attendee marker and does not alter shared visibility or venue-only database coordinates. Tile-provider requests can reveal the viewed map area, as with ordinary map navigation.

Phone use: open the public HTTPS app directly in Safari or Chrome, keep the same approved guest session for voice, open Map, tap Locate me, and allow location. If blocked, allow Location for this site and enable the phone's Location Services, then retry. Back to event venue recentres the map; the X hides your location.

Automated browser QA uses fictional positions and stubbed map backgrounds, not a real phone's GPS. It checks no request before a tap, one-shot location, local-storage and outgoing-mutation exclusion, map recentring, privacy clearing, denial, timeout, unavailable/unsupported APIs, cancellation and narrow touch targets. Physical-device GPS quality still requires the user's test.

## Verification

- Typecheck, ESLint and production build passed.
- Final focused browser run: **20 passed** in Chromium/WebKit, comprising 14 private-location checks and six existing basic concierge/map checks. The final run used two workers and the existing map-loading deadline to avoid overloading software-rendered maps.
- Configured local voice/access simulations: **6 passed**, preserving pending-by-default access, approved voice matches and the compact map call bar. A stale development bundle was cleared by restarting the local preview before this check.
- Earlier checks caught control CSS missing from the built global stylesheet; location styles now have a directly imported scoped file. Camera padding and the private marker label keep the dot clear of the controls.
- Example screenshots `/tmp/bumpin-private-location-mobile-chrome.png` and `/tmp/bumpin-private-location-mobile-safari.png` show fictional positions and a stubbed map, not the user's GPS.
- Cloud release `dpl_2PLVQ7Hgu3tz7iKiRJTqdRt5qDhL` built successfully at `https://bumpin-4738rwmnv-amanshah0844-8466s-projects.vercel.app`. No database migration or approval changes were needed. LinkedIn callback/provider source and the paid AI access gate were preserved.
- Promoted to https://bumpin-silk.vercel.app/e/grok-bot-london and verified that the public alias resolves to this release. Public event, anonymous paid-access denial and enabled LinkedIn provider checks passed after promotion. The temporary preview QA server was stopped; the configured local development preview remains available on port 3111.
