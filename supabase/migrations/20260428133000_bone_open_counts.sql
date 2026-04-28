create table if not exists public.bone_opens (
  bone_id uuid not null references public.meal_invites(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (bone_id, profile_id)
);

alter table public.bone_opens enable row level security;

create index if not exists bone_opens_bone_id_idx
  on public.bone_opens (bone_id);

create or replace function public.record_bone_open(p_bone_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_bone record;
begin
  v_profile_id := public.current_profile_id();
  if v_profile_id is null then
    raise exception 'No profile for current user';
  end if;

  select id,
         user_id,
         match_id,
         visibility,
         status,
         scheduled_at
    into v_bone
  from public.meal_invites
  where id = p_bone_id;

  if v_bone.id is null then
    raise exception 'Bone not found';
  end if;
  if v_bone.status <> 'open' or v_bone.scheduled_at <= now() then
    raise exception 'Bone is not active';
  end if;
  if v_bone.user_id = v_profile_id then
    return;
  end if;

  if v_bone.visibility = 'public' then
    if exists (
      select 1
      from public.blocked_users bu
      where (bu.blocker_id = v_bone.user_id and bu.blocked_id = v_profile_id)
         or (bu.blocker_id = v_profile_id and bu.blocked_id = v_bone.user_id)
    ) then
      raise exception 'Bone is not available';
    end if;
  elsif v_bone.visibility = 'private' then
    if not exists (
      select 1
      from public.buddy_matches bm
      where bm.id = v_bone.match_id
        and (bm.user1_id = v_profile_id or bm.user2_id = v_profile_id)
    ) then
      raise exception 'Bone is not available';
    end if;
  else
    raise exception 'Bone is not available';
  end if;

  insert into public.bone_opens (bone_id, profile_id)
  values (p_bone_id, v_profile_id)
  on conflict do nothing;
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

  insert into public.bone_opens (bone_id, profile_id)
  values (p_bone_id, v_responder_profile)
  on conflict do nothing;

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

create or replace function public.get_bone_open_counts(p_bone_ids uuid[])
returns table(bone_id uuid, open_count integer)
language sql
stable
security definer
set search_path = public
as $$
  with requested as (
    select distinct unnest(coalesce(p_bone_ids, array[]::uuid[])) as bone_id
  ),
  visible_bones as (
    select mi.id
    from public.meal_invites mi
    join requested r on r.bone_id = mi.id
    where mi.status = 'open'
      and mi.scheduled_at > now()
      and (
        mi.user_id = public.current_profile_id()
        or (
          mi.visibility = 'public'
          and not exists (
            select 1
            from public.blocked_users bu
            where bu.blocker_id = public.current_profile_id()
              and bu.blocked_id = mi.user_id
          )
          and not exists (
            select 1
            from public.blocked_users bu
            where bu.blocked_id = public.current_profile_id()
              and bu.blocker_id = mi.user_id
          )
        )
        or (
          mi.visibility = 'private'
          and exists (
            select 1
            from public.buddy_matches bm
            where bm.id = mi.match_id
              and (
                bm.user1_id = public.current_profile_id()
                or bm.user2_id = public.current_profile_id()
              )
          )
        )
      )
  )
  select vb.id as bone_id,
         count(bo.profile_id)::integer as open_count
  from visible_bones vb
  left join public.bone_opens bo
    on bo.bone_id = vb.id
  group by vb.id;
$$;

grant execute on function public.record_bone_open(uuid) to authenticated;
grant execute on function public.record_bone_open(uuid) to service_role;
grant execute on function public.get_bone_open_counts(uuid[]) to authenticated;
grant execute on function public.get_bone_open_counts(uuid[]) to service_role;
