-- Baseline reset generated from the linked Supabase schema on 2026-04-20.
-- This replaces the pre-baseline migration chain with a single reproducible source of truth.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pg_net with schema extensions;




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."accept_buddy_invite"("p_token" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_acceptor uuid;
  v_invite record;
  v_p1 uuid;
  v_p2 uuid;
  v_match_id uuid;
begin
  v_acceptor := public.current_profile_id();
  if v_acceptor is null then
    raise exception 'No profile';
  end if;

  select *
    into v_invite
  from public.buddy_invites
  where token = p_token
  for update;

  if not found then
    raise exception 'Povezava ni več veljavna';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'Povezava je že uporabljena';
  end if;
  if v_invite.expires_at <= now() then
    raise exception 'Povezava je potekla';
  end if;
  if v_invite.inviter_id = v_acceptor then
    raise exception 'Ne moreš sprejeti svojega povabila';
  end if;

  if exists (
    select 1
    from public.blocked_users
    where (blocker_id = v_invite.inviter_id and blocked_id = v_acceptor)
       or (blocker_id = v_acceptor and blocked_id = v_invite.inviter_id)
  ) then
    raise exception 'Povabila ni mogoče sprejeti';
  end if;

  if v_acceptor < v_invite.inviter_id then
    v_p1 := v_acceptor;
    v_p2 := v_invite.inviter_id;
  else
    v_p1 := v_invite.inviter_id;
    v_p2 := v_acceptor;
  end if;

  select id
    into v_match_id
  from public.buddy_matches
  where user1_id = v_p1 and user2_id = v_p2;

  if v_match_id is null then
    insert into public.buddy_matches (user1_id, user2_id)
    values (v_p1, v_p2)
    on conflict do nothing
    returning id into v_match_id;

    if v_match_id is null then
      select id
        into v_match_id
      from public.buddy_matches
      where user1_id = v_p1 and user2_id = v_p2;
    end if;
  end if;

  update public.buddy_invites
    set accepted_by = v_acceptor,
        accepted_at = now()
  where id = v_invite.id;

  return v_match_id;
end;
$$;


ALTER FUNCTION "public"."accept_buddy_invite"("p_token" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."buddy_meal_count"("p_match_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select count(distinct date(scheduled_at))::int
  from public.meal_invites
  where match_id = p_match_id
    and status = 'accepted'
    and scheduled_at < now();
$$;


ALTER FUNCTION "public"."buddy_meal_count"("p_match_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."buddy_streak"("p_match_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  streak int := 0;
  meal_day date;
  prev_day date := null;
begin
  for meal_day in
    select distinct date(scheduled_at) as d
    from public.meal_invites
    where match_id = p_match_id
      and status = 'accepted'
      and scheduled_at < now()
    order by d desc
  loop
    if prev_day is null then
      streak := 1;
    elsif prev_day - meal_day <= 21 then
      streak := streak + 1;
    else
      exit;
    end if;
    prev_day := meal_day;
  end loop;
  return streak;
end;
$$;


ALTER FUNCTION "public"."buddy_streak"("p_match_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_and_create_match"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  other_swipe_exists boolean;
  p1 uuid;
  p2 uuid;
begin
  if new.direction = 'right' then
    select exists(
      select 1
      from public.profile_swipes
      where swiper_id = new.swiped_id
        and swiped_id = new.swiper_id
        and direction = 'right'
    ) into other_swipe_exists;

    if other_swipe_exists then
      if new.swiper_id < new.swiped_id then
        p1 := new.swiper_id;
        p2 := new.swiped_id;
      else
        p1 := new.swiped_id;
        p2 := new.swiper_id;
      end if;

      insert into public.buddy_matches (user1_id, user2_id)
      values (p1, p2)
      on conflict do nothing;
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."check_and_create_match"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_buddy_invite"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_inviter uuid;
  v_token uuid;
begin
  v_inviter := public.current_profile_id();
  if v_inviter is null then
    raise exception 'No profile';
  end if;

  insert into public.buddy_invites (inviter_id)
  values (v_inviter)
  returning token into v_token;

  return v_token;
end;
$$;


ALTER FUNCTION "public"."create_buddy_invite"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_private_meal_invites"("p_match_ids" "uuid"[], "p_restaurant" "text", "p_restaurant_info" "jsonb", "p_scheduled_at" timestamp with time zone, "p_note" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."create_private_meal_invites"("p_match_ids" "uuid"[], "p_restaurant" "text", "p_restaurant_info" "jsonb", "p_scheduled_at" timestamp with time zone, "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_profile_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select id from public.profiles where user_id = auth.uid() limit 1;
$$;


ALTER FUNCTION "public"."current_profile_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_stale_meal_invites"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  update public.meal_invites
  set status = 'expired'
  where status = 'open'
    and scheduled_at < now() - interval '1 hour';
end;
$$;


ALTER FUNCTION "public"."expire_stale_meal_invites"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_buddy_invite_preview"("p_token" "uuid") RETURNS TABLE("status" "text", "inviter_name" "text", "inviter_faculty" "text", "inviter_photo" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  return query
  select
    case
      when bi.id is null then 'not_found'
      when bi.accepted_at is not null then 'used'
      when bi.expires_at <= now() then 'expired'
      else 'valid'
    end as status,
    p.name as inviter_name,
    p.faculty as inviter_faculty,
    p.photos[1] as inviter_photo
  from (select 1) s
  left join public.buddy_invites bi on bi.token = p_token
  left join public.profiles p on p.id = bi.inviter_id;
end;
$$;


ALTER FUNCTION "public"."get_buddy_invite_preview"("p_token" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_meal_invite_response"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
declare
  v_author record;
  v_title text;
begin
  if old.status = new.status or old.status <> 'open' then
    return new;
  end if;

  if new.status not in ('accepted', 'declined') then
    return new;
  end if;

  select name, expo_push_token, notif_bones
    into v_author
  from public.profiles where id = new.user_id;

  if v_author is null or v_author.notif_bones = false or v_author.expo_push_token is null then
    return new;
  end if;

  v_title := case when new.status = 'accepted'
                  then 'Povabilo sprejeto ✅'
                  else 'Povabilo zavrnjeno' end;

  perform send_expo_push(
    v_author.expo_push_token,
    v_title,
    new.restaurant,
    jsonb_build_object(
      'type', 'bone_reply',
      'match_id', coalesce(new.match_id::text, '')
    )
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."notify_meal_invite_response"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_new_buddy_match"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
declare
  v_u1 record;
  v_u2 record;
begin
  select name, expo_push_token, notif_matches
    into v_u1
  from public.profiles where id = new.user1_id;

  select name, expo_push_token, notif_matches
    into v_u2
  from public.profiles where id = new.user2_id;

  if v_u1.notif_matches and v_u1.expo_push_token is not null then
    perform send_expo_push(
      v_u1.expo_push_token,
      'Nov buddy!',
      'Imaš match z ' || coalesce(v_u2.name, 'nekom') || ' 🎉',
      jsonb_build_object('type', 'match', 'match_id', new.id::text)
    );
  end if;

  if v_u2.notif_matches and v_u2.expo_push_token is not null then
    perform send_expo_push(
      v_u2.expo_push_token,
      'Nov buddy!',
      'Imaš match z ' || coalesce(v_u1.name, 'nekom') || ' 🎉',
      jsonb_build_object('type', 'match', 'match_id', new.id::text)
    );
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."notify_new_buddy_match"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_new_chat_message"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
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


ALTER FUNCTION "public"."notify_new_chat_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_new_meal_invite"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
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


ALTER FUNCTION "public"."notify_new_meal_invite"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rate_limit_chat_messages"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  recent_count int;
begin
  select count(*) into recent_count
  from public.chat_messages
  where sender_id = new.sender_id
    and created_at > now() - interval '1 minute';
  if recent_count >= 60 then
    raise exception 'Rate limit: preveč sporočil. Počakaj trenutek.';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."rate_limit_chat_messages"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rate_limit_meal_invites"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."rate_limit_meal_invites"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rate_limit_profile_swipes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  recent_count int;
begin
  select count(*) into recent_count
  from public.profile_swipes
  where swiper_id = new.swiper_id
    and created_at > now() - interval '1 hour';
  if recent_count >= 200 then
    raise exception 'Rate limit: preveč swipov. Počakaj eno uro.';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."rate_limit_profile_swipes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_buddy"("p_match_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_me uuid;
  v_match public.buddy_matches%rowtype;
  v_other uuid;
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

  v_other := case
    when v_match.user1_id = v_me then v_match.user2_id
    else v_match.user1_id
  end;

  delete from public.profile_swipes
  where (swiper_id = v_me and swiped_id = v_other)
     or (swiper_id = v_other and swiped_id = v_me);

  delete from public.buddy_matches
  where id = v_match.id;
end;
$$;


ALTER FUNCTION "public"."remove_buddy"("p_match_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."respond_to_bone_invite"("p_bone_id" "uuid", "p_response" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."respond_to_bone_invite"("p_bone_id" "uuid", "p_response" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."respond_to_public_bone"("p_bone_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."respond_to_public_bone"("p_bone_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_expo_push"("p_token" "text", "p_title" "text", "p_body" "text", "p_data" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
begin
  if p_token is null or p_token = '' then
    return;
  end if;

  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Accept', 'application/json',
      'Accept-Encoding', 'gzip, deflate'
    ),
    body := jsonb_build_object(
      'to', p_token,
      'title', p_title,
      'body', p_body,
      'data', p_data,
      'sound', 'default',
      'priority', 'high'
    )
  );
end;
$$;


ALTER FUNCTION "public"."send_expo_push"("p_token" "text", "p_title" "text", "p_body" "text", "p_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."blocked_users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "blocker_id" "uuid" NOT NULL,
    "blocked_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."blocked_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."buddy_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inviter_id" "uuid" NOT NULL,
    "accepted_by" "uuid",
    "accepted_at" timestamp with time zone,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '30 days'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "buddy_invites_acceptance_consistent" CHECK (((("accepted_by" IS NULL) AND ("accepted_at" IS NULL)) OR (("accepted_by" IS NOT NULL) AND ("accepted_at" IS NOT NULL))))
);


ALTER TABLE "public"."buddy_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."buddy_matches" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user1_id" "uuid" NOT NULL,
    "user2_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."buddy_matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meal_invites" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "match_id" "uuid",
    "restaurant" "text" NOT NULL,
    "scheduled_at" timestamp with time zone NOT NULL,
    "note" "text",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "visibility" "text" DEFAULT 'private'::"text" NOT NULL,
    "restaurant_info" "jsonb",
    "invite_group_id" "uuid",
    "source_public_invite_id" "uuid",
    CONSTRAINT "bones_visibility_check" CHECK (("visibility" = ANY (ARRAY['public'::"text", 'private'::"text"]))),
    CONSTRAINT "meal_invites_scheduled_at_sane" CHECK ((("scheduled_at" > ("created_at" - '1 day'::interval)) AND ("scheduled_at" < ("created_at" + '6 mons'::interval)))),
    CONSTRAINT "meal_invites_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'accepted'::"text", 'declined'::"text", 'done'::"text", 'expired'::"text"]))),
    CONSTRAINT "meal_invites_visibility_match_chk" CHECK (((("visibility" = 'private'::"text") AND ("match_id" IS NOT NULL)) OR (("visibility" = 'public'::"text") AND ("match_id" IS NULL))))
);


ALTER TABLE "public"."meal_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profile_swipes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "swiper_id" "uuid" NOT NULL,
    "swiped_id" "uuid" NOT NULL,
    "direction" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "swipes_direction_check" CHECK (("direction" = ANY (ARRAY['left'::"text", 'right'::"text"])))
);


ALTER TABLE "public"."profile_swipes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "age" integer NOT NULL,
    "bio" "text",
    "faculty" "text" NOT NULL,
    "university" "text" NOT NULL,
    "city" "text" NOT NULL,
    "gender" "text" NOT NULL,
    "photos" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_onboarded" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "top_restaurants" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "education_level" "text",
    "expo_push_token" "text",
    "notif_bones" boolean DEFAULT true NOT NULL,
    "notif_matches" boolean DEFAULT true NOT NULL,
    "notif_messages" boolean DEFAULT true NOT NULL,
    CONSTRAINT "profiles_age_check" CHECK ((("age" >= 18) AND ("age" <= 35))),
    CONSTRAINT "profiles_education_level_check" CHECK (("education_level" = ANY (ARRAY['dodiplomski'::"text", 'magistrski'::"text", 'doktorski'::"text"]))),
    CONSTRAINT "profiles_gender_check" CHECK (("gender" = ANY (ARRAY['moški'::"text", 'ženska'::"text", 'drugo'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."public_profiles" AS
 SELECT "id",
    "name",
    "faculty",
    "photos"[1:1] AS "photos"
   FROM "public"."profiles"
  WHERE ("is_onboarded" = true);


ALTER VIEW "public"."public_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."restaurants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "city" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sp_id" integer,
    "address" "text",
    "postal_code" "text",
    "latitude" double precision,
    "longitude" double precision,
    "supplement_price" numeric(5,2),
    "meal_price" numeric(5,2),
    "rating" integer,
    "features" "text"[],
    "phone" "text"
);


ALTER TABLE "public"."restaurants" OWNER TO "postgres";


ALTER TABLE ONLY "public"."blocked_users"
    ADD CONSTRAINT "blocked_users_blocker_id_blocked_id_key" UNIQUE ("blocker_id", "blocked_id");



ALTER TABLE ONLY "public"."blocked_users"
    ADD CONSTRAINT "blocked_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meal_invites"
    ADD CONSTRAINT "bones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."buddy_invites"
    ADD CONSTRAINT "buddy_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."buddy_invites"
    ADD CONSTRAINT "buddy_invites_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."buddy_matches"
    ADD CONSTRAINT "matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."buddy_matches"
    ADD CONSTRAINT "matches_user1_id_user2_id_key" UNIQUE ("user1_id", "user2_id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."restaurants"
    ADD CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."restaurants"
    ADD CONSTRAINT "restaurants_sp_id_key" UNIQUE ("sp_id");



ALTER TABLE ONLY "public"."profile_swipes"
    ADD CONSTRAINT "swipes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profile_swipes"
    ADD CONSTRAINT "swipes_swiper_id_swiped_id_key" UNIQUE ("swiper_id", "swiped_id");



CREATE INDEX "buddy_invites_inviter_idx" ON "public"."buddy_invites" USING "btree" ("inviter_id", "created_at" DESC);



CREATE INDEX "meal_invites_invite_group_idx" ON "public"."meal_invites" USING "btree" ("invite_group_id") WHERE ("invite_group_id" IS NOT NULL);



CREATE UNIQUE INDEX "meal_invites_open_public_request_match_idx" ON "public"."meal_invites" USING "btree" ("source_public_invite_id", "match_id") WHERE (("source_public_invite_id" IS NOT NULL) AND ("status" = 'open'::"text"));



CREATE INDEX "meal_invites_public_idx" ON "public"."meal_invites" USING "btree" ("created_at" DESC) WHERE (("visibility" = 'public'::"text") AND ("status" = 'open'::"text"));



CREATE INDEX "meal_invites_source_public_invite_idx" ON "public"."meal_invites" USING "btree" ("source_public_invite_id") WHERE ("source_public_invite_id" IS NOT NULL);



CREATE INDEX "restaurants_city_idx" ON "public"."restaurants" USING "btree" ("city");



CREATE INDEX "restaurants_sp_id_idx" ON "public"."restaurants" USING "btree" ("sp_id");



CREATE OR REPLACE TRIGGER "buddy_matches_push" AFTER INSERT ON "public"."buddy_matches" FOR EACH ROW EXECUTE FUNCTION "public"."notify_new_buddy_match"();



CREATE OR REPLACE TRIGGER "chat_messages_push" AFTER INSERT ON "public"."chat_messages" FOR EACH ROW EXECUTE FUNCTION "public"."notify_new_chat_message"();



CREATE OR REPLACE TRIGGER "chat_messages_rate_limit" BEFORE INSERT ON "public"."chat_messages" FOR EACH ROW EXECUTE FUNCTION "public"."rate_limit_chat_messages"();



CREATE OR REPLACE TRIGGER "meal_invites_push" AFTER INSERT ON "public"."meal_invites" FOR EACH ROW EXECUTE FUNCTION "public"."notify_new_meal_invite"();



CREATE OR REPLACE TRIGGER "meal_invites_rate_limit" BEFORE INSERT ON "public"."meal_invites" FOR EACH ROW EXECUTE FUNCTION "public"."rate_limit_meal_invites"();



CREATE OR REPLACE TRIGGER "meal_invites_response_push" AFTER UPDATE ON "public"."meal_invites" FOR EACH ROW EXECUTE FUNCTION "public"."notify_meal_invite_response"();



CREATE OR REPLACE TRIGGER "profile_swipes_rate_limit" BEFORE INSERT ON "public"."profile_swipes" FOR EACH ROW EXECUTE FUNCTION "public"."rate_limit_profile_swipes"();



CREATE OR REPLACE TRIGGER "profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "swipe_match_trigger" AFTER INSERT OR UPDATE ON "public"."profile_swipes" FOR EACH ROW EXECUTE FUNCTION "public"."check_and_create_match"();



ALTER TABLE ONLY "public"."blocked_users"
    ADD CONSTRAINT "blocked_users_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blocked_users"
    ADD CONSTRAINT "blocked_users_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meal_invites"
    ADD CONSTRAINT "bones_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."buddy_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meal_invites"
    ADD CONSTRAINT "bones_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."buddy_invites"
    ADD CONSTRAINT "buddy_invites_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."buddy_invites"
    ADD CONSTRAINT "buddy_invites_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."buddy_matches"
    ADD CONSTRAINT "matches_user1_id_fkey" FOREIGN KEY ("user1_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."buddy_matches"
    ADD CONSTRAINT "matches_user2_id_fkey" FOREIGN KEY ("user2_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meal_invites"
    ADD CONSTRAINT "meal_invites_source_public_invite_id_fkey" FOREIGN KEY ("source_public_invite_id") REFERENCES "public"."meal_invites"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "messages_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."buddy_matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_swipes"
    ADD CONSTRAINT "swipes_swiped_id_fkey" FOREIGN KEY ("swiped_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_swipes"
    ADD CONSTRAINT "swipes_swiper_id_fkey" FOREIGN KEY ("swiper_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Anon can view open public meal invites" ON "public"."meal_invites" FOR SELECT TO "anon" USING ((("visibility" = 'public'::"text") AND ("status" = 'open'::"text")));



CREATE POLICY "Anon can view restaurants" ON "public"."restaurants" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Authenticated can insert restaurants" ON "public"."restaurants" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Meal invite visibility" ON "public"."meal_invites" FOR SELECT TO "authenticated" USING (((("visibility" = 'public'::"text") AND (NOT ("user_id" IN ( SELECT "blocked_users"."blocked_id"
   FROM "public"."blocked_users"
  WHERE ("blocked_users"."blocker_id" = "public"."current_profile_id"())))) AND (NOT ("user_id" IN ( SELECT "blocked_users"."blocker_id"
   FROM "public"."blocked_users"
  WHERE ("blocked_users"."blocked_id" = "public"."current_profile_id"()))))) OR ("user_id" = "public"."current_profile_id"()) OR ("match_id" IN ( SELECT "buddy_matches"."id"
   FROM "public"."buddy_matches"
  WHERE (("buddy_matches"."user1_id" = "public"."current_profile_id"()) OR ("buddy_matches"."user2_id" = "public"."current_profile_id"()))))));



CREATE POLICY "Profiles visibility" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (("is_onboarded" = true) AND (NOT ("id" IN ( SELECT "blocked_users"."blocked_id"
   FROM "public"."blocked_users"
  WHERE ("blocked_users"."blocker_id" = "public"."current_profile_id"())))) AND (NOT ("id" IN ( SELECT "blocked_users"."blocker_id"
   FROM "public"."blocked_users"
  WHERE ("blocked_users"."blocked_id" = "public"."current_profile_id"())))))));



CREATE POLICY "Restaurants viewable by authenticated" ON "public"."restaurants" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can block others" ON "public"."blocked_users" FOR INSERT TO "authenticated" WITH CHECK (("blocker_id" = "public"."current_profile_id"()));



CREATE POLICY "Users can create meal invites" ON "public"."meal_invites" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "public"."current_profile_id"()) AND (("match_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."buddy_matches" "bm"
  WHERE (("bm"."id" = "meal_invites"."match_id") AND (("bm"."user1_id" = "public"."current_profile_id"()) OR ("bm"."user2_id" = "public"."current_profile_id"())) AND (NOT (EXISTS ( SELECT 1
           FROM "public"."blocked_users" "bu"
          WHERE ((("bu"."blocker_id" = "bm"."user1_id") AND ("bu"."blocked_id" = "bm"."user2_id")) OR (("bu"."blocker_id" = "bm"."user2_id") AND ("bu"."blocked_id" = "bm"."user1_id"))))))))))));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own swipes" ON "public"."profile_swipes" FOR INSERT TO "authenticated" WITH CHECK ((("swiper_id" = "public"."current_profile_id"()) AND (NOT ("swiped_id" IN ( SELECT "blocked_users"."blocked_id"
   FROM "public"."blocked_users"
  WHERE ("blocked_users"."blocker_id" = "public"."current_profile_id"())))) AND (NOT ("swiped_id" IN ( SELECT "blocked_users"."blocker_id"
   FROM "public"."blocked_users"
  WHERE ("blocked_users"."blocked_id" = "public"."current_profile_id"())))) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."buddy_matches" "bm"
  WHERE ((("bm"."user1_id" = "profile_swipes"."swiper_id") AND ("bm"."user2_id" = "profile_swipes"."swiped_id")) OR (("bm"."user1_id" = "profile_swipes"."swiped_id") AND ("bm"."user2_id" = "profile_swipes"."swiper_id"))))))));



CREATE POLICY "Users can send chat messages" ON "public"."chat_messages" FOR INSERT TO "authenticated" WITH CHECK ((("sender_id" = "public"."current_profile_id"()) AND ("match_id" IN ( SELECT "buddy_matches"."id"
   FROM "public"."buddy_matches"
  WHERE (("buddy_matches"."user1_id" = "public"."current_profile_id"()) OR ("buddy_matches"."user2_id" = "public"."current_profile_id"())))) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."blocked_users"
  WHERE (("blocked_users"."blocker_id" IN ( SELECT
                CASE
                    WHEN ("buddy_matches"."user1_id" = "public"."current_profile_id"()) THEN "buddy_matches"."user2_id"
                    ELSE "buddy_matches"."user1_id"
                END AS "user1_id"
           FROM "public"."buddy_matches"
          WHERE ("buddy_matches"."id" = "chat_messages"."match_id"))) AND ("blocked_users"."blocked_id" = "public"."current_profile_id"())))))));



