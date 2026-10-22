# Attendee visibility — 22 October 2026

Acceptance criteria:

- A visible member sees their own named venue marker and People card alongside other visible attendees, marked “You”. Counts include the visible member.
- Hiding removes the member from their own public map/list as well as other members' directories. Hidden profiles remain excluded; matching continues to exclude self.
- Attendee names are readable on the map. People cards show the supplied project, offers and needs; opening a profile shows its full shared details.
- After Locate me moves the map away from the venue, a clearly labelled action returns to the attendees. Profiles remain reachable from the map.
- Private GPS remains local and separate from shared venue markers. No profile details are invented when attendees have not provided them.

Implemented: own visible profiles are included in People and on the map with a “You” label; hidden self profiles returned by the authenticated RPC stay out of the public-facing display. Counts now include the visible member. Map markers have names, People cards show all supplied project/offer/need fields, and an offers-only profile no longer displays an empty-profile message. “View profiles” remains accessible on the map and “Show attendees at venue” fits the venue and attendee markers.

The return action explicitly uses MapLibre 6.15 `absolutePadding: true`. Its default adds fitting padding to existing camera padding; after Locate me that could leave no usable viewport in mobile WebKit, causing the fit to do nothing. The replacement padding fixes this failure.

Verification:

- Production build, typecheck and lint passed; 119 unit tests passed across 24 files, including the coordinated LinkedIn-profile changes.
- The broader isolated browser run passed 36 of 38 checks; its two WebKit failures exposed the padding bug above. After the fix, all six focused Chromium/WebKit scenarios passed: own and other markers/details, location and return-to-venue, and 320px offers-only/empty profiles. Earlier checks also verified two attendee views receive hide/show changes, map-failure fallback, 320/390/844/1280px profile layouts, and privacy clearing.
- Read-only configured database audit confirmed every current visible member's safe directory projection includes one own profile and the other members, with venue coordinates. At initial inspection, the four visible members had no project, offers or needs entered; the UI cannot invent missing details.
- An unpromoted hosted candidate passed three real API scenarios using two synthetic accounts in an isolated event: full shared directories, hide/restore, and supplied LinkedIn link persistence. All test identities and event records were removed. That candidate predates the camera correction and must not be promoted.
- Screenshots: `/tmp/bumpin-attendees-together-mobile-chrome.png` and `/tmp/bumpin-attendees-together-mobile-safari.png` use synthetic profiles. Focused test output: `/tmp/bumpin-camera-final-results`.

Final combined release verification: 30 profile/map/private-location browser checks and 16 layout checks passed across Chromium/WebKit, plus production build, typecheck, lint and all 119 unit tests. The layout fixture isolates optional concierge configuration polling to avoid unrelated WebKit reload cancellation errors.

Released to `https://bumpin-silk.vercel.app/e/grok-bot-london`: deployment `dpl_9Fc8phL6xWfkHMoQsmX4fDrVWbwm`, confirmed Ready by an independent `vercel inspect` and public-page HTTP 200 check. All six configured hosted scenarios passed, including two authenticated browser contexts seeing both profiles, shared skills/LinkedIn links, actual map markers and hide/show synchronization. The browser fixture uses the supported seeded event page and routes its event identifiers to a disposable QA event while using real hosted API handlers, authentication and database records. No API responses were fabricated, and all temporary events, profiles and auth identities were removed. Screenshot `/tmp/bumpin-live-attendee-visibility.png` contains synthetic attendees only. See `SHARED-PROFILES.md` for the coordinated release evidence.

Physical phone GPS accuracy remains outside these simulated-location checks.
