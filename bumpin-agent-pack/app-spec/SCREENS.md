# UX / UI specification
Visual: dark navy, subtle electric blue, crisp map, rounded avatar pins, high-contrast controls. Mobile-first 360–430px width, desktop responsive.

Screen A `/e/[slug]` first visit: event title, join CTA, 3-field form, optional 'building' and 'looking for', avatar preview, two distinct checkboxes 'Appear on attendee map' and 'Use my current location' (unchecked), explanatory note that avatar marker is approximate.
Screen B Map: full viewport map, event pin, attendee avatar markers, zoom controls, attendee count, 'Join/leave', privacy toggle, 'Find collaborators' optional.
Screen C bottom sheet: avatar, name, building/looking-for if provided, external LinkedIn button, event label, close/drag controls; map remains visible.
Screen D event sheet: title, time, venue, open Luma link. Use manually seeded event data.
States: loading, permission denied, no-GPS, offline, no attendees, map tile failure, session expired, private/hidden, backend unavailable.
Accessibility: keyboard navigation, screen-reader labels, focus trap on modal sheet, colour contrast, touch targets ≥44px.
