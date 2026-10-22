-- Narrow, revocable MCP credentials. Never give a Bot a Supabase session token.
create table public.bot_access (
  token_hash text primary key,
  event_id uuid not null,
  user_id uuid not null,
  expires_at timestamptz not null,
  foreign key(event_id,user_id) references public.event_memberships(event_id,user_id) on delete cascade,
  unique(event_id,user_id)
);
alter table public.bot_access enable row level security;
revoke all on public.bot_access from public,anon,authenticated;

create function public.create_bot_access(p_event_slug text) returns jsonb
language plpgsql security definer set search_path=public,extensions as $$
declare v_event uuid; v_token text; v_expires timestamptz := now()+interval '1 hour';
begin
  select e.id into v_event from public.events e join public.event_memberships m on m.event_id=e.id
    where e.slug=p_event_slug and m.user_id=auth.uid() and m.visible;
  if v_event is null then raise exception 'Become visible at this event first' using errcode='42501'; end if;
  v_token := encode(extensions.gen_random_bytes(32),'hex');
  insert into public.bot_access(token_hash,event_id,user_id,expires_at)
    values(encode(extensions.digest(v_token,'sha256'),'hex'),v_event,auth.uid(),v_expires)
    on conflict(event_id,user_id) do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at;
  return jsonb_build_object('token',v_token,'expiresAt',v_expires);
end; $$;

create function public.revoke_bot_access(p_event_slug text) returns void
language sql security definer set search_path=public as $$
  delete from public.bot_access b using public.events e
    where b.event_id=e.id and e.slug=p_event_slug and b.user_id=auth.uid();
$$;

create function public.read_bot_context(p_token text) returns jsonb
language plpgsql stable security definer set search_path=public,extensions as $$
declare v_access public.bot_access; v_people jsonb; v_slug text;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid or expired BumpIn connection' using errcode='42501';
  end if;
  select b.* into v_access from public.bot_access b join public.event_memberships m
    on m.event_id=b.event_id and m.user_id=b.user_id
    where b.token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and b.expires_at>now() and m.visible;
  if v_access.token_hash is null then
    raise exception 'Invalid or expired BumpIn connection' using errcode='42501';
  end if;
  select slug into v_slug from public.events where id=v_access.event_id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'membershipId',encode(extensions.digest(m.user_id::text,'sha256'),'hex'),
    'displayName',p.display_name,'building',p.building,'canHelpWith',p.can_help_with,
    'lookingFor',p.looking_for,'isSelf',m.user_id=v_access.user_id
  ) order by p.display_name,m.user_id),'[]'::jsonb) into v_people
    from public.event_memberships m join public.profiles p on p.id=m.user_id
    where m.event_id=v_access.event_id and m.visible;
  return jsonb_build_object('eventSlug',v_slug,'attendees',v_people);
end; $$;

create function public.invalidate_bot_access() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if not new.visible then delete from public.bot_access where event_id=new.event_id and user_id=new.user_id; end if;
  return new;
end; $$;
create trigger bot_access_visibility after update of visible on public.event_memberships
  for each row execute function public.invalidate_bot_access();

revoke all on function public.create_bot_access(text),public.revoke_bot_access(text),public.read_bot_context(text),public.invalidate_bot_access() from public,anon,authenticated;
grant execute on function public.create_bot_access(text),public.revoke_bot_access(text) to authenticated;
grant execute on function public.read_bot_context(text) to anon;
