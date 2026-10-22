# Time-boxed build plan (approximately 4–5 hours)
| Time | Milestone | Exit gate |
|---|---|---|
| 0–20m | Repo scaffold, env, seed venue/event, deploy skeleton | HTTPS URL loads on phone |
| 20–65m | MapLibre venue map, avatar markers, bottom sheet | Mock attendee cards work |
| 65–125m | Supabase schema, auth, join and event-scoped reads | Two browser sessions join |
| 125–165m | Realtime, consent, no-GPS fallback | Two phones update |
| 165–195m | QR, LinkedIn links, responsive polish | End-to-end smoke test |
| 195–225m | Optional matching + Grok Bot adapter | Reasons based on real opt-in text |
| 225–260m | Physical QA, network fallback, pitch rehearsal | Live demo works twice |

Parallel lanes: agent A frontend/map; B backend/RLS; C tests/docs. Integrator owns merges. Don't parallelise competing changes to same file. Freeze features 30 minutes before demo. If Grok API unknown, use transparent rules-based recommendations and describe future Grok integration rather than misrepresenting it. If network fails, run pre-recorded real walkthrough as backup, clearly labelled.
