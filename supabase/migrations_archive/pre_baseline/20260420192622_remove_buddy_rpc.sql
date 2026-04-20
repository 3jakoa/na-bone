create or replace function public.remove_buddy(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid;
  v_match public.buddy_matches%rowtype;
  v_other uuid;
begin
  v_me := public.current_profile_id();
  if v_me is null then
    raise exception 'No profile';
  end if;

  select *
    into v_match
  from public.buddy_matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'Buddy relationship not found';
  end if;

  if v_match.user1_id <> v_me and v_match.user2_id <> v_me then
    raise exception 'Not a member of this buddy relationship';
  end if;

  v_other := case
    when v_match.user1_id = v_me then v_match.user2_id
    else v_match.user1_id
  end;

  delete from public.profile_swipes
  where (swiper_id = v_me and swiped_id = v_other)
     or (swiper_id = v_other and swiped_id = v_me);

  delete from public.buddy_matches
  where id = v_match.id;
end;
$$;

revoke all on function public.remove_buddy(uuid) from public;
grant execute on function public.remove_buddy(uuid) to authenticated;
