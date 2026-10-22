-- Profiles remain backwards compatible. Private introductions publish only by mutual consent.
alter table public.profiles add column if not exists can_help_with text check (length(can_help_with) <= 200);

-- PostgreSQL cannot change a table-returning function's shape with CREATE OR REPLACE.
drop function public.list_event_attendees(text);
create function public.list_event_attendees(p_event_slug text)
returns table (membership_id text, display_name text, linkedin_url text, avatar_seed text, building text, can_help_with text, looking_for text, display_lat double precision, display_lng double precision, is_self boolean)
language sql stable security definer set search_path = public, extensions as $$
  select encode(extensions.digest(em.user_id::text, 'sha256'), 'hex'), p.display_name, p.linkedin_url, p.avatar_seed, p.building, p.can_help_with, p.looking_for, em.display_lat, em.display_lng, em.user_id = auth.uid()
  from public.events e join public.event_memberships em on em.event_id=e.id join public.profiles p on p.id=em.user_id
  where e.slug=p_event_slug and auth.uid() is not null
    and exists(select 1 from public.event_memberships mine where mine.event_id=e.id and mine.user_id=auth.uid())
    and (em.visible or em.user_id=auth.uid());
$$;
revoke all on function public.list_event_attendees(text) from public;
grant execute on function public.list_event_attendees(text) to authenticated;

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  sender_id uuid not null,
  recipient_id uuid not null,
  status text not null default 'pending' check (status in ('pending','accepted','declined','withdrawn')),
  snapshot jsonb not null,
  revision integer not null default 1,
  sender_stage boolean not null default false,
  recipient_stage boolean not null default false,
  sender_joke text check (sender_joke in ('tabs','final','coffee')),
  recipient_joke text check (recipient_joke in ('tabs','final','coffee')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(sender_id <> recipient_id),
  foreign key(event_id,sender_id) references public.event_memberships(event_id,user_id) on delete cascade,
  foreign key(event_id,recipient_id) references public.event_memberships(event_id,user_id) on delete cascade
);
create unique index connections_event_pair on public.connections(event_id, least(sender_id,recipient_id), greatest(sender_id,recipient_id));
alter table public.connections enable row level security;
-- All reads/writes use narrow RPCs. Raw auth IDs are never granted to client roles.
revoke all on public.connections from public, anon, authenticated;
create policy connections_participants on public.connections for select to authenticated using (auth.uid() in (sender_id,recipient_id));

create function public.connection_joke(p_id text) returns text language sql immutable set search_path=public as $$
  select case p_id
    when 'tabs' then 'My superpower? Turning one good idea into 47 open tabs.'
    when 'final' then 'My project is called final_final. This is not its final form.'
    when 'coffee' then 'I turn coffee into ambitious project timelines.'
    else null end;
$$;
create function public.connection_snapshot(p_c public.connections) returns jsonb language sql stable set search_path=public as $$
  select p_c.snapshot || jsonb_build_object('jokes',jsonb_build_array(public.connection_joke(p_c.sender_joke),public.connection_joke(p_c.recipient_joke)));
$$;
create function public.connection_view(p_c public.connections) returns jsonb language sql stable set search_path=public as $$
  select jsonb_build_object('id',p_c.id,'status',p_c.status,'role',case when auth.uid()=p_c.sender_id then 'sender' else 'recipient' end,
    'revision',p_c.revision,'ownStageApproved',case when auth.uid()=p_c.sender_id then p_c.sender_stage else p_c.recipient_stage end,
    'otherStageApproved',case when auth.uid()=p_c.sender_id then p_c.recipient_stage else p_c.sender_stage end,
    'ownJokeId',case when auth.uid()=p_c.sender_id then p_c.sender_joke else p_c.recipient_joke end,'snapshot',public.connection_snapshot(p_c));
$$;
create function public.list_connections(p_event_slug text) returns setof jsonb
language sql stable security definer set search_path=public as $$
  select public.connection_view(c) from public.connections c join public.events e on e.id=c.event_id
  where e.slug=p_event_slug and auth.uid() in (c.sender_id,c.recipient_id) order by c.created_at desc;
$$;
create function public.create_connection(p_event_slug text,p_target text,p_content jsonb) returns jsonb
language plpgsql security definer set search_path=public,extensions as $$
declare
  v_event uuid; v_target uuid; v_self public.profiles; v_other public.profiles; v_c public.connections; v_people jsonb; v_evidence jsonb; v_term jsonb;
