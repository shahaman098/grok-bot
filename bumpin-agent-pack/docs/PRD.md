# Product requirements
## Audience
Hackathon attendees physically at the event. Scope limited to this hackathon for MVP.
## P0
- Mobile-friendly HTTPS web app with `/e/[slug]` deep link and QR.
- Lightweight registration: display name, optional LinkedIn URL, avatar choice, optional 'building' and 'looking for'.
- Anonymous or verified session mechanism with protected profile ownership; avoid impersonation by clearly labelling self-declared profiles.
- Explicit consent for event visibility and separately for location; ability to revoke visibility.
- Map with event venue and participating avatars; pan/zoom; avatar click opens accessible bottom sheet with LinkedIn external link.
- Live join/leave updates across two phones; join without GPS at event pin/abstract attendee area.
- Seed one event with verified venue and organiser-provided Luma URL.
- Graceful offline/error states; QR entry link.
## P1
- Matching based on opt-in 'building' and 'looking for' text; reason shown; no random claims.
- Grok Bot adapter when actual supported API and permission are confirmed.
- Additional curated events, then optional compliant Luma integration.
## Out of scope
LinkedIn OAuth/scraping, background location tracking, public global people map, payments, messaging, swipe matching, automatic broad Luma scraping.
## Success
Two devices independently join, updates visible within a few seconds on reasonable connectivity, both can open a profile and event link; no-GPS and revoke-visibility flows pass.
