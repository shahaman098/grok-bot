# Love at First Bot — completion evidence

22 October 2026. Acceptance criteria are recorded in [LOVE-AT-FIRST-BOT.md](LOVE-AT-FIRST-BOT.md).

## Delivered

- Backwards-compatible offers field, own-profile editing, directional complementary matching, source excerpts and deterministic ranking.
- Mutual introduction requests with recipient acceptance/pass, sender withdrawal, private request lists, opener and suggested ten-minute task.
- Prepared host humour and optional curated personal jokes. Exact preview revisions and separate participant stage approvals.
- Projected reveal, safe public projection, consent polling, clear-on-error behavior and withdrawal/hide/leave protection.
- Mobile accessibility and reduced motion, existing directory/map/QR flows, MIT licence and updated Track 2/demo/setup documentation.
- External AI processing is disabled. No Grok Bot, LinkedIn enrichment or live Luma integration is claimed.

## Executed checks

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| ESLint | Passed |
| Unit/API tests | 40 passed across 9 files |
| Disposable PostgreSQL | 9 integration scenarios passed |
| Browser suite | 28 passed across mobile Chromium and WebKit |
| QR release-host follow-up | 2 passed, Chromium and WebKit |
| Production build | Passed locally and on Vercel |
| Configured Supabase + local production HTTP server | 7 scenarios passed with independent authenticated sessions |
| Vercel cloud deployment + configured Supabase | Same 7 scenarios passed through authenticated CLI |
| Public production routes | Event title, same-release QR and anonymous no-store stage response verified |
| Public rendered phone onboarding | 390×844 Chromium; offers field visible, consent unchecked, no page errors, no registration submitted |

The browser flow seeds membership rather than submitting registration. It verifies matching → request → recipient acceptance → optional joke → separate approvals → projected reveal → revocation, and checks failed-write recovery. Layout checks cover 320×568, 390×844, 844×390 and 1280×800; the stage screenshot uses 1440×1100. No app page errors were observed during the tested full flow.

Database tests run in a disposable local PostgreSQL cluster, never DATABASE_URL. They check caller authorization, self/cross-event targets, unique pairs, simultaneous requests and approvals, invalid transitions, safe public projection, stale preview rejection, joke/profile consent resets, hidden membership and leave cascades.

Configured-backend checks create synthetic identities inside a separate temporary QA event, call the HTTP API with two session cookie jars, verify an anonymous stage, then remove the event, profiles, connections and auth identities. They do not register real attendees or contact anyone.

## Database release

Applied atomically to the configured Supabase project:

- `20261022180000_venue_only_positions.sql`
- `20261022190000_love_at_first_bot.sql`

This includes the previously missing venue-position protection. Raw client positions were discarded as specified by that migration. Schema cache reload was requested. `npm run db:migrate:love` checks for these additions before applying them again.

## Release and limits

Verified Vercel release: `dpl_Co7pd1RbWHQHgbqxhT9cMd7EDRY6`, built at `https://bumpin-a50glyn4h-amanshah0844-8466s-projects.vercel.app` and promoted successfully.

Public app: https://bumpin-silk.vercel.app/e/grok-bot-london · QR: https://bumpin-silk.vercel.app/qr

The same seven HTTP scenarios passed against the cloud build using Vercel's authenticated protection bypass before promotion. All synthetic data was cleaned up. After promotion the public event returned the new title, the QR targeted its own release host, and the anonymous stage returned `{ "snapshot": null }` with no-store caching. Unpromoted deployment URLs require Vercel login; use the public app URL for attendees.

The app runtime source and deployment are finished. No further application source edits are planned in this implementation. The added migration/smoke-test helpers and completion documentation describe this release; they do not add runtime features.

A real two-physical-phone rehearsal has not been performed. Browser preview uses one shared browser storage area and is not a production security boundary. Separate authenticated HTTP sessions exercise the configured backend, but cannot establish venue Wi-Fi/physical device behavior.

Stage revocation is observed on a two-second poll. A failed permission check clears the content after its five-second timeout; previously saved screenshots cannot be recalled. Request snapshots preserve the profile context at creation and explicitly label that context in the approval UI.

A public GitHub repository is still a submission requirement. No repository was created or published as part of this implementation. MIT is present locally. Existing Next.js middleware and Vitest CJS deprecation notices remain.

Screenshot evidence: `/tmp/bumpin-love-public-phone.png`, `/tmp/bumpin-love-stage-mobile-chrome.png`, `/tmp/bumpin-love-phone-mobile-chrome.png`, with WebKit equivalents. The screenshots contain fictional QA participants.