begin
  if auth.uid() is null then raise exception 'Unauthorized' using errcode='42501'; end if;
  select e.id into v_event from public.events e join public.event_memberships m on m.event_id=e.id
    where e.slug=p_event_slug and m.user_id=auth.uid() and m.visible for share of m;
  if v_event is null then raise exception 'Become visible at this event first' using errcode='42501'; end if;
  select m.user_id into v_target from public.event_memberships m where m.event_id=v_event and m.visible
    and encode(extensions.digest(m.user_id::text,'sha256'),'hex')=p_target for share;
  if v_target is null or v_target=auth.uid() then raise exception 'Attendee unavailable' using errcode='22023'; end if;
  if p_content is null or coalesce(jsonb_typeof(p_content->'evidence'),'null') <> 'array' then raise exception 'Invalid evidence' using errcode='22023'; end if;
  if jsonb_array_length(p_content->'evidence')=0
    or not coalesce(p_content->>'category'=any(array['mutual','one-way','shared-interest','search']),false)
    or coalesce(length(p_content->>'conversationStarter'),0) not between 1 and 2000
    or coalesce(length(p_content->>'suggestedTask'),0) not between 1 and 2000
    or octet_length(p_content::text)>16000 then raise exception 'Invalid match content' using errcode='22023'; end if;
  -- Serialize against profile updates that reset publication consent.
  perform 1 from public.profiles where id in (auth.uid(),v_target) order by id for share;
  select * into strict v_self from public.profiles where id=auth.uid();
  select * into strict v_other from public.profiles where id=v_target;
  if jsonb_array_length(p_content->'evidence')>3 then raise exception 'Too much evidence' using errcode='22023'; end if;
  for v_evidence in select value from jsonb_array_elements(p_content->'evidence') loop
    if coalesce(jsonb_typeof(v_evidence),'null')<>'object'
      or coalesce(jsonb_typeof(v_evidence->'terms'),'null')<>'array'
      or coalesce(jsonb_typeof(v_evidence->'yourExcerpt'),'null')<>'string'
      or coalesce(jsonb_typeof(v_evidence->'theirExcerpt'),'null')<>'string' then
      raise exception 'Invalid evidence shape' using errcode='22023';
    end if;
    if jsonb_array_length(v_evidence->'terms') not between 1 and 50 then raise exception 'Invalid evidence terms' using errcode='22023'; end if;
    for v_term in select value from jsonb_array_elements(v_evidence->'terms') loop
      if jsonb_typeof(v_term)<>'string' or length(v_term#>>'{}') not between 1 and 60 then raise exception 'Invalid evidence term' using errcode='22023'; end if;
    end loop;
    if not coalesce(case v_evidence->>'direction'
      when 'they-help-you' then v_evidence->>'yourExcerpt'=v_self.looking_for and v_evidence->>'theirExcerpt'=v_other.can_help_with
      when 'you-help-them' then v_evidence->>'yourExcerpt'=v_self.can_help_with and v_evidence->>'theirExcerpt'=v_other.looking_for
      when 'shared-interest' then v_evidence->>'yourExcerpt'=v_self.building and v_evidence->>'theirExcerpt'=v_other.building
      else false end,false) then raise exception 'Profile evidence changed; refresh recommendations' using errcode='40001'; end if;
  end loop;
  v_people:=jsonb_build_array(
    jsonb_build_object('displayName',v_self.display_name,'avatarSeed',v_self.avatar_seed,'building',v_self.building,'canHelpWith',v_self.can_help_with,'lookingFor',v_self.looking_for),
    jsonb_build_object('displayName',v_other.display_name,'avatarSeed',v_other.avatar_seed,'building',v_other.building,'canHelpWith',v_other.can_help_with,'lookingFor',v_other.looking_for));
  insert into public.connections(event_id,sender_id,recipient_id,snapshot)
    values(v_event,auth.uid(),v_target,jsonb_build_object('people',v_people,'category',p_content->>'category','evidence',p_content->'evidence',
      'conversationStarter',p_content->>'conversationStarter','suggestedTask',p_content->>'suggestedTask'))
    on conflict do nothing returning * into v_c;
  if v_c.id is null then select * into v_c from public.connections where event_id=v_event
    and least(sender_id,recipient_id)=least(auth.uid(),v_target) and greatest(sender_id,recipient_id)=greatest(auth.uid(),v_target); end if;
  return public.connection_view(v_c);
end;
$$;
create function public.update_connection(p_id uuid,p_action text,p_joke text default null,p_revision integer default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_c public.connections; v_sender boolean;
begin
  -- Lock memberships before the connection, matching hide/leave lock order.
  perform 1 from public.event_memberships m join public.connections c on m.event_id=c.event_id and m.user_id in (c.sender_id,c.recipient_id)
    where c.id=p_id and auth.uid() in(c.sender_id,c.recipient_id) order by m.user_id for share of m;
  select * into v_c from public.connections where id=p_id and auth.uid() in(sender_id,recipient_id) for update;
  if v_c.id is null then raise exception 'Connection unavailable' using errcode='42501'; end if;
  v_sender:=auth.uid()=v_c.sender_id;
  if not exists(select 1 from public.event_memberships where event_id=v_c.event_id and user_id=v_c.sender_id and visible)
    or not exists(select 1 from public.event_memberships where event_id=v_c.event_id and user_id=v_c.recipient_id and visible)
    then raise exception 'Attendee unavailable' using errcode='42501'; end if;
  if p_action in ('accept','decline') then
    if v_sender or v_c.status<>'pending' then raise exception 'Only the recipient can respond to a pending request' using errcode='42501'; end if;
    v_c.status:=case when p_action='accept' then 'accepted' else 'declined' end;
  elsif p_action='withdraw' then
    if not v_sender or v_c.status not in ('pending','accepted') then raise exception 'Only the sender can withdraw an active request' using errcode='42501'; end if;
    v_c.status:='withdrawn'; v_c.sender_stage:=false; v_c.recipient_stage:=false;
  elsif p_action in ('chooseJoke','approveStage','revokeStage') then
    if v_c.status<>'accepted' then raise exception 'Accept the introduction first' using errcode='22023'; end if;
    if p_action='chooseJoke' then
      if p_joke is not null and p_joke not in ('tabs','final','coffee') then raise exception 'Invalid joke' using errcode='22023'; end if;
      if v_sender then v_c.sender_joke:=p_joke; else v_c.recipient_joke:=p_joke; end if;
      v_c.sender_stage:=false; v_c.recipient_stage:=false; v_c.revision:=v_c.revision+1;
    elsif p_action='approveStage' then
      if p_revision is null or p_revision<>v_c.revision then raise exception 'Preview changed; review it again' using errcode='40001'; end if;
      if v_sender then v_c.sender_stage:=true; else v_c.recipient_stage:=true; end if;
    else
      if v_sender then v_c.sender_stage:=false; else v_c.recipient_stage:=false; end if;
    end if;
  else raise exception 'Invalid action' using errcode='22023'; end if;
  update public.connections set status=v_c.status,sender_stage=v_c.sender_stage,recipient_stage=v_c.recipient_stage,
    sender_joke=v_c.sender_joke,recipient_joke=v_c.recipient_joke,revision=v_c.revision,updated_at=now() where id=p_id returning * into v_c;
  return public.connection_view(v_c);
end;
$$;
create function public.stage_connection(p_event_slug text,p_id uuid) returns jsonb
language sql stable security definer set search_path=public as $$
  select public.connection_snapshot(c) from public.connections c join public.events e on e.id=c.event_id
  where c.id=p_id and e.slug=p_event_slug and c.status='accepted' and c.sender_stage and c.recipient_stage
    and exists(select 1 from public.event_memberships m where m.event_id=c.event_id and m.user_id=c.sender_id and m.visible)
    and exists(select 1 from public.event_memberships m where m.event_id=c.event_id and m.user_id=c.recipient_id and m.visible);
$$;
create function public.invalidate_connection_visibility() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not new.visible then
    update public.connections set status='withdrawn',sender_stage=false,recipient_stage=false,revision=revision+1,updated_at=now()
    where event_id=new.event_id and new.user_id in(sender_id,recipient_id) and status in('pending','accepted');
  end if;
  return new;
end;
$$;
create trigger connection_visibility after update of visible on public.event_memberships for each row execute function public.invalidate_connection_visibility();
create function public.invalidate_connection_profile() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if row(new.display_name,new.avatar_seed,new.building,new.can_help_with,new.looking_for) is distinct from row(old.display_name,old.avatar_seed,old.building,old.can_help_with,old.looking_for) then
    update public.connections set sender_stage=false,recipient_stage=false,revision=revision+1,updated_at=now()
    where new.id in(sender_id,recipient_id) and status in('pending','accepted');
  end if;
  return new;
end;
$$;
create trigger connection_profile after update on public.profiles for each row execute function public.invalidate_connection_profile();

revoke all on function public.connection_joke(text),public.connection_snapshot(public.connections),public.connection_view(public.connections),public.invalidate_connection_visibility(),public.invalidate_connection_profile() from public,anon,authenticated;
revoke all on function public.list_connections(text),public.create_connection(text,text,jsonb),public.update_connection(uuid,text,text,integer),public.stage_connection(text,uuid) from public,anon,authenticated;
grant execute on function public.list_connections(text),public.create_connection(text,text,jsonb),public.update_connection(uuid,text,text,integer) to authenticated;
grant execute on function public.stage_connection(text,uuid) to anon,authenticated;
