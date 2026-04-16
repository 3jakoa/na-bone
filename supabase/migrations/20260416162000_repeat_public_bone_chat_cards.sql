-- Re-clicking an open public meal invite should keep the public card visible
-- and create another chat invite card for the same pending request.

create or replace function public.respond_to_public_bone(p_bone_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_responder_profile uuid;
  v_public record;
  v_match_id uuid;
  v_request_id uuid;
  v_p1 uuid;
  v_p2 uuid;
begin
  v_responder_profile := public.current_profile_id();
  if v_responder_profile is null then
    raise exception 'No profile for current user';
  end if;

  select id,
         user_id,
         restaurant,
         restaurant_info,
         scheduled_at,
         note,
         visibility,
         status
    into v_public
  from public.meal_invites
  where id = p_bone_id
  for update;

  if v_public.id is null then
    raise exception 'Bone not found';
  end if;
  if v_public.visibility <> 'public' or v_public.status <> 'open' then
    raise exception 'Bone is not an open public invite';
  end if;
  if v_public.scheduled_at <= now() then
    raise exception 'Bone is no longer active';
  end if;
  if v_public.user_id = v_responder_profile then
    raise exception 'Cannot respond to your own bone';
  end if;

  if exists (
    select 1
    from public.blocked_users bu
    where (bu.blocker_id = v_public.user_id and bu.blocked_id = v_responder_profile)
       or (bu.blocker_id = v_responder_profile and bu.blocked_id = v_public.user_id)
  ) then
    raise exception 'Bone is not available';
  end if;

  if v_responder_profile < v_public.user_id then
    v_p1 := v_responder_profile;
    v_p2 := v_public.user_id;
  else
    v_p1 := v_public.user_id;
    v_p2 := v_responder_profile;
  end if;

  select id
    into v_match_id
  from public.buddy_matches
  where user1_id = v_p1
    and user2_id = v_p2;

  if v_match_id is null then
    insert into public.buddy_matches (user1_id, user2_id)
    values (v_p1, v_p2)
    on conflict do nothing
    returning id into v_match_id;

    if v_match_id is null then
      select id
        into v_match_id
      from public.buddy_matches
      where user1_id = v_p1
        and user2_id = v_p2;
    end if;
  end if;

  if v_match_id is null then
    raise exception 'Could not create match';
  end if;

  select id
    into v_request_id
  from public.meal_invites
  where source_public_invite_id = p_bone_id
    and match_id = v_match_id
    and status = 'open'
  order by created_at desc
  limit 1;

  if v_request_id is null then
    insert into public.meal_invites (
      user_id,
      match_id,
      restaurant,
      restaurant_info,
      scheduled_at,
      note,
      visibility,
      status,
      source_public_invite_id
    )
    values (
      v_public.user_id,
      v_match_id,
      v_public.restaurant,
      v_public.restaurant_info,
      v_public.scheduled_at,
      v_public.note,
      'private',
      'open',
      p_bone_id
    )
    on conflict do nothing
    returning id into v_request_id;

    if v_request_id is null then
      select id
        into v_request_id
      from public.meal_invites
      where source_public_invite_id = p_bone_id
        and match_id = v_match_id
        and status = 'open'
      order by created_at desc
      limit 1;
    end if;
  end if;

  if v_request_id is null then
    raise exception 'Could not create public bone request';
  end if;

  insert into public.chat_messages (match_id, sender_id, content)
  values (
    v_match_id,
    v_public.user_id,
    jsonb_build_object(
      'type', 'bone_invite',
      'bone_id', v_request_id,
      'restaurant', v_public.restaurant,
      'restaurant_address', v_public.restaurant_info->>'address',
      'restaurant_city', v_public.restaurant_info->>'city',
      'restaurant_rating', v_public.restaurant_info->'rating',
      'restaurant_supplement', v_public.restaurant_info->'supplement_price',
      'restaurant_meal_price', v_public.restaurant_info->'meal_price',
      'scheduled_at', v_public.scheduled_at,
      'note', v_public.note,
      'suppress_push', true
    )::text
  );

  return v_match_id;
end;
$$;

grant execute on function public.respond_to_public_bone(uuid) to authenticated;
