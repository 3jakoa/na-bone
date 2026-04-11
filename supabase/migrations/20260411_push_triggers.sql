-- Push notifications via Postgres triggers calling the Expo Push API
-- directly through pg_net. No Edge Functions required.
--
-- Flow:
--   chat_messages INSERT  → push to the other match member
--   buddy_matches INSERT  → push to both members ("New match!")
--   meal_invites  INSERT  → push to the other match member (private invite)
--   meal_invites  UPDATE  → push to the invite author on accept/decline
--
-- All triggers respect the recipient's notif_* preference columns and skip
-- silently if the user has no push token or has the preference disabled.
--
-- Requires: pg_net extension (available on Supabase by default)

create extension if not exists pg_net with schema extensions;

-- ----------------------------------------------------------
-- Core helper: send one Expo push
-- ----------------------------------------------------------
create or replace function send_expo_push(
  p_token text,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
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


-- ----------------------------------------------------------
-- 1. New chat message → notify the other match member
-- ----------------------------------------------------------
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
  select user1_id, user2_id into v_match
  from public.buddy_matches
  where id = new.match_id;
  if not found then
    return new;
  end if;

  -- Other participant
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

  -- Sender name for the title
  select name into v_sender from public.profiles where id = new.sender_id;

  -- Preview: if the payload is a bone_invite JSON, show a friendly label,
  -- otherwise show the raw content (truncated).
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

drop trigger if exists chat_messages_push on public.chat_messages;
create trigger chat_messages_push
  after insert on public.chat_messages
  for each row execute function notify_new_chat_message();


-- ----------------------------------------------------------
-- 2. New buddy match → notify both members
-- ----------------------------------------------------------
create or replace function notify_new_buddy_match()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
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

drop trigger if exists buddy_matches_push on public.buddy_matches;
create trigger buddy_matches_push
  after insert on public.buddy_matches
  for each row execute function notify_new_buddy_match();


-- ----------------------------------------------------------
-- 3. Private meal invite → notify the other match member
--    (Skipped for public bones — those already surface in the feed.)
-- ----------------------------------------------------------
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
    jsonb_build_object('type', 'bone_new', 'match_id', new.match_id::text)
  );

  return new;
end;
$$;

drop trigger if exists meal_invites_push on public.meal_invites;
create trigger meal_invites_push
  after insert on public.meal_invites
  for each row execute function notify_new_meal_invite();


-- ----------------------------------------------------------
-- 4. Meal invite status change → notify the author
--    (Only when status transitions from 'open' → 'accepted' or 'declined')
-- ----------------------------------------------------------
create or replace function notify_meal_invite_response()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
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

drop trigger if exists meal_invites_response_push on public.meal_invites;
create trigger meal_invites_response_push
  after update on public.meal_invites
  for each row execute function notify_meal_invite_response();
