# Easier onboarding — acceptance criteria and setup

## Acceptance criteria

- One primary **Join with LinkedIn** action starts authorization and completes event entry after provider consent, without a second BumpIn join form. LinkedIn may require login and consent on its own screens.
- A short-lived HttpOnly join-intent cookie ties automatic membership to the event and explicit sharing action. A plain sign-in callback, expired/mismatched intent or failed authorization never creates a membership.
- Profile sharing is explained beside the action. LinkedIn and guest entry appear on the event map automatically. Existing hidden memberships remain hidden when restored. Stage approval stays separate. Guest entry uses a generated name.
- Official LinkedIn OIDC sign-in, when enabled in Supabase, prefills the authenticated user's name and allowed profile photo. It does not claim to import skills, work history, headline, public-profile URL or event intent.
- The LinkedIn button is disabled with an honest explanation when the provider is unavailable. Credentials are not present at implementation time.
- A PKCE callback exchanges the code server-side and redirects only to a known event route. Cancelled/failed authorization returns a safe, fixed message, never raw provider errors.
- No profile fields, preference chips or visibility checkbox appear on the entry screen. Matching preferences remain optional after joining; no skills or needs are invented from identity data.
- Return sign-in preserves saved participant-entered profile fields. Failed automatic entry shows a retry path without reporting success.
- Imported identity data comes from the verified Supabase user and LinkedIn identity on the server. Client-submitted profile photos are not trusted. Emails and provider tokens never enter attendee or stage projections.
- LinkedIn photos are limited to HTTPS LinkedIn CDN hosts, have an avatar fallback and are shared only in the opted-in attendee directory. Stage snapshots continue using the generated avatar shown in their own consent preview.
- Test provider-disabled/error/callback paths, data mapping, input validation, narrow layouts and the existing mutual-introduction/stage flow. Do not submit registration forms during browser QA.

## LinkedIn setup (required to activate sign-in)

1. Create an application in https://www.linkedin.com/developers/apps. LinkedIn asks for an associated LinkedIn Page and app logo.
2. Request the **Sign In with LinkedIn using OpenID Connect** product in Products. Confirm the `openid`, `profile` and `email` permissions are provisioned.
3. In Supabase → Authentication → Sign In / Providers → LinkedIn (OIDC), copy the provider callback URL. Add that exact URL to the LinkedIn app's authorized redirect URLs. Its shape is `https://<project-ref>.supabase.co/auth/v1/callback`.
4. Enter the LinkedIn Client ID and Client Secret in the Supabase LinkedIn (OIDC) provider settings, enable the provider and save. Do not put the secret in browser code, source control or chat.
5. Add `https://bumpin-silk.vercel.app/auth/callback**` to Supabase Authentication → URL Configuration → Redirect URLs, and use the production app origin as Site URL. For local development add `http://localhost:3000/auth/callback**` (or the actual local origin). Add review deployment origins explicitly when testing them.
6. Apply `20261022200000_linkedin_onboarding.sql` after the existing migrations. Refresh the app: the provider availability endpoint should report enabled.
7. Test a consenting account end to end: **Join with LinkedIn** → LinkedIn authorization → automatic event entry → hide/leave. Confirm cancellation, expired intent, returning hidden memberships and failed database writes work safely, missing photos fall back and no member email is shown publicly.

To apply just the onboarding migration to an existing configured database:

```sh
node --env-file=.env.local scripts/apply-onboarding-migration.mjs
```

This checks the existing introduction schema, applies the additive column and replaces the attendee RPC in a transaction. It does not enable the LinkedIn provider or apply other pending migrations.

Standard OIDC only returns lite identity information; email can also be absent. The current implementation does not use sign-in to claim a verified identity or fetch a professional biography. Match goals are participant-selected.

Primary references:
- https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2
- https://supabase.com/docs/guides/auth/social-login/auth-linkedin
