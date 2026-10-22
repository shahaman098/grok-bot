-- BumpIn initial schema
create extension if not exists "pgcrypto";

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  venue_name text not null,
  venue_lat double precision not null,
  venue_lng double precision not null,
  luma_url text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  linkedin_url text,
  avatar_seed text not null,
  building text,
  looking_for text,
  created_at timestamptz not null default now()
);

create table if not exists public.event_memberships (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  visible boolean not null default false,
  location_consent boolean not null default false,
  display_lat double precision,
  display_lng double precision,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.events enable row level security;
alter table public.profiles enable row level security;
alter table public.event_memberships enable row level security;

create policy "events_select_authenticated"
  on public.events for select
  to authenticated
  using (true);

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "memberships_select_own"
  on public.event_memberships for select
  to authenticated
  using (auth.uid() = user_id);

create policy "memberships_insert_own"
  on public.event_memberships for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "memberships_update_own"
  on public.event_memberships for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "memberships_delete_own"
  on public.event_memberships for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.list_event_attendees(p_event_slug text)
returns table (
  membership_id text,
  display_name text,
  linkedin_url text,
  avatar_seed text,
  building text,
  looking_for text,
  display_lat double precision,
  display_lng double precision,
  is_self boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    encode(extensions.digest(em.user_id::text, 'sha256'), 'hex') as membership_id,
    p.display_name,
    p.linkedin_url,
    p.avatar_seed,
    p.building,
    p.looking_for,
    em.display_lat,
    em.display_lng,
    (em.user_id = auth.uid()) as is_self
  from public.events e
  inner join public.event_memberships em on em.event_id = e.id
  inner join public.profiles p on p.id = em.user_id
  where e.slug = p_event_slug
    and auth.uid() is not null
    and exists (
      select 1
      from public.event_memberships mine
      where mine.event_id = e.id
        and mine.user_id = auth.uid()
    )
    and (
      em.visible = true
      or em.user_id = auth.uid()
    );
$$;

revoke all on function public.list_event_attendees(text) from public;
grant execute on function public.list_event_attendees(text) to authenticated;

insert into public.events (
  slug, name, venue_name, venue_lat, venue_lng, luma_url, starts_at, ends_at
) values (
  'grok-bot-london',
  'Grok Bot Community Engineering London Hackathon',
  'Expedite London HQ — 7 Lyric Square, London W6 0DA, UK',
  51.49329,
  -0.22571,
  'https://luma.com/eveur09a',
  '2026-10-22T17:00:00.000Z',
  '2026-10-22T22:00:00.000Z'
)
on conflict (slug) do update set
  name = excluded.name,
  venue_name = excluded.venue_name,
  venue_lat = excluded.venue_lat,
  venue_lng = excluded.venue_lng,
  luma_url = excluded.luma_url,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at;

alter table public.event_memberships replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.event_memberships;
exception
  when duplicate_object then null;
end $$;
