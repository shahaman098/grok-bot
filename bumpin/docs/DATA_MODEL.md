# Data model (design contract)
`events`: id uuid PK, slug unique, name, venue_name, venue_lat, venue_lng, luma_url, starts_at, ends_at.
`profiles`: id uuid PK references auth.users, display_name, linkedin_url nullable, avatar_seed, building nullable, looking_for nullable, created_at.
`event_memberships`: event_id FK, user_id FK, visible boolean default false, location_consent boolean default false, display_lat/display_lng nullable, joined_at, last_seen_at; composite PK(event_id,user_id).

RLS: user owns own profile and membership; authenticated users may read only minimal profile fields for *visible members of the same event*. Never expose private coordinates, emails, IP addresses, session tokens or auth IDs in public projections. Implement a safe view/RPC for event member list, security-invoker semantics where appropriate, and verify policies with tests. Seed one event using verified URL and coordinates. Avoid exposing precise geolocation at all in MVP; place avatar around venue for visibility.
