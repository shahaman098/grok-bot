# Local review — 22 October 2026

Acceptance criteria: venue-based markers only; hiding preserves profiles; leaving removes attendees; refresh restores membership; failed requests remain visible and do not falsely change membership state; mobile profile access works when map loading fails.

Implemented:

- Removed browser GPS collection; display-position resolution always uses stable venue offsets. Added a migration that clears previously stored positions and enforces venue-based coordinates for direct membership writes.
- Fixed demo ownership with a per-tab session identity, persisted hidden membership, profile-preserving visibility changes, and actual deletion on leave. Versioned the demo pool to discard incompatible legacy records.
- Added authenticated membership restoration and a three-second protected-directory refresh alongside Realtime, whose current RLS policies only deliver the owner's row changes.
- Checked HTTP mutation failures before updating UI state, surfaced network errors, handled matching failures and empty results, and rejected blank names/questions. Matching understands short skills such as AI and excludes unrelated profiles and self matches.
- Served the installed MapLibre standalone worker from the app origin via predev/prebuild preparation. Added a list fallback for map errors and moved zoom controls away from membership controls.
- Removed unverified Grok claims from the main matching button and README. The existing optional adapter remains unverified; no external AI integration was tested.
- Preserved browser pinch zoom and added explicit avatar dimensions. Updated deployment and rehearsal instructions.

Executed checks:

- `npm run typecheck`: passed.
- `npm run lint`: passed, no warnings or errors.
- `npm test`: 22 tests passed across five files.
- `npm run test:e2e`: three mobile Chromium tests passed. This command builds an isolated production app in `.next-e2e` with Supabase disabled. Coverage: restored membership; hidden profile preserved over reload; leave removes only the current attendee; rules-based matching excludes self; map worker served; blocked tiles still allow opening a profile.
- `npm run build`: final standard production build passed with the existing local configuration.

Limits: no production deploy, migration execution, live database/RLS test, external Grok call, real registration submission, or physical two-phone test was performed. Apply and validate all migrations in filename order before deploying; in particular `20261022180000_venue_only_positions.sql` is required to scrub legacy GPS and enforce safe direct writes. Polling cross-device behavior still needs a real two-phone rehearsal. Next.js emits an existing middleware-to-proxy deprecation notice, and Vitest emits an existing CJS API deprecation notice.