CREATE POLICY "Users can unblock" ON "public"."blocked_users" FOR DELETE TO "authenticated" USING (("blocker_id" = "public"."current_profile_id"()));



CREATE POLICY "Users can update their own meal invites" ON "public"."meal_invites" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own swipes" ON "public"."profile_swipes" FOR UPDATE TO "authenticated" USING ((("swiper_id" = "public"."current_profile_id"()) AND (NOT ("swiped_id" IN ( SELECT "blocked_users"."blocked_id"
   FROM "public"."blocked_users"
  WHERE ("blocked_users"."blocker_id" = "public"."current_profile_id"())))) AND (NOT ("swiped_id" IN ( SELECT "blocked_users"."blocker_id"
   FROM "public"."blocked_users"
  WHERE ("blocked_users"."blocked_id" = "public"."current_profile_id"())))) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."buddy_matches" "bm"
  WHERE ((("bm"."user1_id" = "profile_swipes"."swiper_id") AND ("bm"."user2_id" = "profile_swipes"."swiped_id")) OR (("bm"."user1_id" = "profile_swipes"."swiped_id") AND ("bm"."user2_id" = "profile_swipes"."swiper_id")))))))) WITH CHECK ((("swiper_id" = "public"."current_profile_id"()) AND (NOT ("swiped_id" IN ( SELECT "blocked_users"."blocked_id"
   FROM "public"."blocked_users"
  WHERE ("blocked_users"."blocker_id" = "public"."current_profile_id"())))) AND (NOT ("swiped_id" IN ( SELECT "blocked_users"."blocker_id"
   FROM "public"."blocked_users"
  WHERE ("blocked_users"."blocked_id" = "public"."current_profile_id"())))) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."buddy_matches" "bm"
  WHERE ((("bm"."user1_id" = "profile_swipes"."swiper_id") AND ("bm"."user2_id" = "profile_swipes"."swiped_id")) OR (("bm"."user1_id" = "profile_swipes"."swiped_id") AND ("bm"."user2_id" = "profile_swipes"."swiper_id"))))))));



