# Voice concierge

## Acceptance criteria

- Joined, visible attendees can start an explicitly activated live voice session, see captions, mute, interrupt and end it.
- A spoken request produces at most three eligible attendees, each with a reason backed by an exact shared-profile excerpt; the same matches are highlighted on the venue map.
- Follow-up questions and focusing a result work while viewing the map. No precise-location claims or automatic introduction requests.
- Missing credentials, microphone denial, provider failures and map failures retain useful typed/basic matching.
- Existing onboarding, mutual introductions and stage permissions remain intact.
- Server-only credentials, authenticated paid endpoints, atomic quotas and server-validated results are required. Audio/transcripts are not persisted by BumpIn.
- Paid features require explicit owner approval per attendee/event. Requests remain pending, and public requests cannot grant paid access. See [paid access administration](PAID-ACCESS.md).
- Automated provider simulations and real device/provider verification are reported separately.

## Architecture and setup

The Concierge navigation item opens live conversation or typed search without requiring a complete offers/needs profile. Successful searches highlight up to three results on the venue map; the compact call bar lets a conversation continue there. Introductions remains a separate navigation item with its existing mutual-consent flow.

- `GET /api/concierge/config` reports whether voice is enabled, without credentials.
- `POST /api/concierge/session { eventSlug }` verifies visible event membership and quota, then mints a 60-second xAI connection credential. The browser opens a direct WebSocket, sends session settings and streams 24 kHz PCM using an AudioWorklet. The long-lived key never enters browser code.
- `POST /api/concierge/search { eventSlug, query }` checks the same membership boundary, loads the existing public attendee projection and requests structured semantic results. Exact quoted evidence, returned IDs and renewed visibility are checked on the server. Text-model input excludes names, contact links and coordinates; the voice model receives verified result names and excerpts.
- A profile's `lookingFor` text is not accepted as expertise. Related projects are labelled as relevance rather than confirmed skills. Provider errors and missing AI configuration return explicitly labelled basic matches; a genuine empty AI result stays empty.
- Voice tools can only search or focus a current result. They cannot create introductions, publish stage content or edit profiles.
- Atomic database quotas permit three connection credentials and twelve semantic searches per member/event/minute. Existing queryless profile matching and introduction eligibility remain rules-based.

To activate:

