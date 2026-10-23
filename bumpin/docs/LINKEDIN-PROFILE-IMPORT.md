# LinkedIn professional-profile import — 22 October 2026

Requested behavior: extract professional details from an attendee's LinkedIn profile and show them inside BumpIn, alongside the existing connection link.

Acceptance criteria:

- Import only the consenting attendee's own available professional details, retain their source and let the attendee review them before event sharing.
- Keep professional biography, experience, education and skills separate from event-specific projects, offers and collaboration goals. Do not infer goals from a job title or fabricate missing fields.
- Preserve existing profile ownership, member-only directory access and hide/leave controls. Keep email, raw exports and provider credentials outside the shared directory and stage projection.
- Show the actual import capability and actionable errors. Do not request unapproved OAuth scopes or claim richer imports are enabled from sign-in readiness alone.

Verified dependency:

- Inspected the live LinkedIn developer app 266631773, IIlLuminate, Products page. Its only added product is **Sign In with LinkedIn using OpenID Connect**, Standard Tier. Member Data Portability API (3rd Party) is listed under available products with Request access; it is not provisioned.
- BumpIn requests `openid profile email`. Its verified server identity mapper and callback already import name/photo and preserve attendee-entered fields. LinkedIn's OIDC claims do not contain professional headline, experience, education, skills or the public profile URL.
- The Profile API requires LinkedIn approval and additional field permissions. Access must support this event-networking use case; unrelated Marketing API access is not proof of permission.
- Third-party Member Data Portability requires company-page verification, business verification, an access application and LinkedIn approval. The current product documentation permits consent only for EEA members. It therefore does not provide general coverage for UK attendees.
- Repository instructions prohibit LinkedIn scraping. No scraping service, undocumented endpoint, new scope or provider token persistence was added.

Selected route: an optional importer for an attendee's own exported LinkedIn profile, with extraction into a private review before saving selected professional details to their own visible profile. This is a user-mediated import, separate from OAuth. Existing attendee-entered fields and the connection URL remain available.

References checked on 22 October 2026:

- https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2
- https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/profile-api
- https://learn.microsoft.com/en-us/linkedin/dma/member-data-portability/member-data-portability-3rd-party/

Implementation accepted by the user: import an attendee's own LinkedIn PDF/export inside BumpIn.

Implementation acceptance:

- Accept text-based LinkedIn PDFs and LinkedIn CSV exports (individual files or a ZIP containing Profile, Skills, Positions and Education CSVs). Parse locally without uploading the source file or using a third-party AI service.
- Show editable headline, about, skills, experience and education in a private draft. Clear or cancel the draft without saving. Only an explicit save shares the reviewed sections; event-specific offers/needs remain unchanged.
- Persist only validated professional sections to the caller's profile. Add a bounded JSON column and extend the existing member-only directory projection. Never include these details in public stage snapshots.
- Support editing/removal, parse failures, encrypted/scanned/oversized files, bounded ZIP extraction and mobile layouts. Keep the last saved profile on extraction or save failure.
- Verify meaningful parser, ownership and API validation cases; verify PDF and CSV review/save/cancel/reload behavior in mobile Chromium and WebKit. Use react-form-fill for browser form entry and synthetic profiles/exports for QA.

Implemented:

- Open your own People profile → Import your LinkedIn profile. PDF.js reads a text-based English LinkedIn PDF; the CSV reader accepts professional export files individually or in ZIP. All parsing and review happen in the browser. Other ZIP entries and contact/account columns are ignored.
- Edit or clear five professional sections before saving. Saved sections appear in People cards and profile panels. Editing, replacement, removal and draft cancellation are supported. Existing event offers, projects and needs remain separate. Imported skills are displayed; this release does not use them to infer event offers or matching intent.
- Only the validated, bounded five-section JSON object is persisted. Existing RLS enforces ownership, and the member-only attendee RPC applies visibility. The original file, its name, contact fields and extraction draft are not sent to the backend. Public stage snapshots remain unchanged.
- Limits: four CSV files, 8 MB total, PDFs up to 20 pages and 60,000 extracted characters, allowlisted ZIP contents up to 1 MiB expanded. Oversized fields are shortened with a review warning. Scanned PDFs, locked PDFs, unsupported/non-English headings and unrecognized formats require a supported export instead. PDF layout variations always require attendee review.

Local verification:

- Typecheck, application lint and all 136 unit/API tests passed. Generated `outputs/` and `artifacts/` were excluded from lint, as in the preceding deployment. The generated PDF.js worker is excluded through the ESLint configuration, like the MapLibre worker.
- All 11 disposable PostgreSQL scenarios passed, including new professional-profile JSON bounds, RLS ownership, event membership and hidden-profile checks.
- The isolated production build succeeded. All six new importer browser cases passed on Chromium and WebKit after fixing explicit textarea labels: real PDF extraction, editable review through react-form-fill (`ok: true` reports attached to results), no write before review, draft cancellation, ZIP extraction, failed replacement retaining the draft, persisted-display/reload and no other-member editor. Browser QA does not submit the final review form; hosted API checks exercise persistence separately.
- The initial broader browser run passed 26/34 and exposed the review-label issue plus unrelated animation/reload failures. The subsequent broader run passed 27/30, including all importer cases; its remaining failures were two existing event-details animation timeouts and an existing WebKit concierge polling/reload error. These runs are not claimed as clean full-suite passes.
- Inspected `/tmp/bumpin-profile-import-review-mobile-safari.png`. Browser evidence is in `/tmp/bumpin-profile-import-final`; synthetic PDF fixture: `e2e/fixtures/linkedin-profile.pdf`.

Final focused browser verification: all **6/6 importer cases passed** with one worker against the same isolated production build (`/tmp/bumpin-profile-import-focused`). React-form-fill reports are attached to these cases and return `ok: true`. No real attendee export or registration was used.

Production release — 22 October 2026:

- Configured database migration `20261022250000_professional_profile.sql` applied atomically. The additive column and extended safe RPC remain compatible with the preceding app release.
- Remote production build passed. Deployed and promoted **dpl_4h28pZkc5YJHZVHoCp43yrdb6Yw9**, Ready: https://bumpin-7gmwdie2n-amanshah0844-8466s-projects.vercel.app. Public event: https://bumpin-silk.vercel.app/e/grok-bot-london.
- Four hosted API scenarios passed using `scripts/smoke-profile-import.mjs`: save/read persistence with unchanged goals, another member's safe projection, invalid/unauthenticated writes preserving saved data, and removal/hiding. Temporary QA event, profiles and authentication identities were removed.
- After promotion, public event and importer UI assets, PDF worker delivery, LinkedIn readiness and unauthenticated-directory denial were verified. The public alias resolves to the new deployment.
- Previous app deployment for rollback: `dpl_H3fAoe7XetvPNPKW6bfG5tBvAWxs`; leave the additive column in place when rolling back the application.
