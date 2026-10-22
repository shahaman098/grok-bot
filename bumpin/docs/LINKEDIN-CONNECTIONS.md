# Attendee LinkedIn connections — 22 October 2026

Acceptance criteria:

- People cards show attendee-shared project, offers and needs, plus a direct **Connect on LinkedIn** link when a valid member URL is available.
- The profile panel offers the same action and explains that the attendee's LinkedIn profile opens, where the visitor can choose Connect.
- Your own profile uses **View your LinkedIn profile**, or an action to add your optional URL. Missing or invalid links never produce a connection action.
- Links are canonicalised and open safely in a new tab. Hidden attendees remain excluded. Mobile layouts keep profile and connection actions separate and reachable.
- No additional profile data is inferred or imported. LinkedIn sign-in supplies basic identity; professional details and profile URLs are attendee-shared.

Implemented: separate LinkedIn actions on People cards and a matching primary action in the profile panel, preserving shared profile details and the existing optional URL editor. Both surfaces validate member links before rendering an external action. Own profiles use view/add wording. No schema or provider changes.

Verification:

- Typecheck, repository lint, final focused lint and all 119 unit tests passed. The isolated production test build succeeded.
- Chromium/WebKit profile, link and layout run: 27 of 28 passed initially. One Chromium map-readiness assertion timed out waiting for Locate me to enable. The same complete scenario passed in isolation without an application change; the direct-link scenario also passed again. All 28 distinct scenarios therefore have passing evidence, with the initial timing failure retained here.
- Checked external-link destination, separate-tab behavior using a mocked LinkedIn page, unsafe/missing/removed links, own-profile wording, hidden attendees, live updates and 320px through desktop layouts. No real LinkedIn connection request was sent.
- Inspected synthetic-profile screenshots: `/tmp/bumpin-linkedin-people-mobile-chrome.png` and `/tmp/bumpin-full-profile-mobile-safari.png`. Results: `/tmp/bumpin-linkedin-connect-results` and `/tmp/bumpin-linkedin-connect-recheck`.

These changes are local and have not been deployed. LinkedIn connections are completed on LinkedIn after opening an attendee's supplied profile.
