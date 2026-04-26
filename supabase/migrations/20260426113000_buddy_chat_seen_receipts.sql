alter table public.chat_messages
  add column if not exists read_at timestamptz;

create index if not exists chat_messages_match_sender_unread_idx
  on public.chat_messages using btree (match_id, sender_id, read_at)
  where read_at is null;

create or replace function public.get_buddy_chat_previews()
returns table (
  match_id uuid,
  other_profile_id uuid,
  other_user_id uuid,
  other_name text,
  other_faculty text,
  other_photos text[],
  latest_message_content text,
  latest_message_sender_id uuid,
  latest_message_mine boolean,
  latest_message_created_at timestamptz,
  match_created_at timestamptz,
  last_activity_at timestamptz,
  streak integer,
  unread_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select public.current_profile_id() as profile_id
  )
  select
    bm.id as match_id,
    other_profile.id as other_profile_id,
    other_profile.user_id as other_user_id,
    other_profile.name as other_name,
    other_profile.faculty as other_faculty,
    other_profile.photos as other_photos,
    latest_message.content as latest_message_content,
    latest_message.sender_id as latest_message_sender_id,
    latest_message.sender_id = me.profile_id as latest_message_mine,
    latest_message.created_at as latest_message_created_at,
    bm.created_at as match_created_at,
    coalesce(latest_message.created_at, bm.created_at) as last_activity_at,
    public.buddy_streak(bm.id) as streak,
    coalesce(unread_messages.count, 0)::integer as unread_count
  from me
  join public.buddy_matches bm
    on me.profile_id is not null
   and (bm.user1_id = me.profile_id or bm.user2_id = me.profile_id)
  join public.profiles other_profile
    on other_profile.id = case
      when bm.user1_id = me.profile_id then bm.user2_id
      else bm.user1_id
    end
   and other_profile.is_onboarded = true
  left join lateral (
    select cm.content, cm.sender_id, cm.created_at
    from public.chat_messages cm
    where cm.match_id = bm.id
    order by cm.created_at desc, cm.id desc
    limit 1
  ) latest_message on true
  left join lateral (
    select count(*) as count
    from public.chat_messages cm
    where cm.match_id = bm.id
      and cm.sender_id <> me.profile_id
      and cm.read_at is null
  ) unread_messages on true
  where not exists (
    select 1
    from public.blocked_users bu
    where (bu.blocker_id = me.profile_id and bu.blocked_id = other_profile.id)
       or (bu.blocker_id = other_profile.id and bu.blocked_id = me.profile_id)
  )
  order by coalesce(latest_message.created_at, bm.created_at) desc, bm.id;
$$;

revoke all on function public.get_buddy_chat_previews() from public;
grant execute on function public.get_buddy_chat_previews() to authenticated;

create or replace function public.mark_buddy_chat_read(p_match_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.current_profile_id();
  v_updated integer := 0;
begin
  if v_me is null then
    return 0;
  end if;

  if not exists (
    select 1
    from public.buddy_matches bm
    where bm.id = p_match_id
      and (bm.user1_id = v_me or bm.user2_id = v_me)
      and not exists (
        select 1
        from public.blocked_users bu
        where (
          bu.blocker_id = v_me
          and bu.blocked_id = case when bm.user1_id = v_me then bm.user2_id else bm.user1_id end
        ) or (
          bu.blocked_id = v_me
          and bu.blocker_id = case when bm.user1_id = v_me then bm.user2_id else bm.user1_id end
        )
      )
  ) then
    return 0;
  end if;

  update public.chat_messages cm
  set read_at = now()
  where cm.match_id = p_match_id
    and cm.sender_id <> v_me
    and cm.read_at is null;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

revoke all on function public.mark_buddy_chat_read(uuid) from public;
grant execute on function public.mark_buddy_chat_read(uuid) to authenticated;