CREATE POLICY "Users can view bones" ON "public"."meal_invites" FOR SELECT TO "authenticated" USING ((("visibility" = 'public'::"text") OR ("user_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))) OR ("match_id" IN ( SELECT "buddy_matches"."id"
   FROM "public"."buddy_matches"
  WHERE (("buddy_matches"."user1_id" = ( SELECT "profiles"."id"
           FROM "public"."profiles"
          WHERE ("profiles"."user_id" = "auth"."uid"()))) OR ("buddy_matches"."user2_id" = ( SELECT "profiles"."id"
           FROM "public"."profiles"
          WHERE ("profiles"."user_id" = "auth"."uid"()))))))));



CREATE POLICY "Users can view chat messages" ON "public"."chat_messages" FOR SELECT TO "authenticated" USING ((("match_id" IN ( SELECT "buddy_matches"."id"
   FROM "public"."buddy_matches"
  WHERE (("buddy_matches"."user1_id" = "public"."current_profile_id"()) OR ("buddy_matches"."user2_id" = "public"."current_profile_id"())))) AND (NOT ("sender_id" IN ( SELECT "blocked_users"."blocked_id"
   FROM "public"."blocked_users"
  WHERE ("blocked_users"."blocker_id" = "public"."current_profile_id"()))))));



