# Track 2 — Know Your Members

BumpIn's **Love at First Bot** experience addresses the supplied Track 2 brief: opt-in member context, explained introductions and an end-to-end introduction that an organiser did not arrange manually.

The main outcome is a useful introduction. A playful host and optional, individually approved jokes make that outcome memorable. The venue map helps people browse attendees; it does not claim precise positions.

## Evidence to demonstrate

- Two attendees enter what they offer and need, receive a recommendation with quoted profile evidence, and mutually accept.
- Both receive an opener and a ten-minute task, labelled as suggestions.
- An optional projected reveal requires both people to approve the exact content. Revoke either approval and it becomes unavailable.
- Ask the attendees whether the suggestion was useful. Report their actual response, not invented success rates or volunteer hours.

The brief also proposes recurring weekly introductions and evidence-backed speaker discovery. Those are not implemented in this event-scoped version. Avoid claiming full coverage of the track or guaranteed eligibility for a sponsor prize.

Rules-based matching is implemented. A remote MCP connector is deployed and registered in Grok Bot, with a successful `get_event` call verified in the Jarvis conversation; see [connection evidence and setup](GROK-BOT-CONNECTION.md). Attendee tools require explicit consent and a revocable one-hour event token. Do not claim multi-Bot orchestration, LinkedIn enrichment or live Luma ingestion.

Sources: the user-supplied [overview](../../hackathon-briefs/00-hackathon-overview.md) and [Track 2 brief](../../hackathon-briefs/02-know-your-members.md) alongside this project. The later supplied event announcement lists Grok Bot/Cursor involvement among six criteria; the pasted portal overview lists five. Demonstrate actual tool use honestly.

Submission requirement: working demo, public GitHub repository, and an MIT, Apache-2.0 or AGPL-3.0 licence. This project includes MIT; repository publication must be verified separately.
