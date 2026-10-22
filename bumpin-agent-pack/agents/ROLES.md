# Agent operating model
Orchestrator: owns scope, integration gates, acceptance and merge decisions.
Frontend agent: Next.js shell, MapLibre, mobile UI, sheet, avatars.
Backend agent: Supabase migrations, auth, RLS, realtime, privacy projection.
Integration agent: QR, seed event, Luma link, optional Grok adapter; no invented endpoints.
QA agent: tests, device matrix, security checks, reproducible bug reports.
Release agent: Vercel configuration, env templates, deployment and rollback.

Protocol: agents create issue/task checklist and report changed files, commands run, tests passed/failed, blockers. Prefer separate branches/worktrees and integration in dependency order. Do not give production keys to LLM chat. Never claim successful deployment without proof.
