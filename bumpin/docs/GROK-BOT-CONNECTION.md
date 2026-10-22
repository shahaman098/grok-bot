# Grok Bot platform connector

## Acceptance criteria

- Expose a public HTTPS MCP endpoint that Grok Bot can discover and call.
- Public tools return seeded event information and already approved stage snapshots only.
- Private tools require a random, hashed, event-scoped token, issued by an authenticated visible attendee after explicit consent. Tokens expire after one hour and are revocable; hiding/leaving invalidates their use.
- Private results contain only current visible event profiles and evidence, never contact links, authentication IDs, coordinates or private introduction state. No write tools.
- Verify protocol interoperability, unauthorized access, event isolation, expiration, revocation and hidden-member filtering. Record live platform verification separately from automated checks.

## Direction

Grok Bot calls BumpIn through MCP. This does not dispatch Grok Bot from the BumpIn app and does not use the xAI model API. The existing optional voice concierge is independent.

## Connect

Endpoint: `https://bumpin-silk.vercel.app/api/mcp` (Streamable HTTP; modern MCP and 2025 handshake).

Send this in your Grok Bot conversation:

> Add a custom remote MCP server named BumpIn at https://bumpin-silk.vercel.app/api/mcp. No credentials are needed for the public tools. Then call get_event to verify it.

| Tool | Access | Behavior |
| --- | --- | --- |
| `get_event` | Public | Event details, join link and setup link |
| `get_approved_introduction` | Public | Reads one known connection ID; returns null unless stage approvals and visibility remain valid |
| `find_people` | Scoped token | Up to three current profile-term matches and evidence |
| `find_my_collaborators` | Scoped token | Up to three matches against the connected member's offers and needs |

For private matching, join and become visible in BumpIn, then open [Connect Grok Bot](https://bumpin-silk.vercel.app/connect/grok). Review the sharing description and choose **Allow read-only access for one hour**. MCP clients with header configuration can use the returned `Bearer …` value in `Authorization`. Grok Bot did not expose a protected custom header editor during live setup: the verified route is to ask the Bot for a secure secret input, enter the raw event token there, and have it make authenticated MCP requests to the same endpoint using that secret. Never paste credentials into ordinary chat or supply Supabase/xAI credentials. The BumpIn setup page also revokes the token. See [live matching evidence and limitations](GROK-BOT-MATCHING-TEST.md).

## Setup and validation

After the existing base migrations, apply `20261022220000_bot_connector.sql` with `node --env-file=.env.local scripts/apply-bot-migration.mjs`. It transactionally applies only this migration, then refreshes the PostgREST schema. The configured database has been migrated.

- Typecheck, lint and full unit suite passed: 98 tests in 21 files.
- `node scripts/test-bot-db.mjs`: seven scenarios passed in disposable PostgreSQL. Tests cover anonymous/non-member denial, hashed credentials, expiry, event isolation, hidden-profile filtering, rotation, revocation, hiding/re-showing, and leaving. No configured database is read by this test.
- Production build passed.
- Real HTTP client calls against localhost and production: all four tools discovered, `get_event` returned the expected event, unauthenticated private search returned a tool error.
- Setup page returned HTTP 200 and its explicit one-hour sharing action was checked in the in-app browser.
- Production deployment: `dpl_BPNz4BAfa1nYSGTg2W8ihw6ewbwN`, aliased to `https://bumpin-silk.vercel.app` on 22 October 2026. This replaces the connector's first release, which was temporarily superseded by another deployment without these routes. The live setup page was rechecked after the replacement.

Grok Bot app registration was completed on 22 October 2026 at 20:41 London time. The registration prompt was sent in the existing Jarvis conversation. Jarvis confirmed that it added BumpIn and successfully called `get_event`, returning the expected hackathon, 18:00–23:00 BST schedule, venue and event links. The confirmation is saved in `outputs/grok-bot-registration.png`. A separate live MCP client also rediscovered all four tools and returned the correct event during this retry. No application code changed, so the existing test evidence above remains applicable. Private matching was subsequently verified through Jarvis using a securely stored one-hour secret and direct authenticated MCP calls; positive, empty and hidden-attendee results are recorded in [live matching evidence](GROK-BOT-MATCHING-TEST.md). Authentication on catalog-discovered private tools remains unverified.

## Platform sources

- [Grok Bot computer and apps](https://docs.x.ai/grok-bot/computer-and-apps): account-wide connectors.
- [Cursor staff: adding a custom Grok Bot connector](https://forum.cursor.com/t/grokbot-custom-connectors/169965/5): add a remote HTTPS MCP server from a Bot conversation.
- [Official MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk): SDK-based protocol handling, including legacy compatibility.
