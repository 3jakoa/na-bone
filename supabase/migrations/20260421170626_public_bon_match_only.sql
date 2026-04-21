-- Public bon joins should only ensure/reuse a match and open chat.
-- They must not create private invite rows or close the source public bon.

create or replace function public.respond_to_bone_invite(p_bone_id uuid, p_response text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_responder uuid;
  v_bone_match uuid;
  v_bone_status text;
  v_bone_owner uuid;
  v_invite_group_id uuid;
  v_source_public_invite_id uuid;
  v_source_status text;
  v_source_visibility text;
begin
  v_responder := public.current_profile_id();
  if v_responder is null then
    raise exception 'No profile';
  end if;

  if p_response not in ('accepted', 'declined') then
    raise exception 'Invalid response';
  end if;

  select match_id, status, user_id, invite_group_id, source_public_invite_id
    into v_bone_match,
         v_bone_status,
         v_bone_owner,
         v_invite_group_id,
         v_source_public_invite_id
  from public.meal_invites
  where id = p_bone_id;

  if v_bone_match is null then
    raise exception 'Bone not found';
  end if;

  if p_response = 'accepted' and v_source_public_invite_id is not null then
    perform 1
    from public.meal_invites
    where id = v_source_public_invite_id
    for update;
  elsif p_response = 'accepted' and v_invite_group_id is not null then
    perform 1
    from public.meal_invites
    where invite_group_id = v_invite_group_id
      and status = 'open'
    order by id
    for update;
  elsif p_response = 'accepted' then
    perform 1
    from public.meal_invites
    where match_id = v_bone_match
      and status = 'open'
    order by id
    for update;
  else
    perform 1
    from public.meal_invites
    where id = p_bone_id
    for update;
  end if;

  select match_id, status, user_id, invite_group_id, source_public_invite_id
    into v_bone_match,
         v_bone_status,
         v_bone_owner,
         v_invite_group_id,
         v_source_public_invite_id
  from public.meal_invites
  where id = p_bone_id
  for update;

  if v_bone_match is null then
    raise exception 'Bone not found';
  end if;
  if v_bone_status <> 'open' then
    raise exception 'Bone is not open';
  end if;
  if v_bone_owner = v_responder then
    raise exception 'Cannot respond to your own bone';
  end if;

  if not exists (
    select 1
    from public.buddy_matches
    where id = v_bone_match
      and (user1_id = v_responder or user2_id = v_responder)
  ) then
    raise exception 'Not a member of this match';
  end if;

  if p_response = 'accepted' and v_source_public_invite_id is not null then
    select status, visibility
      into v_source_status, v_source_visibility
    from public.meal_invites
    where id = v_source_public_invite_id;

    if v_source_status is distinct from 'open'
       or v_source_visibility is distinct from 'public' then
      raise exception 'Bone is not open';
    end if;
  end if;

  update public.meal_invites
    set status = p_response
  where id = p_bone_id;

  if p_response = 'accepted' and v_source_public_invite_id is null then
    if v_invite_group_id is not null then
      update public.meal_invites
        set status = 'expired'
      where invite_group_id = v_invite_group_id
        and id <> p_bone_id
        and status = 'open';
    else
      update public.meal_invites
        set status = 'declined'
      where match_id = v_bone_match
        and id <> p_bone_id
        and status = 'open';
    end if;
  end if;
end;
$$;

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
  v_p1 uuid;
  v_p2 uuid;
begin
  v_responder_profile := public.current_profile_id();
  if v_responder_profile is null then
    raise exception 'No profile for current user';
  end if;

  select id,
         user_id,
         scheduled_at,
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

  return v_match_id;
end;
$$;
