-- All writes, including direct authenticated PostgREST writes, use venue offsets.
-- Discard old client GPS and keep precise positions out of the attendee RPC.
create or replace function public.anchor_membership_position()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  venue public.events%rowtype;
  seed bigint;
  angle double precision;
  radius_m double precision;
begin
  new.location_consent := false;
  if not new.visible then
    new.display_lat := null;
    new.display_lng := null;
    return new;
  end if;
  select * into strict venue from public.events where id = new.event_id;
  seed := ('x' || substr(md5(new.user_id::text), 1, 8))::bit(32)::bigint;
  angle := (seed % 360) * pi() / 180;
  radius_m := 25 + seed % 45;
  new.display_lat := venue.venue_lat + radius_m / 111320 * cos(angle);
  new.display_lng := venue.venue_lng + radius_m / (111320 * cos(venue.venue_lat * pi() / 180)) * sin(angle);
  return new;
end;
$$;

create trigger membership_venue_position
before insert or update on public.event_memberships
for each row execute function public.anchor_membership_position();

-- Fire the trigger for existing rows to remove previously stored client GPS.
update public.event_memberships set location_consent = false;
