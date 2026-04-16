-- Grouped private meal invites.
-- Private invites can be sent to multiple buddy matches without creating chat
-- messages. Each recipient gets a private meal_invites row linked by the same
-- invite_group_id, so the first accepted row can close the rest.

alter table public.meal_invites
  add column if not exists invite_group_id uuid;

create index if not exists meal_invites_invite_group_idx
  on public.meal_invites(invite_group_id)
  where invite_group_id is not null;

drop policy if exists "Users can create meal invites" on public.meal_invites;
create policy "Users can create meal invites"
  on public.meal_invites for insert
  to authenticated
  with check (
    user_id = public.current_profile_id()
    and (
      match_id is null
      or exists (
        select 1
        from public.buddy_matches bm
        where bm.id = match_id
          and (
            bm.user1_id = public.current_profile_id()
            or bm.user2_id = public.current_profile_id()
          )
          and not exists (
            select 1
            from public.blocked_users bu
            where (bu.blocker_id = bm.user1_id and bu.blocked_id = bm.user2_id)
               or (bu.blocker_id = bm.user2_id and bu.blocked_id = bm.user1_id)
          )
      )
    )
  );

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
    nullif(trim(coalesce(p_note, '')), ''),
    'private',
    'open',
    v_group_id
  from unnest(v_match_ids) as input(match_id);

  return v_group_id;
end;
$$;

grant execute on function public.create_private_meal_invites(uuid[], text, jsonb, timestamptz, text) to authenticated;

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
begin
  v_responder := public.current_profile_id();
  if v_responder is null then
    raise exception 'No profile';
  end if;

  select match_id, status, user_id, invite_group_id
    into v_bone_match, v_bone_status, v_bone_owner, v_invite_group_id
  from public.meal_invites
  where id = p_bone_id;

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
    select 1 from public.buddy_matches
    where id = v_bone_match
      and (user1_id = v_responder or user2_id = v_responder)
  ) then
    raise exception 'Not a member of this match';
  end if;

  update public.meal_invites
    set status = p_response
  where id = p_bone_id;

  if p_response = 'accepted' then
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

grant execute on function public.respond_to_bone_invite(uuid, text) to authenticated;

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
  if new.match_id is null or new.visibility <> 'private' then
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
