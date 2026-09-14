-- Kisa: notifications when someone likes or comments on your report.
--
-- Run this once in the Supabase SQL Editor. Safe to re-run.
--
-- Why triggers rather than the browser inserting these: a notification row
-- belongs to the person being notified, not the person causing it. If the
-- client created them, the insert policy would have to allow writing rows
-- owned by somebody else, which is the same as letting anyone send anyone
-- notifications. Triggers run inside the database as the definer, so the
-- client never needs that permission and cannot forge a notification.

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  -- who receives it
  user_id     uuid not null references public.profiles(id) on delete cascade,
  -- who caused it
  actor_id    uuid references public.profiles(id) on delete set null,
  type        text not null check (type in ('like', 'comment')),
  sighting_id uuid references public.sightings(id) on delete cascade,
  comment_id  uuid references public.sighting_comments(id) on delete cascade,
  read_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (user_id) where read_at is null;

drop trigger if exists trg_notifications_updated_at on public.notifications;
create trigger trg_notifications_updated_at
  before update on public.notifications
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- Row Level Security
--
-- You may read and mark your own notifications. Nobody can insert one
-- directly: only the triggers below create them.
-- ---------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications"   on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;
drop policy if exists "Users can delete own notifications" on public.notifications;

create policy "Users can view own notifications"
  on public.notifications for select to authenticated
  using (auth.uid() = user_id);
create policy "Users can update own notifications"
  on public.notifications for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own notifications"
  on public.notifications for delete to authenticated
  using (auth.uid() = user_id);
-- Deliberately no insert policy. The triggers are SECURITY DEFINER and
-- bypass RLS; a client calling insert directly is refused.

-- ---------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------
create or replace function public.notify_sighting_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  select reporter_id into owner from public.sightings where id = new.sighting_id;
  -- Nothing to do if the report has no owner, or you liked your own.
  if owner is null or owner = new.user_id then
    return new;
  end if;
  insert into public.notifications (user_id, actor_id, type, sighting_id)
  values (owner, new.user_id, 'like', new.sighting_id);
  return new;
end $$;

create or replace function public.notify_sighting_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  select reporter_id into owner from public.sightings where id = new.sighting_id;
  if owner is null or owner = new.author_id then
    return new;
  end if;
  insert into public.notifications (user_id, actor_id, type, sighting_id, comment_id)
  values (owner, new.author_id, 'comment', new.sighting_id, new.id);
  return new;
end $$;

drop trigger if exists trg_notify_sighting_like on public.sighting_likes;
create trigger trg_notify_sighting_like
  after insert on public.sighting_likes
  for each row execute function public.notify_sighting_like();

drop trigger if exists trg_notify_sighting_comment on public.sighting_comments;
create trigger trg_notify_sighting_comment
  after insert on public.sighting_comments
  for each row execute function public.notify_sighting_comment();

-- Unliking removes the notification it created, so the bell does not keep
-- pointing at something that no longer happened.
create or replace function public.unnotify_sighting_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
  where type = 'like'
    and sighting_id = old.sighting_id
    and actor_id = old.user_id;
  return old;
end $$;

drop trigger if exists trg_unnotify_sighting_like on public.sighting_likes;
create trigger trg_unnotify_sighting_like
  after delete on public.sighting_likes
  for each row execute function public.unnotify_sighting_like();

notify pgrst, 'reload schema';

-- To verify, as a signed-in user:
--   select type, read_at, created_at from public.notifications
--   order by created_at desc limit 10;
