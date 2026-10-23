-- Reviewed attendee imports only; original documents are never stored.
alter table public.profiles add column if not exists professional_profile jsonb
  check (professional_profile is null or coalesce(
    jsonb_typeof(professional_profile) = 'object'
    and professional_profile - array['headline','about','skills','experience','education']::text[] = '{}'::jsonb
    and jsonb_typeof(professional_profile->'headline') = 'string' and length(professional_profile->>'headline') <= 240
    and jsonb_typeof(professional_profile->'about') = 'string' and length(professional_profile->>'about') <= 2000
    and jsonb_typeof(professional_profile->'skills') = 'string' and length(professional_profile->>'skills') <= 1000
    and jsonb_typeof(professional_profile->'experience') = 'string' and length(professional_profile->>'experience') <= 4000
    and jsonb_typeof(professional_profile->'education') = 'string' and length(professional_profile->>'education') <= 2000,
    false));

-- Preserve the existing safe, event-member-only projection and visibility rules.
drop function public.list_event_attendees(text);
create function public.list_event_attendees(p_event_slug text)
returns table (membership_id text, display_name text, linkedin_url text, avatar_seed text, avatar_url text, building text, can_help_with text, looking_for text, display_lat double precision, display_lng double precision, is_self boolean, professional_profile jsonb)
language sql stable security definer set search_path = public, extensions as $$
  select encode(extensions.digest(em.user_id::text, 'sha256'), 'hex'), p.display_name, p.linkedin_url, p.avatar_seed, p.avatar_url, p.building, p.can_help_with, p.looking_for, em.display_lat, em.display_lng, em.user_id = auth.uid(), p.professional_profile
  from public.events e join public.event_memberships em on em.event_id=e.id join public.profiles p on p.id=em.user_id
  where e.slug=p_event_slug and auth.uid() is not null
    and exists(select 1 from public.event_memberships mine where mine.event_id=e.id and mine.user_id=auth.uid())
    and (em.visible or em.user_id=auth.uid());
$$;
revoke all on function public.list_event_attendees(text) from public;
grant execute on function public.list_event_attendees(text) to authenticated;
notify pgrst, 'reload schema';
