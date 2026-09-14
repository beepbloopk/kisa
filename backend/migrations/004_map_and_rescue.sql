-- Kisa: coordinates for the live map, and recording who took a cat in.
--
-- Run this once in the Supabase SQL Editor. Safe to re-run.

-- ---------------------------------------------------------------
-- 1. Coordinates for the map
--
-- sightings.location is a geography column, which PostgREST returns as an
-- EWKB hex blob. Usable, but the browser would have to decode it by hand and
-- it cannot be sorted or filtered by distance. This view exposes plain
-- latitude and longitude alongside the fields the map needs.
--
-- security_invoker = true means the view runs as the caller, so the RLS
-- policies on sightings still apply. Without it the view would quietly
-- bypass them.
-- ---------------------------------------------------------------
alter table public.sightings
  add column if not exists taken_in_by uuid references public.profiles(id) on delete set null;
alter table public.sightings
  add column if not exists taken_in_at timestamptz;

create or replace view public.sightings_map
with (security_invoker = true) as
select
  s.id,
  s.condition,
  s.location_text,
  s.sighted_date,
  s.sighted_time,
  s.created_at,
  s.description,
  s.coat_color,
  s.gender,
  s.age_group,
  s.number_of_cats,
  s.behaviour,
  s.match_status,
  s.reporter_id,
  s.cat_id,
  s.taken_in_by,
  s.taken_in_at,
  st_y(s.location::geometry) as lat,
  st_x(s.location::geometry) as lng
from public.sightings s;

grant select on public.sightings_map to anon, authenticated;

-- ---------------------------------------------------------------
-- 2. "I've taken them in"
--
-- Any signed-in neighbour can mark a cat as taken in, not just whoever
-- reported it: the person who ends up housing the cat is often not the
-- person who first spotted it.
--
-- This is an RPC rather than a plain update because RLS policies apply to
-- whole rows, not columns. A policy permissive enough to let a stranger set
-- taken_in_by would also let them rewrite the description, location and
-- condition. A SECURITY DEFINER function touches only these two columns, so
-- there is nothing else to abuse.
-- ---------------------------------------------------------------
create or replace function public.mark_taken_in(p_sighting_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  already uuid;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  select taken_in_by into already from public.sightings where id = p_sighting_id;
  if not found then
    raise exception 'That report no longer exists';
  end if;
  if already is not null then
    raise exception 'Someone has already taken this cat in';
  end if;

  update public.sightings
     set taken_in_by = uid,
         taken_in_at = now()
   where id = p_sighting_id;

  -- The note the rescuer typed becomes a normal comment, so it appears in
  -- the thread and notifies the reporter through the existing trigger.
  if p_note is not null and length(trim(p_note)) > 0 then
    insert into public.sighting_comments (sighting_id, author_id, content)
    values (p_sighting_id, uid, trim(p_note));
  end if;
end $$;

-- Undo, in case of a mistake. Only the person who claimed it, or the
-- person who reported the sighting, may clear it.
create or replace function public.undo_taken_in(p_sighting_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  claimer uuid;
  reporter uuid;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  select taken_in_by, reporter_id into claimer, reporter
    from public.sightings where id = p_sighting_id;
  if not found then
    raise exception 'That report no longer exists';
  end if;
  if claimer is null then
    return;
  end if;
  if uid <> claimer and uid <> reporter then
    raise exception 'Only the person who took this cat in can undo it';
  end if;

  update public.sightings
     set taken_in_by = null, taken_in_at = null
   where id = p_sighting_id;
end $$;

revoke all on function public.mark_taken_in(uuid, text) from public, anon;
revoke all on function public.undo_taken_in(uuid)        from public, anon;
grant execute on function public.mark_taken_in(uuid, text) to authenticated;
grant execute on function public.undo_taken_in(uuid)       to authenticated;

notify pgrst, 'reload schema';

-- To verify:
--   select id, location_text, lat, lng, taken_in_by from public.sightings_map limit 5;
