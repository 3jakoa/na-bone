-- 1. Replace respond_to_public_bone to NOT auto-send a greeting message.
--    The client now navigates to the chat with a gender-based pre-filled message instead.
create or replace function public.respond_to_public_bone(p_bone_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_responder_profile uuid;
  v_author_profile uuid;
  v_match_id uuid;
  v_p1 uuid;
  v_p2 uuid;
  v_visibility text;
  v_status text;
begin
  select id into v_responder_profile from public.profiles where user_id = auth.uid();
  if v_responder_profile is null then
    raise exception 'No profile for current user';
  end if;

  select user_id, visibility, status
    into v_author_profile, v_visibility, v_status
  from public.bones where id = p_bone_id;

  if v_author_profile is null then
    raise exception 'Bone not found';
  end if;
  if v_visibility <> 'public' or v_status <> 'open' then
    raise exception 'Bone is not an open public invite';
  end if;
  if v_author_profile = v_responder_profile then
    raise exception 'Cannot respond to your own bone';
  end if;

  if v_responder_profile < v_author_profile then
    v_p1 := v_responder_profile; v_p2 := v_author_profile;
  else
    v_p1 := v_author_profile; v_p2 := v_responder_profile;
  end if;

  select id into v_match_id from public.matches
    where user1_id = v_p1 and user2_id = v_p2;

  if v_match_id is null then
    insert into public.matches (user1_id, user2_id)
    values (v_p1, v_p2)
    returning id into v_match_id;
  end if;

  update public.bones
    set match_id = v_match_id,
        visibility = 'private',
        status = 'accepted'
    where id = p_bone_id;

  return v_match_id;
end;
$$;

-- 2. New RPC: accept or decline a private bone invite.
--    Runs as security definer to bypass the owner-only update RLS policy.
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
begin
  select id into v_responder from public.profiles where user_id = auth.uid();
  if v_responder is null then
    raise exception 'No profile';
  end if;

  select match_id, status, user_id
    into v_bone_match, v_bone_status, v_bone_owner
  from public.bones where id = p_bone_id;

  if v_bone_match is null then
    raise exception 'Bone not found';
  end if;
  if v_bone_status <> 'open' then
    raise exception 'Bone is not open';
  end if;
  if p_response not in ('accepted', 'declined') then
    raise exception 'Invalid response';
  end if;
  if v_bone_owner = v_responder then
    raise exception 'Cannot respond to your own bone';
  end if;

  if not exists (
    select 1 from public.matches
    where id = v_bone_match
      and (user1_id = v_responder or user2_id = v_responder)
  ) then
    raise exception 'Not a member of this match';
  end if;

  update public.bones set status = p_response where id = p_bone_id;
end;
$$;

grant execute on function public.respond_to_bone_invite(uuid, text) to authenticated;
