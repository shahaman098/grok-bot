# LinkedIn-first entry — 22 October 2026

The guest visibility default described in this historical release was subsequently changed to automatic map appearance; see [the automatic-map release note](AUTO-MAP-COMPLETION.md).

This replaces the previous entry form with **Join with LinkedIn** and a private guest fallback. There are no text fields, checkboxes or preference questions before entry. The primary action explains attendee sharing. Once LinkedIn is configured, provider authorization imports the available name/photo and completes event entry without another BumpIn form. LinkedIn can require its own login and consent steps.

Only official OIDC identity fields are available. No work history, skills, headline, public profile URL or collaboration goals are imported or guessed. The developer app/provider is still missing, so real LinkedIn authorization and automatic entry have not been tested with a live account. Activation instructions are in [LINKEDIN-ONBOARDING.md](LINKEDIN-ONBOARDING.md).

## Implementation

- A validated same-origin JSON request starts OAuth and creates a ten-minute HttpOnly intent cookie, bound to event and nonce. PKCE remains handled by Supabase.
- The callback imports server-authenticated identity and completes membership only with matching unexpired intent. Every callback outcome clears the cookie. Plain sign-in does not create membership.
- New LinkedIn entries share their name/photo as explained on the action. Saved goals, projects, offers, links and existing visibility are preserved. Repeated entry uses conflict-ignore semantics so it cannot reveal a previously hidden membership.
- Failed entry returns a fixed retry message. No database or provider details are echoed. A saved identity profile can remain after a membership failure; retry is safe and does not claim entry succeeded.
- Guests join hidden using generated names. Match preferences can be added inside the event. Stage sharing still requires separate approval.

## Verification

- 56 unit/API tests across 14 files passed.
- Typecheck, ESLint and production build passed.
- 32 mobile Chromium/WebKit browser checks passed, including the minimal screen, cancellation, narrow layouts and the existing introduction/stage flow. No browser registration forms were submitted.
- Automated auth tests use simulated provider responses and database clients. They cover successful callback routing, intent expiry/mismatch, failed writes, canonical identity import, saved-field preservation and provider-disabled/error behavior. They are not evidence of real LinkedIn authorization.
- The own-profile response now includes the saved LinkedIn link, so a retry after interrupted entry preserves that link. The field remains absent from public stage responses.

Validation and deployment use the previous onboarding release plus this change in an isolated snapshot. Concurrent voice-concierge changes are preserved in the shared workspace and excluded from this release. There is no new database migration for this change.

## Release

Vercel release `dpl_4WX1bNjSy92CRH2BvQ9n9vB4gbBr` built successfully and was promoted from `https://bumpin-8do7blkkz-amanshah0844-8466s-projects.vercel.app`.

Public event: https://bumpin-silk.vercel.app/e/grok-bot-london

Eight configured-backend HTTP scenarios passed on this cloud release using two independent synthetic sessions, including saved-link restoration, matching, acceptance, stage consent, profile edits and hiding. All temporary QA data and identities were removed. Four auth boundary checks also passed on the initial minimal-entry cloud build: accurate disabled-provider reporting, explicit sharing requirement, no intent when disabled, and safe cancellation with intent clearing.

After final promotion, public Chromium and WebKit checks at 390×844 passed: LinkedIn-first action and guest fallback visible, no form fields, accurate disabled-provider state, no horizontal overflow or page errors. No registration was submitted. Screenshots: `/tmp/bumpin-minimal-entry-live-chromium.png` and `/tmp/bumpin-minimal-entry-live-webkit.png`.

Physical-phone rehearsal, real LinkedIn sign-in and public-repository publication remain outstanding. Screenshot `/tmp/bumpin-minimal-entry.png` shows the preview screen without registered attendees.
