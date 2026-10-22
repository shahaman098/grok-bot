# LinkedIn activation — 22 October 2026

Acceptance: official LinkedIn OIDC enabled, correct production callbacks saved, and a real consenting account completes the BumpIn event join. Never claim end-to-end success from configuration alone.

Verified configuration:
- LinkedIn app 266631773, IIlLuminate; public client ID 78hdht8foqdpx7.
- OpenID Connect product provisioned. Auth page after reload lists openid, profile, email.
- Authorized LinkedIn redirect saved and verified after reload: https://kotrvhfgnzoiwurifgou.supabase.co/auth/v1/callback
- Supabase Better Call Grok (kotrvhfgnzoiwurifgou) Site URL saved and verified after reload: https://bumpin-silk.vercel.app
- Supabase callback allowlist saved and verified after reload: https://bumpin-silk.vercel.app/auth/callback**
- Correct client ID prepared in the Supabase LinkedIn (OIDC) panel. User completed secret entry and provider enable/save. Public readiness subsequently returned enabled:true.

Status: complete for activation. User confirmed a real fresh-session LinkedIn sign-in returned to the event with their name and photo. This is user-verified end-to-end evidence; the agent separately verified the live initiation and redirect. Live readiness returned enabled:true. An isolated HTTP session received HTTP 200 from POST /api/auth/linkedin, both join-intent and PKCE cookies, and a Supabase HTTP 302 redirect to api.linkedin.com/oauth/v2/authorization with the expected client ID, identity scopes, and exact Supabase callback. No OAuth tokens or cookie values were printed or persisted. The HTTP check alone verified initiation; the user subsequently confirmed the complete account flow. The existing agent browser attendee session was preserved. A two-physical-phone collaborative demo was not performed in this activation task. No application source changes, migrations, or deployment performed for this configuration work.

Form-tool evidence: used a task-local copy of react-form-fill under /tmp/bumpin-form-fill, leaving the shared skill unchanged. Added regression fixtures before repairing active-dialog selection, named unlabeled fields, and keyboard-driven editable lists. Focused fixture checks passed. Initial full Playwright regression run passed; the in-page run encountered a script-version assertion because the scratch script was edited during the run, so it is not a clean full-suite result. Live form reports were ok:true, and saved callback values were checked again after page reload.

No client secret is stored in this document or application source. OIDC supplies name/photo and potentially email; it does not supply a full LinkedIn work history, skills, or event collaboration goals.
