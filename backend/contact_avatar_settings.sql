-- Kisa: the contact form, profile photos, account settings, and profile
-- privacy.
--
-- Run this once in the Supabase SQL Editor. Safe to re-run.
--
-- Four things in the app currently look like they work and do not:
--   1. The contact form shows a thank-you screen and stores nothing.
--   2. The profile photo is kept only in the browser, so it vanishes on
--      another device and in a private window.
--   3. Notification and privacy settings have no columns to live in.
--   4. The privacy settings promise to hide your profile and location, but
--      the profiles table is readable by anyone holding the public key.

-- ---------------------------------------------------------------
-- 1. Contact messages
--
-- Anyone may send one, signed in or not. Nobody can read them back through
-- the API: there is deliberately no select policy. Read them in the
-- Supabase Table Editor.
-- ---------------------------------------------------------------
create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  name       text not null check (char_length(trim(name)) between 1 and 100),
  email      text not null check (char_length(email) between 3 and 254),
  msg_type   text not null check (msg_type in ('inquiry', 'report', 'feedback', 'partnership')),
  subject    text check (subject is null or char_length(subject) <= 200),
  message    text not null check (char_length(trim(message)) between 1 and 5000),
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

drop policy if exists "Anyone can send a contact message" on public.contact_messages;
create policy "Anyone can send a contact message"
  on public.contact_messages for insert to anon, authenticated
  -- A signed-in sender may attach their own id and nobody else's.
  -- Logged-out senders must leave it empty.
  with check (user_id is null or user_id = auth.uid());

-- ---------------------------------------------------------------
-- 2. Profile photos in the private avatars bucket
--
-- Each file lives at "<user id>/avatar.<ext>", so the first folder in the
-- path names the owner. These policies let you read and write inside your
-- own folder and nowhere else.
-- ---------------------------------------------------------------
drop policy if exists "Kisa avatars: owner can read"   on storage.objects;
drop policy if exists "Kisa avatars: owner can upload" on storage.objects;
drop policy if exists "Kisa avatars: owner can update" on storage.objects;
drop policy if exists "Kisa avatars: owner can delete" on storage.objects;

create policy "Kisa avatars: owner can read"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Kisa avatars: owner can upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Kisa avatars: owner can update"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Kisa avatars: owner can delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------
-- 3. Notification and privacy settings
--
-- Defaults match what the settings page shows ticked for a new account.
-- ---------------------------------------------------------------
alter table public.profiles add column if not exists notif_nearby  boolean not null default true;
alter table public.profiles add column if not exists notif_replies boolean not null default true;
alter table public.profiles add column if not exists notif_rescue  boolean not null default false;
alter table public.profiles add column if not exists notif_news    boolean not null default false;
alter table public.profiles add column if not exists show_location boolean not null default true;
alter table public.profiles add column if not exists visibility    text    not null default 'public';

alter table public.profiles drop constraint if exists profiles_visibility_check;
alter table public.profiles
  add constraint profiles_visibility_check
  check (visibility in ('public', 'community', 'private'));

-- ---------------------------------------------------------------
-- 4. Who can read a profile
--
-- Make the database keep the promises the privacy settings make.
-- ---------------------------------------------------------------

-- a. Other people may only ever read a profile's public columns. Phone,
--    bio, location and settings cannot be selected directly by anyone,
--    so they never leave the database for someone else's browser.
revoke select on public.profiles from anon, authenticated;
grant select (id, display_name, avatar_url, created_at, updated_at)
  on public.profiles to anon, authenticated;

-- b. Your own full profile, every column, through a function rather than a
--    select. It takes no arguments and only ever returns the caller's row.
create or replace function public.get_my_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid();
$$;

revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

-- c. Whether a profile row is visible at all, per its visibility setting.
--    SECURITY DEFINER so the check can read the visibility column, which
--    step (a) no longer lets callers read themselves.
create or replace function public.can_view_profile(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() = p_id then true
    else coalesce((
      select p.visibility = 'public'
          or (p.visibility = 'community' and auth.uid() is not null)
      from public.profiles p
      where p.id = p_id
    ), false)
  end;
$$;

grant execute on function public.can_view_profile(uuid) to anon, authenticated;

-- A private profile shows as "A neighbour" on its reports; the reports
-- themselves stay visible, which is what the settings page says.
drop policy if exists "Public can view profiles" on public.profiles;
drop policy if exists "Profiles visible per privacy setting" on public.profiles;
create policy "Profiles visible per privacy setting"
  on public.profiles for select
  using (public.can_view_profile(id));

notify pgrst, 'reload schema';

-- To verify, while signed out, this should fail with permission denied:
--   select phone from public.profiles limit 1;
