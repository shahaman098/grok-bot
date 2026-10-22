# Grok connection recovery — 22 October 2026

Acceptance: the connection page checks membership before enabling token creation; signed-out/non-members receive a same-browser join link; hidden members get an explicit visibility action; failed or stalled requests recover instead of leaving loading controls indefinitely. Existing credentials are not rotated by page checks or visibility recovery.

Changed `app/connect/grok/page.tsx` and added `lib/bot/request.ts`. Requests have a ten-second abort timeout, including the response-body read. Membership is rechecked after becoming visible and after a token-creation permission failure. Profile visibility and token creation remain separate explicit actions. Setup copy now describes Grok Bot's verified secure-secret route, without claiming it exposes a native header editor.

Validation: typecheck and lint passed; 106 unit tests passed. Twelve connection-flow tests passed across mobile Chromium and WebKit, covering a narrow 320px page, signed-out recovery, hidden-to-visible recovery, token issuance, visibility changes during issuance, timeout recovery and failed-check retry. These browser scenarios intercept network responses and do not change live users or credentials. Additional rendered checks at 390×844 and 1280×900 verified interaction recovery, no blank/error overlay, no horizontal overflow and no runtime exceptions. The expected mocked signed-out HTTP 401 is the only browser console error in that run.

Browser skill not listed in this session: the repository Playwright workflow supplied isolated automated QA. The available in-app browser supplied the final live check. Production `/connect/grok` had the correct identity, completed membership checking, enabled access for the already-visible attendee and had no console warnings/errors. No live token was created or rotated during this fix.

Screenshots outside the repository: `/tmp/bumpin-connect-visibility-mobile.png` and `/tmp/bumpin-connect-join-desktop.png` (simulated membership states).

Production release: `dpl_8Btm9iTD8f81G8Sjd9VeycVSnp4k`, ready and aliased to `https://bumpin-silk.vercel.app`. Real hidden-member mutation was simulated in browser QA; live membership checking was verified without changing visibility.
