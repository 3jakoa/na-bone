-- Security hardening + auto-expire + buddy streaks.
-- This migration is defensive: every block is idempotent so it can be re-run safely.

-- ============================================================
-- 1. Enable RLS on restaurants (was missing — grant policies were no-ops)
-- ============================================================
alter table public.restaurants enable row level security;

drop policy if exists "Anon can view restaurants" on public.restaurants;
create policy "Anon can view restaurants"
  on public.restaurants for select
  to anon, authenticated
  using (true);

-- Only allow authenticated users to insert new restaurants (via the "add custom"
-- flow in the mobile create screen). No updates/deletes from the client.
drop policy if exists "Authenticated can insert restaurants" on public.restaurants;
create policy "Authenticated can insert restaurants"
  on public.restaurants for insert
  to authenticated
  with check (true);


-- ============================================================
-- 2. Tighten public_profiles view for anon visitors
--    Only: id, name, faculty, first photo.
-- ============================================================
drop view if exists public.public_profiles;
create view public.public_profiles as
select
  id,
  name,
  faculty,
  photos[1:1] as photos
from public.profiles
where is_onboarded = true;

grant select on public.public_profiles to anon, authenticated;


-- ============================================================
-- 3. Tighten profiles SELECT policy — block enforcement
-- ============================================================
drop policy if exists "Public profiles are viewable by authenticated users" on public.profiles;
drop policy if exists "Profiles visibility" on public.profiles;

create policy "Profiles visibility"
  on public.profiles for select
  to authenticated
  using (
    -- Always allow viewing your own profile (needed by subqueries in other policies)
    user_id = auth.uid()
    or (
      is_onboarded = true
      and id not in (
        select blocked_id from public.blocked_users
        where blocker_id = (select id from public.profiles where user_id = auth.uid())
      )
      and id not in (
        select blocker_id from public.blocked_users
        where blocked_id = (select id from public.profiles where user_id = auth.uid())
      )
    )
  );


-- ============================================================
-- 4. CHECK constraint on meal_invites.scheduled_at
--    Deterministic (references created_at, not now()) so Postgres accepts it.
-- ============================================================
alter table public.meal_invites
  drop constraint if exists meal_invites_scheduled_at_sane;
alter table public.meal_invites
  add constraint meal_invites_scheduled_at_sane check (
    scheduled_at > created_at - interval '1 day'
    and scheduled_at < created_at + interval '6 months'
  );


-- ============================================================
-- 5. Expanded status enum so auto-expire has a place to land rows
--    The original constraint is still called "bones_status_check"
--    because the rename_tables migration renamed the table but not
--    this constraint. Drop both names to be safe.
-- ============================================================
alter table public.meal_invites
  drop constraint if exists meal_invites_status_check;
alter table public.meal_invites
  drop constraint if exists bones_status_check;
alter table public.meal_invites
  add constraint meal_invites_status_check
  check (status in ('open', 'accepted', 'declined', 'done', 'expired'));


-- ============================================================
-- 6. Rate limiting — triggers that count recent rows per user
-- ============================================================

-- Meal invites: max 10 per user per hour
create or replace function rate_limit_meal_invites()
returns trigger
language plpgsql
as $$
declare
  recent_count int;
begin
  select count(*) into recent_count
  from public.meal_invites
  where user_id = new.user_id
    and created_at > now() - interval '1 hour';
  if recent_count >= 10 then
    raise exception 'Rate limit: ustvaril/a si preveč bonov v zadnji uri. Počakaj nekaj minut.';
  end if;
  return new;
end;
$$;

drop trigger if exists meal_invites_rate_limit on public.meal_invites;
create trigger meal_invites_rate_limit
  before insert on public.meal_invites
  for each row execute function rate_limit_meal_invites();

-- Swipes: max 200 per user per hour
create or replace function rate_limit_profile_swipes()
returns trigger
language plpgsql
as $$
declare
  recent_count int;
begin
  select count(*) into recent_count
  from public.profile_swipes
  where swiper_id = new.swiper_id
    and created_at > now() - interval '1 hour';
  if recent_count >= 200 then
    raise exception 'Rate limit: preveč swipov. Počakaj eno uro.';
  end if;
  return new;
end;
$$;

drop trigger if exists profile_swipes_rate_limit on public.profile_swipes;
create trigger profile_swipes_rate_limit
  before insert on public.profile_swipes
  for each row execute function rate_limit_profile_swipes();

-- Chat messages: max 60 per user per minute
create or replace function rate_limit_chat_messages()
returns trigger
language plpgsql
as $$
declare
  recent_count int;
begin
  select count(*) into recent_count
  from public.chat_messages
  where sender_id = new.sender_id
    and created_at > now() - interval '1 minute';
  if recent_count >= 60 then
    raise exception 'Rate limit: preveč sporočil. Počakaj trenutek.';
  end if;
  return new;
end;
$$;

