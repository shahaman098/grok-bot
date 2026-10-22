# Instructions for all coding agents
You are implementing BumpIn, a mobile-first, opt-in networking proof of concept. Read the project docs first. Do not claim unverified Grok Bot, LinkedIn or Luma integrations exist. Prioritise a reliable two-phone demo over speculative features.

Rules: TypeScript strict mode; never commit secrets; validate all input server-side; use Supabase RLS; no unrestricted client writes to other users; keep precise GPS private; don't expose exact live coordinates to strangers; event-level or deliberately coarse positions by default; no GPS without explicit consent. Do not scrape LinkedIn. Use user-entered links only. Link to manually curated Luma event first. Request location only on a user gesture; support denial, timeout and unavailable APIs.

For each task: inspect repo → write acceptance criteria → implement smallest vertical slice → run typecheck/lint/tests → record evidence in a short completion note. If blocked, implement a documented fallback. Do not fabricate test results or deploy success. Ask humans only for accounts, API keys, approvals and unavailable facts.
