# BumpIn × Love at First Bot

**Less small talk. More shipping.** Opt-in event networking with explained collaborator matches, mutual introductions and a consented big-screen reveal. Built for Track 2 — Know Your Members.

## The experience

1. Open the event QR and tap **Join with LinkedIn**. Once configured, authorization imports name/photo and enters the event automatically. LinkedIn and guest entry appear on the attendee map automatically; the action explains sharing, and Hide/Leave remain available. There are no profile fields or checkboxes before entry.
2. Open **Find my collaborator** and optionally choose what you offer and need. Mutual offers/needs rank ahead of one-way help and shared project interests. Exact profile excerpts explain each suggestion; there are no compatibility percentages.
3. Request an introduction. The recipient accepts or passes; the sender can withdraw. An accepted pair receives an opening line and a suggested ten-minute collaboration task.
4. Optionally take the match to the stage. Each person can select a curated joke about themselves. Both must approve the exact preview before the link exposes attendee details.
5. Open the approved stage link on a laptop and reveal. Either participant can revoke stage permission. Hiding or leaving also removes stage access.

Profiles are self-declared. Matching and copy use local rules/templates. The [Grok Bot MCP connector](docs/GROK-BOT-CONNECTION.md) exposes public event tools and optional, explicitly authorized event-scoped attendee matching. The separate xAI voice concierge has its own activation requirements. Acceptance does not prove a meeting or collaboration occurred.

From People, open your own profile and choose **Import your LinkedIn profile** to read a text-based LinkedIn PDF or supported CSV export (including ZIP). Files are parsed on your device. Review/edit the extracted professional sections, then explicitly save them to your visible profile. This is separate from LinkedIn sign-in and preserves event-specific offers/goals. See [profile import](docs/LINKEDIN-PROFILE-IMPORT.md) for limits and verification.

## Run

The **Concierge** tab adds voice or typed requests, profile-grounded reasons and matched venue markers. Paid voice and AI matching require owner approval through **Request access**; free basic typed matching remains available. Live xAI access also requires a separate key and feature flag, disabled by default. See [access administration](docs/PAID-ACCESS.md) and [concierge setup and verification](docs/VOICE-CONCIERGE.md) for actual release/provider evidence.

```sh
cp .env.example .env.local
# Configure Supabase URL, publishable key, DATABASE_URL and app URL.
# Apply all SQL migrations in filename order (see below).
npm install
npm run dev
```

- Event: `/e/grok-bot-london`
- QR: `/qr`
- Approved stage: `/e/grok-bot-london/show/<connection-id>`

With Supabase disabled, preview mode uses localStorage and BroadcastChannel, with per-tab identities. It syncs only tabs within one browser, not separate devices. Preview storage is a development convenience, not a security boundary. No attendees are seeded automatically.

## Database setup

Apply every SQL file in `supabase/migrations/` in filename order. Existing installations need:

- `20261022180000_venue_only_positions.sql` — discards old client positions and enforces venue offsets for all database writes.
- `20261022190000_love_at_first_bot.sql` — adds offers, connection state, participant-only RPCs, versioned stage approval and a safe public stage projection.
- `20261022200000_linkedin_onboarding.sql` — adds the optional identity photo and safe attendee projection.
- `20261022210000_concierge_quota.sql` and `20261022230000_concierge_quota_grants.sql` — atomic per-member quotas for the optional voice/search concierge; execution is restricted to authenticated members.
- `20261022220000_bot_connector.sql` — revocable, hashed, read-only credentials for the Grok Bot MCP connector.
- `20261022240000_concierge_access.sql` — owner-granted access list for the paid concierge endpoints.
- `20261022250000_professional_profile.sql` — bounded reviewed professional sections, with existing profile ownership and member-only visibility enforced. Apply before releasing the importer: `node --env-file=.env.local scripts/apply-profile-import-migration.mjs`.

The new attendee RPC shape adds `can_help_with`; old profiles remain valid. Connection tables cannot be read or written directly by browser roles. SQL functions validate participants, transitions, evidence excerpts and preview versions. Profile edits reset stage consent; the request snapshot remains labelled as captured at introduction time.

Use [Supabase setup](docs/SUPABASE-SETUP.md) for the existing guest-session configuration and [deployment instructions](docs/DEPLOYMENT-LOCAL.md). The tracked SQL is the source of truth; inspect the completion note for what has actually been applied.

LinkedIn sign-in is prepared but requires a developer app and provider configuration. Follow [LinkedIn onboarding setup](docs/LINKEDIN-ONBOARDING.md). Standard sign-in supplies name/photo, not skills or work history. Guests can join while it is disabled. See [minimal-entry release evidence](docs/MINIMAL-ENTRY-COMPLETION.md) for completed checks and activation limits.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run test:connections:db
npm run test:e2e
npm run build
```

`test:connections:db` creates and deletes an isolated local PostgreSQL cluster. It **never reads DATABASE_URL**. It defaults to `/opt/homebrew/opt/postgresql@17/bin`; set `BUMPIN_PG_BIN` to another installed PostgreSQL binary directory.

End-to-end checks use an isolated `.next-e2e` production build with Supabase disabled. They seed membership without submitting registration, exercise two identities, failure recovery, stage consent/revocation, mobile Chromium/WebKit and desktop layouts. Screenshots/results are saved under `/tmp`. A physical two-phone rehearsal remains necessary.

## Privacy and limits

Map markers for attendees are arranged around the venue. **Map → Locate me** optionally requests your own position after a tap and browser permission; its private dot is never saved or sent to BumpIn, other attendees or the concierge. It clears when hidden, when leaving the map or when the page backgrounds. The directory is limited to event members; hidden attendees are excluded from discovery. Public stage access needs both approvals and is checked every two seconds. The stage clears on a failed check after its five-second timeout; this is not instant revocation of a screenshot someone already saved. Public responses omit contact links, authentication IDs and the private opener.

Prepared jokes target harmless project habits. Personal jokes are optional and require individual approval. No private attendee information belongs in public source control.

Stack: Next.js · TypeScript · Supabase · MapLibre · DiceBear · Vaul. MIT licensed. See the [demo script](docs/DEMO-SCRIPT.md), [track fit](docs/TRACK_FIT.md), [acceptance criteria](docs/LOVE-AT-FIRST-BOT.md) and [completion evidence](docs/LOVE-COMPLETION.md).

Live release: https://bumpin-silk.vercel.app/e/grok-bot-london · QR: https://bumpin-silk.vercel.app/qr. See the completion evidence for verified checks and remaining physical-phone/repository requirements.
