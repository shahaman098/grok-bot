# Data model (design contract)
`events`: id uuid PK, slug unique, name, venue_name, venue_lat, venue_lng, luma_url, starts_at, ends_at.
`profiles`: id uuid PK references auth.users, display_name, linkedin_url nullable, avatar_seed, building nullable, looking_for nullable, created_at.
`event_memberships`: event_id FK, user_id FK, visible boolean default false, location_consent boolean default false, display_lat/display_lng nullable, joined_at, last_seen_at; composite PK(event_id,user_id).

RLS: user owns own profile and membership; authenticated users may read only minimal profile fields for *visible members of the same event*. Never expose private coordinates, emails, IP addresses, session tokens or auth IDs in public projections. Implement a safe view/RPC for event member list, security-invoker semantics where appropriate, and verify policies with tests. Seed one event using verified URL and coordinates. Avoid exposing precise geolocation at all in MVP; place avatar around venue for visibility.

## Love at First Bot additions

`profiles.can_help_with`: nullable text, max 200 characters. Existing profiles remain valid. Matchmaking needs offers and needs; browsing does not.

`connections`: UUID primary key; event, sender and recipient memberships; status (`pending`, `accepted`, `declined`, `withdrawn`); immutable introduction snapshot; revision; separate stage approval flags and curated joke IDs. A unique unordered event-pair index prevents duplicate/opposite requests. Both membership foreign keys cascade on leave.

No table privileges are granted to browser roles. Participant-authenticated `list_connections`, `create_connection` and `update_connection` RPCs return safe projections without authentication IDs. Row-level security remains enabled. Only the recipient accepts/passes; only the sender withdraws. Changes are transactional.

The snapshot records profile context at request time and evidence excerpts checked against those profiles. Personal joke changes clear both approvals and increment the revision. Approving requires the exact preview revision. Relevant profile edits clear approvals without silently rewriting the captured introduction. Hiding withdraws active connections. Leaving deletes them.

`stage_connection` is callable anonymously but returns a limited snapshot only for an accepted pair with both stage approvals and both memberships visible. It omits contact links, raw IDs and the private opening line. Withdrawal or either consent revocation makes it return null. Responses must not be cached.
