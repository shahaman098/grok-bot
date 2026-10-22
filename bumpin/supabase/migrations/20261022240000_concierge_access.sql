-- Paid AI access is granted by the owner through server administration only.
create table public.concierge_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','approved','revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,event_id)
);
alter table public.concierge_access enable row level security;
revoke all on public.concierge_access from public,anon,authenticated;

create function public.concierge_access_status(p_event_slug text)
returns text language plpgsql stable security definer set search_path=public as $$
declare v_event uuid; v_status text;
begin
  if auth.uid() is null then raise exception 'Unauthorized' using errcode='42501'; end if;
  select e.id into v_event from public.events e join public.event_memberships m on m.event_id=e.id
    where e.slug=p_event_slug and m.user_id=auth.uid() and m.visible;
  if v_event is null then raise exception 'Visible event membership required' using errcode='42501'; end if;
  select status into v_status from public.concierge_access where user_id=auth.uid() and event_id=v_event;
  return coalesce(v_status,'required');
end;
$$;

create function public.request_concierge_access(p_event_slug text)
returns text language plpgsql security definer set search_path=public as $$
declare v_event uuid;
begin
  if auth.uid() is null then raise exception 'Unauthorized' using errcode='42501'; end if;
  select e.id into v_event from public.events e join public.event_memberships m on m.event_id=e.id
    where e.slug=p_event_slug and m.user_id=auth.uid() and m.visible;
  if v_event is null then raise exception 'Visible event membership required' using errcode='42501'; end if;
  insert into public.concierge_access(user_id,event_id) values(auth.uid(),v_event)
    on conflict(user_id,event_id) do nothing;
  return public.concierge_access_status(p_event_slug);
end;
$$;
revoke all on function public.concierge_access_status(text) from public,anon;
revoke all on function public.request_concierge_access(text) from public,anon;
grant execute on function public.concierge_access_status(text) to authenticated;
grant execute on function public.request_concierge_access(text) to authenticated;
