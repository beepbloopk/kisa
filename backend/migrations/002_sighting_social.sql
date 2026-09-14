-- Kisa: likes and comments on sightings.
--
-- Run this once in the Supabase SQL Editor.
--
-- Why this exists: the community feed shows sightings, but post_likes and
-- post_comments only reference posts, and a sighting is not a post. Rather
-- than create a shadow post for every report, these mirror the existing
-- post_* tables one to one, including the same policy shape, so the two
-- behave identically.
--
-- Safe to re-run.

create table if not exists public.sighting_likes (
  id          uuid primary key default gen_random_uuid(),
  sighting_id uuid not null references public.sightings(id) on delete cascade,
  -- profiles, not auth.users. PostgREST can only embed across a foreign key
  -- it can see, and auth.users is not in the exposed schema, so pointing
  -- here is what lets the feed pull the commenter's name in one query.
  -- profiles.id already cascades from auth.users, so deletes still work.
  user_id     uuid references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- one like per person per sighting
  unique (sighting_id, user_id)
);

create table if not exists public.sighting_comments (
  id          uuid primary key default gen_random_uuid(),
  sighting_id uuid not null references public.sightings(id) on delete cascade,
  author_id   uuid references public.profiles(id) on delete cascade,
  content     text not null check (char_length(trim(content)) between 1 and 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists sighting_likes_sighting_idx
  on public.sighting_likes (sighting_id);
create index if not exists sighting_comments_sighting_idx
  on public.sighting_comments (sighting_id, created_at);

-- Reuse the existing timestamp trigger so updated_at maintains itself,
-- exactly as it does on every other table.
drop trigger if exists trg_sighting_likes_updated_at on public.sighting_likes;
create trigger trg_sighting_likes_updated_at
  before update on public.sighting_likes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_sighting_comments_updated_at on public.sighting_comments;
create trigger trg_sighting_comments_updated_at
  before update on public.sighting_comments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- Row Level Security
--
-- The browser holds only the publishable key, so these policies are the
-- only thing standing between a visitor and this data. They mirror the
-- post_likes and post_comments policies already in place.
-- ---------------------------------------------------------------
alter table public.sighting_likes    enable row level security;
alter table public.sighting_comments enable row level security;

drop policy if exists "Public can view sighting likes"          on public.sighting_likes;
drop policy if exists "Authenticated users can like sightings"  on public.sighting_likes;
drop policy if exists "Users can remove own sighting likes"     on public.sighting_likes;

create policy "Public can view sighting likes"
  on public.sighting_likes for select using (true);
create policy "Authenticated users can like sightings"
  on public.sighting_likes for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users can remove own sighting likes"
  on public.sighting_likes for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Public can view sighting comments"            on public.sighting_comments;
drop policy if exists "Authenticated users can comment on sightings" on public.sighting_comments;
drop policy if exists "Users can update own sighting comments"       on public.sighting_comments;
drop policy if exists "Users can delete own sighting comments"       on public.sighting_comments;

create policy "Public can view sighting comments"
  on public.sighting_comments for select using (true);
create policy "Authenticated users can comment on sightings"
  on public.sighting_comments for insert to authenticated
  with check (auth.uid() = author_id);
-- Editing and deleting are limited to your own comments. This is what makes
-- the edit and delete controls in the feed safe to show.
create policy "Users can update own sighting comments"
  on public.sighting_comments for update to authenticated
  using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "Users can delete own sighting comments"
  on public.sighting_comments for delete to authenticated
  using (auth.uid() = author_id);

-- ---------------------------------------------------------------
-- Repoint the foreign keys for anyone who ran an earlier version of this
-- file, where they referenced auth.users. Without this the feed cannot
-- embed the commenter's name and fails with PGRST200. Non-destructive.
-- ---------------------------------------------------------------
alter table public.sighting_likes
  drop constraint if exists sighting_likes_user_id_fkey;
alter table public.sighting_likes
  add constraint sighting_likes_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.sighting_comments
  drop constraint if exists sighting_comments_author_id_fkey;
alter table public.sighting_comments
  add constraint sighting_comments_author_id_fkey
  foreign key (author_id) references public.profiles(id) on delete cascade;

-- PostgREST caches the schema. Tell it to reload so the new relationships
-- are visible immediately rather than after the next restart.
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------
-- Also add the two profile fields the account page already collects but
-- has nowhere to store. Without these, Save quietly drops what you typed.
-- ---------------------------------------------------------------
alter table public.profiles add column if not exists bio      text;
alter table public.profiles add column if not exists location text;

alter table public.profiles
  drop constraint if exists profiles_bio_length;
alter table public.profiles
  add constraint profiles_bio_length check (bio is null or char_length(bio) <= 240);

-- To verify:
--   select table_name, column_name from information_schema.columns
--   where table_schema = 'public'
--     and table_name in ('sighting_likes','sighting_comments')
--   order by table_name, ordinal_position;
