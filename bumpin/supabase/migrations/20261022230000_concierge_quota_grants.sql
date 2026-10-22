-- Hosted Supabase may grant anon function execution through default privileges.
-- Keep this paid-endpoint helper explicitly restricted to authenticated members.
revoke all on function public.claim_concierge_quota(text,text) from public,anon;
grant execute on function public.claim_concierge_quota(text,text) to authenticated;
