# Love at First Bot — acceptance criteria

Build on BumpIn for Track 2: member introductions with evidence and an optional game-show reveal.

- Optional offers/needs profile fields support deterministic complementary matching; existing registration and query search continue working.
- Only visible members of the same event can request an introduction. Self, unrelated and hidden profiles are excluded. Requests are unique per event pair.
- Only the recipient can accept/pass; the sender can withdraw. Only participants can read private connections. Database functions enforce transitions atomically.
- Accepted pairs receive an evidence-grounded opener and suggested ten-minute task, clearly labelled as suggestions.
- Stage publication needs both participants' separate approval of the exact preview. Personal jokes are optional, curated and individually approved.
- Stage responses expose only approved names, avatars, evidence, jokes and task. Hiding, leaving or withdrawing revokes publication; relevant profile edits reset approval.
- Preview mode works across tabs of one browser, labelled honestly. Configured Supabase supports separate devices; physical two-phone behavior must be rehearsed before claiming it.
- Phone and desktop views support keyboard operation, narrow layouts, reduced motion and clear retry states. No private data is sent to external AI.
- Typecheck, lint, unit, database and end-to-end checks provide recorded evidence. Existing map, membership, privacy and query behavior are preserved.

Design: midnight/navy game-show stage, coral spotlights, oversized condensed headlines, paired contestant cards, a single deliberate match reveal. BumpIn navigation stays intact. Generic host jokes accompany the flow; personal jokes are previewed, never inferred.
