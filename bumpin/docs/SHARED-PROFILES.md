# Shared attendee profiles — 22 October 2026

Acceptance criteria:

- Tapping a visible attendee from People or the map opens their full shared project, offers/skills and goals without truncation.
- An attendee-supplied LinkedIn member URL opens safely in a separate tab. Missing details and missing links are explained without inventing information.
- Only the caller can add or remove their own optional LinkedIn link. The server validates and canonicalises it; failures retain the last confirmed state.
- Profile changes refresh in open panels. Hiding an attendee removes their panel and directory entry.
- The panel works on narrow phones, WebKit and desktop, with a reachable LinkedIn button and scrollable details.

Scope: LinkedIn OIDC supplies basic identity, not skills, work history or the public profile URL. This change displays attendee-shared information and links to LinkedIn. It does not scrape or import career histories, expose contact email/authentication IDs, or require another onboarding field. Existing `profiles.linkedin_url` is reused; no migration is needed.

Initial verification: typecheck, lint, production build and 119 unit tests passed. New profile checks passed in Chromium and WebKit. The optional link save, normalisation, reload persistence and removal passed through the react-form-fill skill (`ok: true`) using synthetic local memberships, with no page errors. Browser plugin unavailable; repository Playwright workflow used. A stable WebKit screenshot confirms the footer stays in the viewport and details scroll. Combined release checks are pending the separately coordinated Safari map-return fix.

## Released and verified

- Combined map/profile snapshot: `/tmp/bumpin-shared-profile-release.4w4G5U`. Typecheck, lint, production build and all 119 unit tests passed. All 30 profile/map/location browser scenarios passed. The 16 layout scenarios passed after isolating unrelated concierge configuration polling from fixture reloads; the first combined run had 45/46 passing with a WebKit canceled-request diagnostic in that fixture. No application error was suppressed.
- Production deployment `dpl_9Fc8phL6xWfkHMoQsmX4fDrVWbwm` built successfully and was promoted to `https://bumpin-silk.vercel.app`. Vercel inspection confirmed the alias resolves to that deployment. LinkedIn readiness returned HTTP 200 with `enabled: true`; anonymous concierge access remained HTTP 401.
- The candidate passed four real Supabase/API scenarios. The public alias then passed six configured scenarios: two authenticated directories with full shared fields, hide/restore, LinkedIn canonicalisation, invalid-link preservation/removal, the paid-access gate, and two browser contexts opening the other's details/link and observing visibility updates and real map markers.
- The hosted page accepts only the seeded event slug. For the two-browser check, only test-browser API event identifiers were routed to a disposable QA event; responses, authentication, writes and map assets came from the deployed application. An initial unsupported random page slug returned 404 and was corrected in the test harness. No production page-routing changes were made. One earlier network fetch failed before session verification; its test records were cleaned before retry.
- Reproduction: `BUMPIN_TEST_APP_URL=https://bumpin-silk.vercel.app BUMPIN_VISIBILITY_BROWSER=1 node --env-file=.env.local scripts/verify-visibility-live.mjs`. All temporary QA events, profiles and authentication identities were deleted after each run. Screenshot `/tmp/bumpin-live-attendee-visibility.png` contains only synthetic attendees. Physical phone behaviour was not re-tested for this release.

The coordinated map fix is documented in `ATTENDEE-VISIBILITY.md`. The next concierge matching release is owned by the “Clarify Better Call Grok” chat, after this verified handoff.
