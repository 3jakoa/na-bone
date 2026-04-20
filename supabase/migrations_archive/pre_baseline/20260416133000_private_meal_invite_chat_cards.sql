-- Private meal invites should also create chat invite cards.
-- The feed remains a discovery surface, but accepting/declining happens from
-- the chat card.

create or replace function public.create_private_meal_invites(
  p_match_ids uuid[],
  p_restaurant text,
  p_restaurant_info jsonb,
  p_scheduled_at timestamptz,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
  v_group_id uuid := gen_random_uuid();
  v_match_ids uuid[];
  v_note text;
  v_invite record;
begin
  v_author := public.current_profile_id();
  if v_author is null then
    raise exception 'No profile';
  end if;

  select array_agg(distinct match_id)
    into v_match_ids
  from unnest(p_match_ids) as input(match_id)
  where match_id is not null;

  if coalesce(cardinality(v_match_ids), 0) = 0 then
    raise exception 'Select at least one buddy';
  end if;

  if p_restaurant is null or length(trim(p_restaurant)) = 0 then
    raise exception 'Restaurant is required';
  end if;

  if p_scheduled_at <= now() then
    raise exception 'Scheduled time must be in the future';
  end if;

  if exists (
    select 1
    from unnest(v_match_ids) as input(match_id)
    left join public.buddy_matches bm
      on bm.id = input.match_id
     and (bm.user1_id = v_author or bm.user2_id = v_author)
    where bm.id is null
  ) then
    raise exception 'Invalid buddy selection';
  end if;

  if exists (
    select 1
    from unnest(v_match_ids) as input(match_id)
    join public.buddy_matches bm on bm.id = input.match_id
    join public.blocked_users bu
      on (bu.blocker_id = bm.user1_id and bu.blocked_id = bm.user2_id)
      or (bu.blocker_id = bm.user2_id and bu.blocked_id = bm.user1_id)
  ) then
    raise exception 'Cannot invite a blocked buddy';
  end if;

  v_note := nullif(trim(coalesce(p_note, '')), '');

  for v_invite in
    insert into public.meal_invites (
      user_id,
      match_id,
      restaurant,
      restaurant_info,
      scheduled_at,
      note,
      visibility,
      status,
      invite_group_id
    )
    select
      v_author,
      input.match_id,
      trim(p_restaurant),
      p_restaurant_info,
      p_scheduled_at,
      v_note,
      'private',
      'open',
      v_group_id
    from unnest(v_match_ids) as input(match_id)
    returning id, match_id, restaurant, scheduled_at, note
  loop
    insert into public.chat_messages (match_id, sender_id, content)
    values (
      v_invite.match_id,
      v_author,
      jsonb_build_object(
        'type', 'bone_invite',
        'bone_id', v_invite.id,
        'restaurant', v_invite.restaurant,
        'restaurant_address', p_restaurant_info->>'address',
        'restaurant_city', p_restaurant_info->>'city',
        'restaurant_rating', p_restaurant_info->'rating',
        'restaurant_supplement', p_restaurant_info->'supplement_price',
        'restaurant_meal_price', p_restaurant_info->'meal_price',
        'scheduled_at', v_invite.scheduled_at,
        'note', v_invite.note
      )::text
    );
  end loop;

  return v_group_id;
end;
$$;

grant execute on function public.create_private_meal_invites(uuid[], text, jsonb, timestamptz, text) to authenticated;

create or replace function notify_new_meal_invite()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_match record;
  v_other record;
  v_author record;
begin
  if new.match_id is null
     or new.visibility <> 'private'
     or new.invite_group_id is not null then
    return new;
  end if;

  select user1_id, user2_id into v_match
  from public.buddy_matches where id = new.match_id;
  if not found then
    return new;
  end if;

  select p.id, p.name, p.expo_push_token, p.notif_bones
    into v_other
  from public.profiles p
  where p.id = (
    case when v_match.user1_id = new.user_id then v_match.user2_id
         else v_match.user1_id end
  );

  if v_other is null or v_other.notif_bones = false or v_other.expo_push_token is null then
    return new;
  end if;

  select name into v_author from public.profiles where id = new.user_id;

  perform send_expo_push(
    v_other.expo_push_token,
    'Nov bon!',
    coalesce(v_author.name, 'Nekdo') || ' gre v ' || new.restaurant,
    jsonb_build_object('type', 'bone_new', 'bone_id', new.id::text)
  );

  return new;
end;
$$;
