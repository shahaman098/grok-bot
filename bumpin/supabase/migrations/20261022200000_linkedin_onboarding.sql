-- Official LinkedIn OIDC: identity photo only, no scraped professional data.
alter table public.profiles add column if not exists avatar_url text
  check (avatar_url is null or (length(avatar_url)<=2048 and avatar_url ~ '^https://([a-zA-Z0-9-]+\.)*licdn(-ei)?\.com/'));

drop function public.list_event_attendees(text);
create function public.list_event_attendees(p_event_slug text)
returns table (membership_id text, display_name text, linkedin_url text, avatar_seed text, avatar_url text, building text, can_help_with text, looking_for text, display_lat double precision, display_lng double precision, is_self boolean)
language sql stable security definer set search_path = public, extensions as $$
  select encode(extensions.digest(em.user_id::text, 'sha256'), 'hex'), p.display_name, p.linkedin_url, p.avatar_seed, p.avatar_url, p.building, p.can_help_with, p.looking_for, em.display_lat, em.display_lng, em.user_id = auth.uid()
  from public.events e join public.event_memberships em on em.event_id=e.id join public.profiles p on p.id=em.user_id
  where e.slug=p_event_slug and auth.uid() is not null
    and exists(select 1 from public.event_memberships mine where mine.event_id=e.id and mine.user_id=auth.uid())
    and (em.visible or em.user_id=auth.uid());
$$;
revoke all on function public.list_event_attendees(text) from public;
grant execute on function public.list_event_attendees(text) to authenticated;

-- Personal photographs are deliberately absent from existing public stage snapshots.
-- Stage continues to show the generated avatar each participant previews.
notify pgrst, 'reload schema';
