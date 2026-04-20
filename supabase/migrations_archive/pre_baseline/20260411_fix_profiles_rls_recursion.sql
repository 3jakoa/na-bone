-- ============================================================
-- Fix mutual RLS recursion between public.profiles and the
-- tables whose own policies read from public.profiles.
--
-- The original policies (20260408_public_bones.sql,
-- 20260411_blocked_users.sql, 20260411_security_hardening.sql)
-- use this pattern inside USING / WITH CHECK clauses:
--
--   (select id from public.profiles where user_id = auth.uid())
--
-- Because public.profiles has its own "Profiles visibility"
-- SELECT policy which itself reads from public.blocked_users,
-- whose policy in turn reads from public.profiles, any query
-- that exercises these policies recurses through the graph and
-- Postgres raises:
--   "infinite recursion detected in policy for relation profiles"
--
-- Fix: one SECURITY DEFINER helper that returns the caller's
-- own profile id (bypassing RLS, so it never re-triggers any
-- policy), and rewrite every affected policy to call it instead
-- of the recursive subquery. The policy semantics are preserved
-- — only the lookup mechanism changes.
-- ============================================================


-- ---- Helper function -------------------------------------------------------
create or replace function public.current_profile_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.profiles where user_id = auth.uid() limit 1;
$$;

revoke all on function public.current_profile_id() from public;
grant execute on function public.current_profile_id() to authenticated;


-- ---- profiles --------------------------------------------------------------
drop policy if exists "Profiles visibility" on public.profiles;
create policy "Profiles visibility"
  on public.profiles for select
  to authenticated
  using (
    user_id = auth.uid()
    or (
      is_onboarded = true
      and id not in (
        select blocked_id from public.blocked_users
        where blocker_id = public.current_profile_id()
      )
      and id not in (
        select blocker_id from public.blocked_users
        where blocked_id = public.current_profile_id()
      )
    )
  );


-- ---- blocked_users ---------------------------------------------------------
drop policy if exists "Users can view their blocks" on public.blocked_users;
create policy "Users can view their blocks"
  on public.blocked_users for select
  to authenticated
  using (
    blocker_id = public.current_profile_id()
  );

drop policy if exists "Users can block others" on public.blocked_users;
create policy "Users can block others"
  on public.blocked_users for insert
  to authenticated
  with check (blocker_id = public.current_profile_id());

drop policy if exists "Users can unblock" on public.blocked_users;
create policy "Users can unblock"
  on public.blocked_users for delete
  to authenticated
  using (blocker_id = public.current_profile_id());


-- ---- profile_swipes --------------------------------------------------------
drop policy if exists "Users can insert their own swipes" on public.profile_swipes;
create policy "Users can insert their own swipes"
  on public.profile_swipes for insert
  to authenticated
  with check (
    swiper_id = public.current_profile_id()
    and swiped_id not in (
      select blocked_id from public.blocked_users
      where blocker_id = public.current_profile_id()
    )
    and swiped_id not in (
      select blocker_id from public.blocked_users
      where blocked_id = public.current_profile_id()
    )
  );


-- ---- meal_invites ----------------------------------------------------------
drop policy if exists "Meal invite visibility" on public.meal_invites;
create policy "Meal invite visibility"
  on public.meal_invites for select
  to authenticated
  using (
    (
      visibility = 'public'
      and user_id not in (
        select blocked_id from public.blocked_users
        where blocker_id = public.current_profile_id()
      )
      and user_id not in (
        select blocker_id from public.blocked_users
        where blocked_id = public.current_profile_id()
      )
    )
    or user_id = public.current_profile_id()
    or match_id in (
      select id from public.buddy_matches
      where user1_id = public.current_profile_id()
         or user2_id = public.current_profile_id()
    )
  );

drop policy if exists "Users can create meal invites" on public.meal_invites;
create policy "Users can create meal invites"
  on public.meal_invites for insert
  to authenticated
  with check (
    user_id = public.current_profile_id()
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


-- ---- chat_messages ---------------------------------------------------------
drop policy if exists "Users can view chat messages" on public.chat_messages;
create policy "Users can view chat messages"
  on public.chat_messages for select
  to authenticated
  using (
    match_id in (
      select id from public.buddy_matches
      where user1_id = public.current_profile_id()
         or user2_id = public.current_profile_id()
    )
    and sender_id not in (
      select blocked_id from public.blocked_users
      where blocker_id = public.current_profile_id()
    )
  );

drop policy if exists "Users can send chat messages" on public.chat_messages;
create policy "Users can send chat messages"
  on public.chat_messages for insert
  to authenticated
  with check (
    sender_id = public.current_profile_id()
    and match_id in (
      select id from public.buddy_matches
      where user1_id = public.current_profile_id()
         or user2_id = public.current_profile_id()
    )
    and not exists (
      select 1 from public.blocked_users
      where (
        blocker_id in (
          select case
            when user1_id = public.current_profile_id() then user2_id
            else user1_id
          end from public.buddy_matches where id = match_id
        )
        and blocked_id = public.current_profile_id()
      )
    )
  );
