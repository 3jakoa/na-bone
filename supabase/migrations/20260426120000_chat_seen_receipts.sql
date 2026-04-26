alter table public.buddy_matches
  add column if not exists user1_last_read_at timestamp with time zone,
  add column if not exists user2_last_read_at timestamp with time zone;

create or replace function public.mark_chat_seen(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid;
  v_match public.buddy_matches%rowtype;
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

  update public.buddy_matches
  set
    user1_last_read_at = case
      when user1_id = v_me then now()
      else user1_last_read_at
    end,
    user2_last_read_at = case
      when user2_id = v_me then now()
      else user2_last_read_at
    end
  where id = p_match_id;
end;
$$;

revoke all on function public.mark_chat_seen(uuid) from public;
grant execute on function public.mark_chat_seen(uuid) to authenticated;
