# Paid AI access

Acceptance: public visitors see **Request access** for voice and semantic AI matching. A request saves a pending record; it does not grant access. Both paid endpoints enforce approval on the server before contacting xAI. Free basic matching, event participation, introductions and the map remain available.

Access is scoped to the authenticated attendee and event. The database returns only the caller's status. Anonymous users and attendees without visible membership cannot request access. Direct client reads/writes to the access table are revoked; request RPCs cannot approve or undo revocation. No approval endpoint or administrative database credential is exposed to browsers.

Apply the setup with `node --env-file=.env.local scripts/apply-concierge-migration.mjs`; this includes `20261022240000_concierge_access.sql`. Requests can be collected before the xAI account is funded. Approved access still requires `XAI_API_KEY`, `BUMPIN_CONCIERGE_ENABLED=true` and the existing quotas. Adding a key never grants public access automatically.

The owner reviews and changes access through the existing secure server configuration:

```sh
node --env-file=.env.local scripts/concierge-access.mjs list
node --env-file=.env.local scripts/concierge-access.mjs approve <request-id>
node --env-file=.env.local scripts/concierge-access.mjs revoke <request-id>
```

The attendee sees **Access requested** until approval. The open concierge checks status every 30 seconds and when reopened. Revocation blocks subsequent voice credentials and AI searches immediately at the server. An already-established direct xAI WebSocket can continue until the client notices revocation or its existing session timer closes it; token expiry does not forcibly terminate an open provider connection. Provider spending limits remain necessary for account-level budget control.

Browser simulations use fictional accounts and mocked providers. Configured HTTP checks create an isolated synthetic event and users, exercise pending/approval/revocation, then delete the test data. By default they do not call xAI; live-provider verification requires the explicit flag documented below.

## Release evidence — 22 October 2026

Published in release `dpl_8ioA1trt33LK25K2NRq9RGwRzWxP` at https://bumpin-silk.vercel.app/e/grok-bot-london. Typecheck, lint, 102 unit/API tests, seven disposable database scenarios and twelve targeted mobile browser cases passed. The configured HTTP helper passed twelve scenarios without xAI and thirteen when explicitly opted into real-provider verification; the live mode adds approved semantic search and token issuance. Both local and staged cloud live checks passed, with synthetic records removed. Post-promotion public access denial was verified. See [full concierge evidence](VOICE-CONCIERGE.md).

To deliberately run the paid provider check, set `BUMPIN_LIVE_CONCIERGE_QA=1` when running `scripts/smoke-love-configured.mjs`. Default checks do not call xAI. Physical microphone testing remains separate.
