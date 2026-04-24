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
  v_requested_match_ids uuid[];
  v_match_ids uuid[];
  v_note text;
begin
  v_author := public.current_profile_id();
  if v_author is null then
    raise exception 'No profile';
  end if;

  if p_restaurant is null or length(trim(p_restaurant)) = 0 then
    raise exception 'Restaurant is required';
  end if;

  if p_scheduled_at <= now() then
    raise exception 'Scheduled time must be in the future';
  end if;

  if coalesce(cardinality(p_match_ids), 0) = 0 then
    select array_agg(bm.id order by bm.id)
      into v_requested_match_ids
    from public.buddy_matches bm
    where bm.user1_id = v_author
       or bm.user2_id = v_author;
  else
    select array_agg(distinct input.match_id order by input.match_id)
      into v_requested_match_ids
    from unnest(p_match_ids) as input(match_id)
    where input.match_id is not null;

    if coalesce(cardinality(v_requested_match_ids), 0) = 0 then
      raise exception 'Select at least one buddy';
    end if;

    if exists (
      select 1
      from unnest(v_requested_match_ids) as input(match_id)
      left join public.buddy_matches bm
        on bm.id = input.match_id
       and (bm.user1_id = v_author or bm.user2_id = v_author)
      where bm.id is null
    ) then
      raise exception 'Invalid buddy selection';
    end if;
  end if;

  select array_agg(bm.id order by bm.id)
    into v_match_ids
  from public.buddy_matches bm
  where bm.id = any(coalesce(v_requested_match_ids, '{}'::uuid[]))
    and not exists (
      select 1
      from public.blocked_users bu
      where (bu.blocker_id = bm.user1_id and bu.blocked_id = bm.user2_id)
         or (bu.blocker_id = bm.user2_id and bu.blocked_id = bm.user1_id)
    );

  if coalesce(cardinality(v_match_ids), 0) = 0 then
    raise exception 'No eligible buddies';
  end if;

  v_note := nullif(trim(coalesce(p_note, '')), '');

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
  from unnest(v_match_ids) as input(match_id);

  return v_group_id;
end;
$$;

create or replace function public.notify_new_meal_invite()
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
     or new.source_public_invite_id is not null then
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