CREATE POLICY "Users can view their blocks" ON "public"."blocked_users" FOR SELECT TO "authenticated" USING (("blocker_id" = "public"."current_profile_id"()));



CREATE POLICY "Users can view their buddy invites" ON "public"."buddy_invites" FOR SELECT TO "authenticated" USING ((("inviter_id" = "public"."current_profile_id"()) OR ("accepted_by" = "public"."current_profile_id"())));



CREATE POLICY "Users can view their buddy matches" ON "public"."buddy_matches" FOR SELECT TO "authenticated" USING ((("user1_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))) OR ("user2_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own swipes" ON "public"."profile_swipes" FOR SELECT TO "authenticated" USING (("swiper_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."blocked_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."buddy_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."buddy_matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meal_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profile_swipes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."restaurants" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."accept_buddy_invite"("p_token" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_buddy_invite"("p_token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_buddy_invite"("p_token" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."buddy_meal_count"("p_match_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."buddy_meal_count"("p_match_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."buddy_meal_count"("p_match_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."buddy_streak"("p_match_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."buddy_streak"("p_match_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."buddy_streak"("p_match_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_and_create_match"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_and_create_match"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_and_create_match"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_buddy_invite"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_buddy_invite"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_buddy_invite"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_private_meal_invites"("p_match_ids" "uuid"[], "p_restaurant" "text", "p_restaurant_info" "jsonb", "p_scheduled_at" timestamp with time zone, "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_private_meal_invites"("p_match_ids" "uuid"[], "p_restaurant" "text", "p_restaurant_info" "jsonb", "p_scheduled_at" timestamp with time zone, "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_private_meal_invites"("p_match_ids" "uuid"[], "p_restaurant" "text", "p_restaurant_info" "jsonb", "p_scheduled_at" timestamp with time zone, "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_profile_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_profile_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_profile_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_profile_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_stale_meal_invites"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_stale_meal_invites"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_stale_meal_invites"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_buddy_invite_preview"("p_token" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_buddy_invite_preview"("p_token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_buddy_invite_preview"("p_token" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_meal_invite_response"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_meal_invite_response"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_meal_invite_response"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_new_buddy_match"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_new_buddy_match"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_new_buddy_match"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_new_chat_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_new_chat_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_new_chat_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_new_meal_invite"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_new_meal_invite"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_new_meal_invite"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rate_limit_chat_messages"() TO "anon";
GRANT ALL ON FUNCTION "public"."rate_limit_chat_messages"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rate_limit_chat_messages"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rate_limit_meal_invites"() TO "anon";
GRANT ALL ON FUNCTION "public"."rate_limit_meal_invites"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rate_limit_meal_invites"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rate_limit_profile_swipes"() TO "anon";
GRANT ALL ON FUNCTION "public"."rate_limit_profile_swipes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rate_limit_profile_swipes"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."remove_buddy"("p_match_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."remove_buddy"("p_match_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_buddy"("p_match_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_buddy"("p_match_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."respond_to_bone_invite"("p_bone_id" "uuid", "p_response" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."respond_to_bone_invite"("p_bone_id" "uuid", "p_response" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."respond_to_bone_invite"("p_bone_id" "uuid", "p_response" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."respond_to_public_bone"("p_bone_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."respond_to_public_bone"("p_bone_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."respond_to_public_bone"("p_bone_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."send_expo_push"("p_token" "text", "p_title" "text", "p_body" "text", "p_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."send_expo_push"("p_token" "text", "p_title" "text", "p_body" "text", "p_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_expo_push"("p_token" "text", "p_title" "text", "p_body" "text", "p_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."blocked_users" TO "anon";
GRANT ALL ON TABLE "public"."blocked_users" TO "authenticated";
GRANT ALL ON TABLE "public"."blocked_users" TO "service_role";



GRANT ALL ON TABLE "public"."buddy_invites" TO "anon";
GRANT ALL ON TABLE "public"."buddy_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."buddy_invites" TO "service_role";



GRANT ALL ON TABLE "public"."buddy_matches" TO "anon";
GRANT ALL ON TABLE "public"."buddy_matches" TO "authenticated";
GRANT ALL ON TABLE "public"."buddy_matches" TO "service_role";



GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."meal_invites" TO "anon";
GRANT ALL ON TABLE "public"."meal_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."meal_invites" TO "service_role";



GRANT ALL ON TABLE "public"."profile_swipes" TO "anon";
GRANT ALL ON TABLE "public"."profile_swipes" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_swipes" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."public_profiles" TO "anon";
GRANT ALL ON TABLE "public"."public_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."public_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."restaurants" TO "anon";
GRANT ALL ON TABLE "public"."restaurants" TO "authenticated";
GRANT ALL ON TABLE "public"."restaurants" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar delete" on storage.objects;
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
drop policy if exists "Avatar insert" on storage.objects;
drop policy if exists "Avatar read" on storage.objects;
drop policy if exists "Avatar update" on storage.objects;
drop policy if exists "Avatars are publicly viewable" on storage.objects;
drop policy if exists "Users can delete their own avatars" on storage.objects;
drop policy if exists "Users can update their avatars" on storage.objects;
drop policy if exists "Users can upload avatars" on storage.objects;
drop policy if exists "Users can upload their own avatars" on storage.objects;

create policy "Avatar delete" on storage.objects for delete to authenticated using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
create policy "Avatar images are publicly accessible" on storage.objects for select to public using ((bucket_id = 'avatars'::text));
create policy "Avatar insert" on storage.objects for insert to authenticated with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
create policy "Avatar read" on storage.objects for select to public using ((bucket_id = 'avatars'::text));
create policy "Avatar update" on storage.objects for update to authenticated using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
create policy "Avatars are publicly viewable" on storage.objects for select to public using ((bucket_id = 'avatars'::text));
create policy "Users can delete their own avatars" on storage.objects for delete to authenticated using (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
create policy "Users can update their avatars" on storage.objects for update to authenticated using ((bucket_id = 'avatars'::text));
create policy "Users can upload avatars" on storage.objects for insert to authenticated with check ((bucket_id = 'avatars'::text));
create policy "Users can upload their own avatars" on storage.objects for insert to authenticated with check (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
