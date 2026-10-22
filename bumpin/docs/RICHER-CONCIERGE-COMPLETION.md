# Richer profile matching — 22 October 2026

## Acceptance

- Use the caller’s shared offers, project and goals to personalize broad requests.
- Respect explicit requests and exclusions over saved profile goals.
- Return up to three eligible attendees with one or two exact quotes from distinct candidate fields, explaining both relevant offers and projects when supported.
- Keep existing map highlights, result focus, ongoing call controls, paid approvals and rules fallback.
- Do not infer skills from needs or LinkedIn URLs, or send precise location, contact links, introduction or stage data to the model.

## Change

The server loads the caller through the existing safe event directory projection, excludes them from candidate results, and sends only their shared matching fields as context. The structured model response now supports two distinct quoted fields. Both quotes and the caller’s context are checked again after the provider returns; a changed caller profile triggers a labelled basic fallback. Existing cards display the combined reason and existing map markers highlight the returned attendees.

The concierge includes a “Who should I meet?” example and explains that audio/shared offers, projects and goals are processed by xAI. No onboarding fields, database schemas or LinkedIn imports were added.

## Verified in the isolated implementation

- Typecheck, targeted ESLint and the production build passed; all **124 unit/API tests** passed.
- **6 simulated browser cases** passed across mobile Chromium and WebKit: combined evidence on map cards and in voice tool output, marker focus, call controls, microphone cleanup/denial and paid access UI. Auth, microphone, WebSocket and matching responses are simulated in these cases.
- **3 direct real xAI requests** using fictional profiles passed: combined offer/project evidence; broad-query personalization; explicit marketing request overriding a saved speech-recognition goal.

- **13 configured local HTTP scenarios** passed against Supabase, including three real xAI semantic requests (paraphrased expertise, combined offer/project evidence, and broad-query personalization), ephemeral voice credential issuance, paid approval/revocation, onboarding, introductions and stage consent. All temporary accounts/events were removed.
- The first local HTTP run hit the cold development route compilation timeout; warming the isolated server resolved it. The first browser assertion incorrectly expected the voice tool’s evidence strings to be field objects; the corrected assertion checks both returned quotes.

## Combined source verification

The shared-profile/map release handed over after production `dpl_9Fc8phL6xWfkHMoQsmX4fDrVWbwm`. Only the reviewed concierge files, focused tests and documentation were integrated. Current profile, LinkedIn and private-location source was preserved. The combined source passes typecheck, full ESLint, all **124 tests** and the production build. The **6 simulated mobile browser cases** pass again against that production build, including opening a matched person’s full shared profile.

Generated `outputs/` recordings/presentations and `artifacts/` are now excluded from Vercel bundles. The first upload was canceled before deployment because these unrelated files inflated the bundle.

Physical-phone spoken input and noisy-room quality are not verified by these automated checks. Deployment verification follows below.
