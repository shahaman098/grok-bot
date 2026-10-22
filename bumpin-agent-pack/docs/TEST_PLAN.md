# Test matrix
Automated: TS compile, ESLint, unit tests for URL validation, consent transitions, matching determinism and event visibility; integration tests for RLS (cross-user mutation rejected, hidden member not readable); Playwright mobile viewport flows.

Physical: iPhone Safari and Android Chrome where available; open Vercel HTTPS directly, not embedded; allow GPS; deny GPS; revoke; location unavailable; location timeout; refresh; background/foreground; poor Wi-Fi/mobile data; LinkedIn external link; zoom/pan; profile bottom sheet; map attribution; reconnect; two phones join and leave; ensure no hidden users visible. Confirm map tile provider quota and keys. Never claim test passed without executing it.
