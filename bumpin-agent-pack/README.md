# BumpIn — Agent-Driven Hackathon Build Pack

**Status:** implementation plan, not a completed application. **Goal:** working QR-to-map demo at Grok Bot Community Engineering London Hackathon, 22 October 2026.

## North star
Scan QR → join event → opt into map visibility → see consenting attendees → tap avatar → bottom-sheet LinkedIn profile → optionally ask Grok for explainable introductions.

## Run order
1. Read `AGENTS.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`.
2. Run `prompts/00-ORCHESTRATOR.md` in a coding agent.
3. Have agents implement sequentially with parallel research and testing, not concurrent edits to the same files.
4. Create a Supabase project and Vercel deployment; provide secrets only via environment settings.
5. Test on two physical phones and a fallback Wi-Fi/mobile connection.

## Definition of done
Two real devices independently join the same event, appear on a map with consent, show profile sheets and external LinkedIn links, survive refresh, and have a functioning no-GPS fallback. AI matching is optional unless actual integration is verified.

## Docs
`docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/SECURITY.md`, `docs/BUILD_PLAN.md`, `docs/TEST_PLAN.md`, `docs/DEPLOYMENT.md`, `docs/DEMO.md`, `docs/TRACK_FIT.md`, `reference/RESEARCH.md`, `app-spec/SCREENS.md`, `agents/ROLES.md`, `prompts/00-ORCHESTRATOR.md`, `prompts/01-IMPLEMENT.md`, `prompts/02-QA.md`.
