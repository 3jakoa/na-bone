-- Prevent swipes between users who are already buddies, including the UPDATE
-- path used by mobile upserts on (swiper_id, swiped_id).

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
    and not exists (
      select 1
      from public.buddy_matches bm
      where (bm.user1_id = swiper_id and bm.user2_id = swiped_id)
         or (bm.user1_id = swiped_id and bm.user2_id = swiper_id)
    )
  );

drop policy if exists "Users can update their own swipes" on public.profile_swipes;
create policy "Users can update their own swipes"
  on public.profile_swipes for update
  to authenticated
  using (
    swiper_id = public.current_profile_id()
    and swiped_id not in (
      select blocked_id from public.blocked_users
      where blocker_id = public.current_profile_id()
    )
    and swiped_id not in (
      select blocker_id from public.blocked_users
      where blocked_id = public.current_profile_id()
    )
    and not exists (
      select 1
      from public.buddy_matches bm
      where (bm.user1_id = swiper_id and bm.user2_id = swiped_id)
         or (bm.user1_id = swiped_id and bm.user2_id = swiper_id)
    )
  )
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
    and not exists (
      select 1
      from public.buddy_matches bm
      where (bm.user1_id = swiper_id and bm.user2_id = swiped_id)
         or (bm.user1_id = swiped_id and bm.user2_id = swiper_id)
    )
  );