drop trigger if exists chat_messages_rate_limit on public.chat_messages;
create trigger chat_messages_rate_limit
  before insert on public.chat_messages
  for each row execute function rate_limit_chat_messages();


-- ============================================================
-- 7. blocked_users SELECT — don't leak who blocked you
-- ============================================================
drop policy if exists "Users can view their blocks" on public.blocked_users;
create policy "Users can view their blocks"
  on public.blocked_users for select
  to authenticated
  using (
    blocker_id = (select id from public.profiles where user_id = auth.uid())
  );


-- ============================================================
-- 8. Block enforcement on profile_swipes INSERT
--    Can't swipe on someone who blocked you, or whom you blocked.
-- ============================================================
drop policy if exists "Users can insert their own swipes" on public.profile_swipes;
create policy "Users can insert their own swipes"
  on public.profile_swipes for insert
  to authenticated
  with check (
    swiper_id = (select id from public.profiles where user_id = auth.uid())
    and swiped_id not in (
      select blocked_id from public.blocked_users
      where blocker_id = (select id from public.profiles where user_id = auth.uid())
    )
    and swiped_id not in (
      select blocker_id from public.blocked_users
      where blocked_id = (select id from public.profiles where user_id = auth.uid())
    )
  );


-- ============================================================
-- 9. Block enforcement on private meal_invites INSERT
--    Can't send a match-bound invite if either side of the match has a block.
-- ============================================================
drop policy if exists "Users can create meal invites" on public.meal_invites;
create policy "Users can create meal invites"
  on public.meal_invites for insert
  to authenticated
  with check (
    user_id = (select id from public.profiles where user_id = auth.uid())
    and (
      match_id is null
      or not exists (
        select 1
        from public.buddy_matches bm
        where bm.id = match_id
          and exists (
            select 1 from public.blocked_users
            where (blocker_id = bm.user1_id and blocked_id = bm.user2_id)
               or (blocker_id = bm.user2_id and blocked_id = bm.user1_id)
          )
      )
    )
  );


-- ============================================================
-- 10. Storage bucket policies for the "avatars" bucket
--     - Public read (profile photos are meant to be visible)
--     - Write/update/delete only within your own folder (auth.uid()/...)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar read" on storage.objects;
drop policy if exists "Avatar insert" on storage.objects;
drop policy if exists "Avatar update" on storage.objects;
drop policy if exists "Avatar delete" on storage.objects;

create policy "Avatar read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Avatar insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatar update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatar delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ============================================================
-- 11. Auto-expire stale public bones
--     Marks open invites as 'expired' once they are 1h past scheduled_at.
--     Scheduled via pg_cron if available; falls through quietly otherwise.
-- ============================================================
create or replace function expire_stale_meal_invites()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.meal_invites
  set status = 'expired'
  where status = 'open'
    and scheduled_at < now() - interval '1 hour';
end;
$$;

grant execute on function public.expire_stale_meal_invites() to authenticated, anon;

-- Try to schedule it. If pg_cron isn't enabled in this project, the DO block
-- swallows the error and just leaves the function callable manually.
do $$
begin
  perform cron.schedule(
    'expire-stale-bones',
    '*/15 * * * *',
    $c$select public.expire_stale_meal_invites()$c$
  );
exception when others then
  raise notice 'pg_cron not available — enable it in the Supabase dashboard to auto-expire bones.';
end $$;


-- ============================================================
-- 12. Buddy streak — consecutive-meal counter
--     Counts accepted meals in a row for a match where each meal is within
--     21 days of the previous one. Returns 0 if no completed meals yet.
-- ============================================================
create or replace function buddy_streak(p_match_id uuid)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  streak int := 0;
  meal_day date;
  prev_day date := null;
begin
  for meal_day in
    select distinct date(scheduled_at) as d
    from public.meal_invites
    where match_id = p_match_id
      and status = 'accepted'
      and scheduled_at < now()
    order by d desc
  loop
    if prev_day is null then
      streak := 1;
    elsif prev_day - meal_day <= 21 then
      streak := streak + 1;
    else
      exit;
    end if;
    prev_day := meal_day;
  end loop;
  return streak;
end;
$$;

grant execute on function public.buddy_streak(uuid) to authenticated;

-- Total completed meals for a match (shown alongside streak)
create or replace function buddy_meal_count(p_match_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct date(scheduled_at))::int
  from public.meal_invites
  where match_id = p_match_id
    and status = 'accepted'
    and scheduled_at < now();
$$;

grant execute on function public.buddy_meal_count(uuid) to authenticated;


-- ============================================================
-- 13. Push notification token storage
-- ============================================================
alter table public.profiles
  add column if not exists expo_push_token text;

alter table public.profiles
  add column if not exists notif_bones boolean not null default true;
alter table public.profiles
  add column if not exists notif_matches boolean not null default true;
alter table public.profiles
  add column if not exists notif_messages boolean not null default true;
