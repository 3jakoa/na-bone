-- Public meal invites now open a chat invite card instead of accepting
-- directly from the feed.

alter table public.meal_invites
  add column if not exists source_public_invite_id uuid
    references public.meal_invites(id)
    on delete set null;

create index if not exists meal_invites_source_public_invite_idx
  on public.meal_invites(source_public_invite_id)
  where source_public_invite_id is not null;

create unique index if not exists meal_invites_open_public_request_match_idx
  on public.meal_invites(source_public_invite_id, match_id)
  where source_public_invite_id is not null
    and status = 'open';

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

  if v_request_id is not null then
    return v_match_id;
  end if;

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

    if v_request_id is null then
      raise exception 'Could not create public bone request';
    end if;

    return v_match_id;
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

    perform 1
    from public.meal_invites
    where source_public_invite_id = v_source_public_invite_id
      and status = 'open'
    order by id
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

  if p_response = 'accepted' then
    if v_source_public_invite_id is not null then
      update public.meal_invites
        set status = 'expired'
      where id = v_source_public_invite_id
        and status = 'open';

      update public.meal_invites
        set status = 'expired'
      where source_public_invite_id = v_source_public_invite_id
        and id <> p_bone_id
        and status = 'open';
    elsif v_invite_group_id is not null then
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

grant execute on function public.respond_to_bone_invite(uuid, text) to authenticated;

create or replace function notify_new_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_match  record;
  v_other  record;
  v_sender record;
  v_preview text;
begin
  begin
    if coalesce((new.content::jsonb)->>'suppress_push', 'false') = 'true' then
      return new;
    end if;
  exception when others then
    null;
  end;

  select user1_id, user2_id into v_match
  from public.buddy_matches
  where id = new.match_id;
  if not found then
    return new;
  end if;

  select p.id, p.name, p.expo_push_token, p.notif_messages
    into v_other
  from public.profiles p
  where p.id = (
    case when v_match.user1_id = new.sender_id then v_match.user2_id
         else v_match.user1_id end
  );

  if v_other is null or v_other.notif_messages = false or v_other.expo_push_token is null then
    return new;
  end if;

  select name into v_sender from public.profiles where id = new.sender_id;

  begin
    v_preview := 'Povabilo na ' || ((new.content::jsonb)->>'restaurant');
  exception when others then
    v_preview := left(new.content, 120);
  end;

  perform send_expo_push(
    v_other.expo_push_token,
    coalesce(v_sender.name, 'Boni Buddy'),
    v_preview,
    jsonb_build_object('type', 'chat', 'match_id', new.match_id::text)
  );

  return new;
end;
$$;

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
     or new.invite_group_id is not null
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

create or replace function rate_limit_meal_invites()
returns trigger
language plpgsql
as $$
declare
  recent_count int;
begin
  if new.source_public_invite_id is not null then
    return new;
  end if;

  select count(*) into recent_count
  from public.meal_invites
  where user_id = new.user_id
    and created_at > now() - interval '1 hour';
  if recent_count >= 10 then
    raise exception 'Rate limit: ustvaril/a si preveč bonov v zadnji uri. Počakaj nekaj minut.';
  end if;
  return new;
end;
$$;
