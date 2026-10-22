# Automatic map appearance — 22 October 2026

Acceptance: joining through either LinkedIn or guest entry appears on the attendee map automatically, with no visibility checkbox. Entry explains sharing. Hide and Leave remain available inside the event; restoring a deliberately hidden existing membership does not reveal it. No GPS is collected, and stage consent stays separate.

Implementation: guest and authenticated entry submit `visible: true`. The join schema defaults omitted visibility to true; explicit legacy private API input remains supported. Existing hidden sessions are preserved.

Verification: 57 unit/API tests passed, including a join request with omitted visibility creating a visible membership with venue coordinates. Typecheck, lint and production builds passed. Four onboarding browser checks passed in Chromium/WebKit. Nine configured Supabase + local production HTTP scenarios passed, including automatic map appearance, safe discovery and subsequent hide/consent behavior; all synthetic QA data was removed. Browser QA did not submit registrations.

Published onboarding-only Vercel release `dpl_7yFj52WnHSh7MKVsGo4sUTmV1N31`, built at `https://bumpin-1ysfl8h5m-amanshah0844-8466s-projects.vercel.app` and promoted to https://bumpin-silk.vercel.app/e/grok-bot-london.

The user's open in-app tab was displaying the earlier form with the unchecked checkbox. After promotion it was refreshed and visually verified to show no checkbox and the automatic-map explanation. Screenshot: `/tmp/bumpin-auto-map-live.png`.

Concurrent concierge work was preserved in shared source and excluded from this release. No migration or credential changes were needed. LinkedIn activation remains pending as documented separately.
