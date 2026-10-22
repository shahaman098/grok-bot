# Personal Grok Bot demo test — 22 October 2026

Acceptance criteria: rejoin the event in the existing guest session; mint a new one-hour scoped token; save it only in Jarvis's protected secret input; ask Jarvis for fresh matching results; leave the personal Bot ready for natural-language and voice use. No shared/team Bot publication or public introductions. Any synthetic attendee must be explicitly labeled and removed after testing.

Test in progress. Native catalog private-tool authentication is not configured: the verified fallback uses authenticated MCP requests from Jarvis with its stored secret.

## Live evidence

- Existing in-app-browser guest left and rejoined through Continue as guest. Form skill dry-run and final reports both returned `ok: true` with no fields. The event returned to its visible-attendee view.
- First token was rejected in Jarvis with an expired/revoked response. This was not counted as a pass. A replacement was created at 21:16 London, expiring at 22:16 BST. The protected `BUMPIN_DEMO_FINAL` card shows Secrets Saved. Jarvis reported accepting it after normalizing a pasted Bearer prefix.
- At 21:18:04 Jarvis confirmed three fresh authenticated MCP calls: `find_people("AI agents TypeScript design")` returned exactly the fictional demo attendee, score 4, terms agent/ai/design/typescript; the unrelated `zzdemo987unrelated` query returned zero; `find_my_collaborators` returned zero for the blank guest profile. Exact profile evidence is visible in the saved screenshot and sanitized accessibility transcript.
- A separate unauthenticated production HTTP call returned `isError: true` and requested an event connection.
- Synthetic account, profile and event membership were removed with exact UUID/email/name guards. No real attendees were modified by fixture cleanup.
- Grok Bot's desktop renderer froze during verification; a reload and app restart restored the saved conversation, exposing the completed test results. Native voice is available through Start voice chat. Physical microphone/audio quality was not verified. No Bot publication, shared Bot creation or introduction sending occurred.
- The final cleanup query and instructions for direct personal use were sent to Jarvis at 21:20:56.

Artifacts: `outputs/personal-demo-joined.png`, `outputs/personal-demo-matching.png`, `outputs/personal-demo-matching.txt`. No credential values were persisted in these artifacts. No application code changed; this run used live UI/backend verification rather than repeating unchanged unit checks.
