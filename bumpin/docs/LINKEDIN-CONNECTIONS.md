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

Deployment acceptance: publish the current checked source to the existing BumpIn production project, verify its event page and deployed LinkedIn actions, and record the production deployment URL and status. LinkedIn connections are completed on LinkedIn after opening an attendee's supplied profile.

Production release — 22 October 2026:

- Deployed and promoted `dpl_H3fAoe7XetvPNPKW6bfG5tBvAWxs`, status Ready: https://bumpin-84vnl62rc-amanshah0844-8466s-projects.vercel.app. Vercel inspection confirms https://bumpin-silk.vercel.app resolves to this deployment.
- Remote production build, local typecheck and all 124 current unit/API tests passed. Application lint passed while excluding generated `outputs/` and `artifacts/`, which are also excluded from deployment. Unfiltered lint reported four existing require-import errors in the untracked generated `outputs/narrated-demo/record.cjs`; that file was not changed or uploaded.
- Before promotion, five configured visibility/profile scenarios passed against the hosted candidate: two independent authenticated directories, hide/restore, canonical LinkedIn URLs, invalid/removable links and paid-access isolation. All temporary QA event, profile and authentication records were removed.
- After promotion, public event, QR, event metadata and LinkedIn readiness endpoints returned HTTP 200. LinkedIn readiness reports enabled. Public JavaScript asset paths match the tested candidate, and the served bundles contain the new connection actions, missing-link message and connection guidance.
- Prior production deployment for rollback: `dpl_AEaXTDbZdZfxpRQjZEnCYsSmP752`.