1. Create an API key in [xAI Console](https://console.x.ai/) and fund API usage. Put `XAI_API_KEY` in `.env.local` or the deployment's secret environment. X/Twitter consumer keys and bearer tokens are a different credential type.
2. After the existing base migrations, apply `20261022210000_concierge_quota.sql` and `20261022230000_concierge_quota_grants.sql`. The explicit helper is `node --env-file=.env.local scripts/apply-concierge-migration.mjs`. It installs the quota schema if absent and reapplies its authenticated-only grants transactionally. Both changes were applied to configured Supabase on 22 October 2026.
3. Apply the access-request migration through the same helper and approve only intended attendees, as described in [paid access administration](PAID-ACCESS.md). Set `BUMPIN_CONCIERGE_ENABLED=true`, restart the app, and rehearse live audio on physical phones before releasing the feature. Voice currently defaults to `grok-voice-3.0`; semantic search uses `grok-4.7`, with environment overrides. Configuring the key does not unlock public access.

The client stops sessions at three minutes or after 45 seconds without user activity. End/Close/background/hide/leave releases microphone and transport resources. A short-lived token controls connection establishment, not the lifetime of an already-open provider connection; client timers are not hard account spending limits. Configure spending limits in the provider console.

No audio or transcripts are stored by BumpIn. xAI's own request handling is governed by its API terms; the activation message identifies that audio/shared profile processing occurs there. Native browser SpeechRecognition is not required. HTTPS or localhost and browser microphone access are required.

## Verification commands

```sh
npm run typecheck
npm run lint
npm test
node scripts/test-concierge-db.mjs
npm exec -- playwright test e2e/concierge.spec.ts
```

The database test creates and removes a disposable local PostgreSQL cluster and never reads `DATABASE_URL`.

For the simulated live-conversation browser tests, start a local app with its existing Supabase public configuration, then run:

```sh
BUMPIN_VOICE_BROWSER_QA=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3111 npm exec -- playwright test e2e/concierge-voice.spec.ts
```

Those tests intercept auth, profile, credential, matching, WebSocket and microphone operations. They do not register real attendees, contact xAI or verify real microphone/provider quality. Standard browser tests seed local fictional memberships and leave registration unsubmitted.

## Sources checked

- [xAI speech-to-speech](https://docs.x.ai/developers/model-capabilities/audio/speech-to-speech)
- [Short-lived browser credentials](https://docs.x.ai/developers/model-capabilities/audio/ephemeral-tokens)
- [Official browser audio example](https://docs.x.ai/cookbook/examples/live-interpreter)
- [Structured outputs](https://docs.x.ai/developers/model-capabilities/text/structured-outputs)

## Initial local completion evidence — 22 October 2026

- Typecheck and ESLint passed.
- Full unit/API suite: **89 passed**, including **33 concierge tests** for quoted evidence, revalidation, authorization, quotas, audio framing, session lifecycle, interruption and late-response cancellation.
- Disposable PostgreSQL: **5 concierge quota scenarios passed**, including concurrent issuance; **10 existing connection scenarios passed**.
- Production build passed as part of the standard browser suite.
- Standard Chromium/WebKit regression suite: **38 passed**, with four configured-voice cases intentionally skipped in that run. Existing introductions, stage consent/revocation, onboarding, map failures and mobile layouts remain covered.
- Separate configured-local-browser simulations: **4 passed** on Chromium/WebKit. They exercise spoken-turn events, semantic result cards, two numbered map markers, focusing the second match, the fixed call bar, microphone mute/end/cleanup and microphone denial. Map attribution/venue-position notice remains above the active call bar.
- Simulated screenshots: `/tmp/bumpin-concierge-voice-mobile-chrome.png` and `/tmp/bumpin-concierge-voice-mobile-safari.png`. These contain fictional attendees and a stubbed map background, not a real conversation.

At initial local completion, `XAI_API_KEY` was absent; provider access and deployment were pending. The verification below records subsequent setup and activation. Physical-phone and noisy-room behavior still require rehearsal.

The other chat refined guest/LinkedIn entry independently; the evidence above records the shared source at the time of those checks. The concierge adds no registration fields or changes to OAuth behavior. Shared attendee profiles need relevant participant-entered text before meaningful matches are possible; LinkedIn OIDC supplies identity, not professional skills.

## Live activation preparation — 22 October 2026

Acceptance: configure a dedicated xAI API credential without exposing it, verify an authenticated provider conversation and grounded search, then deploy the complete source while preserving automatic map entry, introductions and stage permissions.

- The onboarding chat completed its final automatic-map release and handed over deployment ownership. No further onboarding-only promotion is pending.
- The combined current source passes typecheck, ESLint, all **98 unit/API tests** and a production build. The previous 33 concierge tests remain part of that suite.
- Applied the quota schema to configured Supabase. Hosted Supabase default privileges included an explicit anonymous execute grant, so the follow-up migration removes that grant. Verified installed helper, authenticated execute allowed and anonymous execute denied. Its internal membership check remains in place.
- The disposable PostgreSQL test now reproduces those hosted default grants; all **5 quota scenarios passed** again. No attendee records were changed for this activation preparation.
- Local `/api/concierge/config` returns `voiceEnabled:false`. `XAI_API_KEY` is absent locally and from the listed Vercel production variable names. The xAI Console was opened and is awaiting the user's sign-in.

At this preparation stage, live provider and physical microphone checks were pending and the concierge had not been deployed. Earlier browser results above are simulations.

## Gated production activation — 22 October 2026

- The user funded the xAI account and created the API key themselves. The key was copied directly from the console into the server-only local environment (mode 0600), then configured as a sensitive Vercel Production variable. No credential values were logged or included in source. The feature flag is enabled, with owner approval required independently.
- Applied access-request migration `20261022240000_concierge_access.sql` to configured Supabase. New requests stay pending; only server administration can approve or revoke them. No real attendee has been automatically approved. Public paid usage remains locked even though the provider is configured.
- Current source: **102 unit/API tests**, typecheck and lint passed. **7 disposable PostgreSQL scenarios** passed, including request isolation, denial of self-approval, hosted default grants, and revocation that repeat requests cannot undo.
- Targeted browser checks: **6 basic concierge cases** and **6 configured simulations** passed across Chromium/WebKit. The latter include request/pending UI and simulated approved voice/map/microphone behavior; these are not real microphone/provider sessions.
- Direct authenticated xAI verification succeeded: 60-second credential issuance; the configured `grok-voice-3.0` WebSocket accepted session settings and returned 7 audio chunks with 51 caption characters. Its input was a short text greeting, not a real microphone recording.
- Configured local app and staged Vercel app each passed **13 HTTP scenarios**, including a real `grok-4.7` semantic request using fictional profiles and a real ephemeral voice credential for an approved synthetic attendee. A paraphrased interface-design request returned the product designer with exact quoted evidence. Public/pending/revoked callers could not receive paid credentials, and pending matching used rules. Existing onboarding, introduction and stage checks passed. All synthetic accounts, access records and events were removed.
- Production release **`dpl_8ioA1trt33LK25K2NRq9RGwRzWxP`**, built at `https://bumpin-q34bxzvxl-amanshah0844-8466s-projects.vercel.app`, was promoted successfully to [BumpIn](https://bumpin-silk.vercel.app/e/grok-bot-london). Post-promotion public checks confirmed the event loads, anonymous configuration reports required access, anonymous token/request calls return 401, and private responses use no-store.

The provider and deployed APIs are verified. Physical-phone microphone capture, a noisy venue, and a real spoken end-to-end matching rehearsal remain unverified. Owner approvals are managed as described in [paid access administration](PAID-ACCESS.md). Keys pasted into chat should be rotated in xAI Console and replaced through the secure environment configuration.

Implementation choices: use official xAI APIs rather than unverified Grok Bot placeholders; keep semantic search on a dedicated concierge endpoint rather than changing the existing introduction recommendation contract; use explicitly scoped feature CSS because this repository's Turbopack CSS loader does not preserve CSS-module exports.
