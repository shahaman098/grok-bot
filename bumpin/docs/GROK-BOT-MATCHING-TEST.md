# Live Grok Bot matching test — 22 October 2026

## Acceptance and result

Store an event-scoped one-hour credential through Grok Bot's protected secret input, run real authenticated attendee matching from the existing Jarvis conversation, verify evidence and empty results, and remove the fictional fixture afterward.

The token was created for guest entry in the in-app browser. Jarvis accepted the protected secret and successfully ran BumpIn MCP requests against the production endpoint. A replacement token was saved as `BUMPIN_TOKEN_V2`, accepted on a subsequent search, and expires at 21:55 Europe/London. The old token was invalidated by rotation after it appeared in a browser page snapshot; no live credential is included in this note.

## Live scenarios

- Initial `find_people` and `find_my_collaborators`: successful authenticated calls, both empty before the QA attendee existed.
- Positive `find_people` query `AI agents TypeScript design`: one explicitly synthetic QA attendee, score 4, source `rules`, terms `agent`, `ai`, `design`, `typescript`.
- Exact returned evidence: `SYNTHETIC QA FIXTURE: AI agents built with TypeScript · TypeScript development and interface design · AI agent testing`.
- Nonsense query `zznonexistentqa987`: zero matches.
- Hidden fixture: replacement-token search returned zero matches.
- Fixture visible again: replacement-token search returned the same one match and evidence. Jarvis confirmed this at 21:00 London time.
- `find_my_collaborators`: remained empty, as expected for the guest profile with no offers or needs. Positive mutual-profile matching was not verified live.
- The temporary QA auth account, profile and event membership were removed after testing. The user's guest membership and replacement token remain active. No introductions or stage publications were created.
- Final cleanup verification at 21:03 London: Jarvis ran a fresh replacement-token search, returned zero matches and confirmed the synthetic attendee was gone. The BumpIn directory was also checked without the fixture. Sanitized app evidence is saved in `outputs/grok-bot-matching.txt`.

## Platform limitation and working route

Grok Bot's existing custom connector remains registered for public tools. Its app did not expose a protected custom Authorization header field. Jarvis therefore used the securely stored secret to issue authenticated MCP requests directly to the same production endpoint. This proves live attendee matching through Grok Bot, but does not verify authentication on its catalog-discovered private tools. Future requests in that Jarvis chat can use the stored replacement secret until it expires; full native connector sign-in would require a separately implemented authentication flow.

The optional attempt to prepare guest profile preferences with react-form-fill stopped at a failed dry run (`FIELD NOT FOUND`). No profile fields were written or submitted. No positive mutual-profile result is claimed. Existing automated matching/permission coverage remains separate from the live evidence above.
