-- Atomic quotas for paid AI endpoints. Client roles cannot inspect or edit counters.
create table public.concierge_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  kind text not null check(kind in ('voice','search')),
  bucket timestamptz not null,
  used integer not null check(used > 0),
  primary key(user_id,event_id,kind)
);
alter table public.concierge_usage enable row level security;
revoke all on public.concierge_usage from public,anon,authenticated;

create function public.claim_concierge_quota(p_event_slug text,p_kind text)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_event uuid; v_used integer; v_limit integer; v_bucket timestamptz := date_trunc('minute',clock_timestamp());
begin
  if auth.uid() is null then raise exception 'Unauthorized' using errcode='42501'; end if;
  if p_kind not in ('voice','search') or p_kind is null then raise exception 'Invalid quota type' using errcode='22023'; end if;
  select e.id into v_event from public.events e join public.event_memberships m on m.event_id=e.id
    where e.slug=p_event_slug and m.user_id=auth.uid() and m.visible;
  if v_event is null then raise exception 'Visible event membership required' using errcode='42501'; end if;
  v_limit := case when p_kind='voice' then 3 else 12 end;
  insert into public.concierge_usage(user_id,event_id,kind,bucket,used) values(auth.uid(),v_event,p_kind,v_bucket,1)
  on conflict(user_id,event_id,kind) do update set
    used=case when concierge_usage.bucket=v_bucket then concierge_usage.used+1 else 1 end,
    bucket=v_bucket
  where concierge_usage.bucket<>v_bucket or concierge_usage.used<v_limit
  returning used into v_used;
  return v_used is not null;
end;
$$;
revoke all on function public.claim_concierge_quota(text,text) from public;
grant execute on function public.claim_concierge_quota(text,text) to authenticated;
