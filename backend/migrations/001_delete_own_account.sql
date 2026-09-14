-- Kisa: let a signed-in user delete their own account.
--
-- Run this once in the Supabase SQL Editor.
-- Until it exists, the Delete Account button in profile.html fails with a
-- clear message rather than pretending it worked.
--
-- Why a function is needed: the browser holds only the anon/publishable key,
-- which cannot touch auth.users. Deleting a user normally requires the
-- service_role key, and that key must never be shipped to a browser. A
-- SECURITY DEFINER function is the safe middle ground: it runs with elevated
-- rights, but it can only ever delete the caller's own rows, because it uses
-- auth.uid() and takes no arguments. There is nothing for a caller to tamper
-- with.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  -- Delete the user's own content first. Doing this explicitly rather than
  -- relying on ON DELETE CASCADE means the outcome does not depend on how
  -- each foreign key happens to be configured.
  delete from public.post_comments where author_id  = uid;
  delete from public.post_likes    where user_id    = uid;
  delete from public.posts         where author_id  = uid;
  delete from public.sightings     where reporter_id = uid;
  delete from public.sos_reports   where reporter_id = uid;
  delete from public.profiles      where id         = uid;

  -- Finally the auth record itself. This is what actually stops them
  -- logging back in.
  delete from auth.users where id = uid;
end;
$$;

-- Only signed-in users may call it. Revoke first so re-running this file
-- does not quietly leave a broader grant in place.
revoke all on function public.delete_own_account() from public, anon, authenticated;
grant execute on function public.delete_own_account() to authenticated;

-- To verify, sign in as a test account and run:
--   select public.delete_own_account();
-- then check the user is gone:
--   select id, email from auth.users order by created_at desc limit 5;
