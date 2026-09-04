-- Kisa — Supabase schema
-- Run this in your Supabase project: SQL Editor → New query → paste → Run.
-- Safe to re-run; every statement is idempotent.
--
-- Column names mirror the field names the existing forms already submit
-- (report.html, profile.html, contact.html), so the client can post form
-- data with minimal reshaping.

-- ─────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────
do $$ begin
  create type cat_status as enum ('healthy', 'needs-care', 'injured', 'sos');
exception when duplicate_object then null; end $$;

do $$ begin
  create type cat_gender as enum ('male', 'female', 'unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type cat_age as enum ('kitten', 'young', 'adult', 'senior');
exception when duplicate_object then null; end $$;

do $$ begin
  create type profile_visibility as enum ('public', 'community', 'private');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────
-- profiles — one row per auth user, created automatically on signup
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  bio           text check (char_length(bio) <= 240),
  location      text,
  phone         text,
  avatar_url    text,
  -- settings panel
  show_location boolean not null default true,
  visibility    profile_visibility not null default 'community',
  notif_nearby  boolean not null default true,
  notif_rescue  boolean not null default true,
  notif_replies boolean not null default true,
  notif_news    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- sightings — one row per submitted report
-- ─────────────────────────────────────────────────────────────
create table if not exists public.sightings (
  id             uuid primary key default gen_random_uuid(),
  reporter_id    uuid not null references auth.users(id) on delete cascade,
  photo_url      text,
  sighting_at    timestamptz not null,
  location_text  text not null,
  lat            double precision,
  lng            double precision,
  status         cat_status not null,
  cat_name       text,
  cat_coat       text,
  cat_gender     cat_gender not null default 'unknown',
  cat_age        cat_age,
  cat_count      integer not null default 1 check (cat_count between 1 and 50),
  cat_behaviour  text,
  notes          text,
  contact_pref   text,
  -- set when someone marks "I've taken them in"
  taken_in_by    uuid references auth.users(id) on delete set null,
  taken_in_at    timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists sightings_created_at_idx on public.sightings (created_at desc);
create index if not exists sightings_status_idx     on public.sightings (status);
create index if not exists sightings_reporter_idx   on public.sightings (reporter_id);

-- ─────────────────────────────────────────────────────────────
-- likes — composite PK means a user can only like a sighting once
-- ─────────────────────────────────────────────────────────────
create table if not exists public.sighting_likes (
  sighting_id uuid not null references public.sightings(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (sighting_id, user_id)
);

-- ─────────────────────────────────────────────────────────────
-- comments
-- ─────────────────────────────────────────────────────────────
create table if not exists public.sighting_comments (
  id          uuid primary key default gen_random_uuid(),
  sighting_id uuid not null references public.sightings(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 1000),
  created_at  timestamptz not null default now()
);

create index if not exists comments_sighting_idx on public.sighting_comments (sighting_id, created_at);

-- ─────────────────────────────────────────────────────────────
-- contact_messages — the contact form. user_id is null for logged-out senders.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  name       text not null,
  email      text not null,
  msg_type   text,
  subject    text,
  message    text not null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Create a profile row automatically whenever someone signs up.
-- Without this the app would have an auth user with no profile.
-- ─────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
--
-- Everything below assumes the app talks to Supabase with the *anon* key
-- from the browser, so these policies are the only thing standing between
-- a visitor and the data. Read carefully before changing.
-- ─────────────────────────────────────────────────────────────
alter table public.profiles          enable row level security;
alter table public.sightings         enable row level security;
alter table public.sighting_likes    enable row level security;
alter table public.sighting_comments enable row level security;
alter table public.contact_messages  enable row level security;

-- profiles: anyone can read (needed to show names on the feed);
-- you may only write your own.
drop policy if exists profiles_read   on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;

create policy profiles_read   on public.profiles for select using (true);
create policy profiles_insert on public.profiles for insert with check (auth.uid() = id);
create policy profiles_update on public.profiles for update using (auth.uid() = id)
                                                          with check (auth.uid() = id);

-- sightings: public to read — the map and feed are the point of the app.
-- Only signed-in users may report, and only your own rows may be edited.
-- The "taken in" update is allowed for any signed-in user, so a neighbour
-- can mark a cat safe on someone else's report.
drop policy if exists sightings_read      on public.sightings;
drop policy if exists sightings_insert    on public.sightings;
drop policy if exists sightings_update    on public.sightings;
drop policy if exists sightings_taken_in  on public.sightings;
drop policy if exists sightings_delete    on public.sightings;

create policy sightings_read   on public.sightings for select using (true);
create policy sightings_insert on public.sightings for insert
  with check (auth.uid() = reporter_id);
create policy sightings_update on public.sightings for update
  using (auth.uid() = reporter_id) with check (auth.uid() = reporter_id);
create policy sightings_taken_in on public.sightings for update
  using (auth.uid() is not null) with check (auth.uid() is not null);
create policy sightings_delete on public.sightings for delete
  using (auth.uid() = reporter_id);

-- likes: readable by all, but you may only add or remove your own.
drop policy if exists likes_read   on public.sighting_likes;
drop policy if exists likes_insert on public.sighting_likes;
drop policy if exists likes_delete on public.sighting_likes;

create policy likes_read   on public.sighting_likes for select using (true);
create policy likes_insert on public.sighting_likes for insert with check (auth.uid() = user_id);
create policy likes_delete on public.sighting_likes for delete using (auth.uid() = user_id);

-- comments: readable by all; you may only post as yourself and only
-- edit or delete your own.
drop policy if exists comments_read   on public.sighting_comments;
drop policy if exists comments_insert on public.sighting_comments;
drop policy if exists comments_update on public.sighting_comments;
drop policy if exists comments_delete on public.sighting_comments;

create policy comments_read   on public.sighting_comments for select using (true);
create policy comments_insert on public.sighting_comments for insert with check (auth.uid() = user_id);
create policy comments_update on public.sighting_comments for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy comments_delete on public.sighting_comments for delete using (auth.uid() = user_id);

-- contact_messages: anyone (signed in or not) may send one. Nobody may
-- read them back through the API — you read them in the Supabase table
-- editor. There is deliberately no select policy.
drop policy if exists contact_insert on public.contact_messages;
create policy contact_insert on public.contact_messages for insert with check (true);

-- ─────────────────────────────────────────────────────────────
-- Storage: cat photos and profile avatars
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('sightings', 'sightings', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists sighting_photos_read   on storage.objects;
drop policy if exists sighting_photos_write  on storage.objects;
drop policy if exists avatars_read           on storage.objects;
drop policy if exists avatars_write          on storage.objects;
drop policy if exists avatars_update         on storage.objects;
drop policy if exists avatars_delete         on storage.objects;

create policy sighting_photos_read on storage.objects for select
  using (bucket_id = 'sightings');
create policy sighting_photos_write on storage.objects for insert
  with check (bucket_id = 'sightings' and auth.uid() is not null);

-- Avatars are stored as "<user-id>/<filename>", so the folder name is the
-- owner. That is what lets a user overwrite their own avatar and no one else's.
create policy avatars_read on storage.objects for select
  using (bucket_id = 'avatars');
create policy avatars_write on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy avatars_update on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy avatars_delete on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- ─────────────────────────────────────────────────────────────
-- Feed view: sightings joined with author + like/comment counts,
-- so the community page is one request instead of N+1.
-- ─────────────────────────────────────────────────────────────
create or replace view public.sightings_feed
with (security_invoker = true) as
select
  s.*,
  p.full_name  as reporter_name,
  p.avatar_url as reporter_avatar,
  (select count(*) from public.sighting_likes    l where l.sighting_id = s.id) as like_count,
  (select count(*) from public.sighting_comments c where c.sighting_id = s.id) as comment_count
from public.sightings s
left join public.profiles p on p.id = s.reporter_id;
