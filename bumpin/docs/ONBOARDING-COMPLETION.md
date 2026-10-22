# Quick onboarding completion — 22 October 2026

Participants can join without typing using an editable generated guest name. Visibility starts off. Optional offers/needs use tap choices; manual profile fields remain available. Standard LinkedIn OIDC sign-in is implemented behind actual provider availability, with a PKCE callback and server-authenticated name/photo import. There is no professional-profile scraping or invented skills enrichment.

LinkedIn is **not enabled**: the user does not yet have a developer app. Follow [the setup guide](LINKEDIN-ONBOARDING.md) to create the app, configure Supabase, then test a consenting account. Actual LinkedIn authorization and photo retrieval have not been exercised. Name/photo mapping, disabled/error paths, cancellation, redirect restrictions, client-photo rejection and guest behavior have automated coverage. Email, provider tokens and authentication IDs are absent from public attendee projections. Stage snapshots continue to use generated avatars from their exact approval preview.

## Executed verification

| Check | Result |
| --- | --- |
| Typecheck, ESLint | Passed |
| Unit/API tests | 48 passed, 12 files |
| Disposable PostgreSQL | 10 scenarios passed, including photo constraints and visibility isolation |
| Browser suite | 32 passed, mobile Chromium and WebKit |
| Production build | Passed locally and on Vercel |
| Configured Supabase, local production HTTP server | 8 scenarios passed |
| Vercel deployment, configured Supabase | 8 scenarios passed before promotion |
| Public production onboarding | Chromium and WebKit at 390×844: no typing needed, consent unchecked, LinkedIn disabled, no horizontal overflow or page errors |

Browser QA did not submit registration forms. Existing full-flow checks seed fictional memberships and exercise matching, mutual acceptance, joke approval, stage reveal/revocation and failed-write recovery. Configured API checks use two synthetic sessions in a separate temporary event; their event, profiles, connections and auth identities were removed afterward. Physical phones and real LinkedIn sign-in still need rehearsal.

Checks and deployment used an isolated source snapshot excluding concurrently developed concierge directories, audio assets and the pending concierge quota migration. The snapshot did not alter those files in the shared workspace. This note records the onboarding release, not verification of unfinished concierge work.

## Release

Applied only `20261022200000_linkedin_onboarding.sql` transactionally to configured Supabase, after the already applied introduction migrations. The new helper is `scripts/apply-onboarding-migration.mjs`. It does not enable OAuth or apply the concierge migration.

Vercel release `dpl_8qJ6gUYCsgfXr4dwpvM86VF2KTQg` built successfully and was promoted:

- Public event: https://bumpin-silk.vercel.app/e/grok-bot-london
- QR: https://bumpin-silk.vercel.app/qr
- Deployment: https://bumpin-57l1gz88w-amanshah0844-8466s-projects.vercel.app

Public screenshot evidence: `/tmp/bumpin-onboarding-live-chromium.png` and `/tmp/bumpin-onboarding-live-webkit.png` (generated guest identity, no attendee registration).

MIT remains present. Public repository publication and a physical two-phone rehearsal remain submission tasks. Existing Next.js middleware and Vitest CJS deprecation notices remain.
