alter table public.profiles
  add column if not exists product_variant text not null default 'control';

alter table public.profiles
  drop constraint if exists profiles_product_variant_check;

alter table public.profiles
  add constraint profiles_product_variant_check
  check (product_variant = any (array['control'::text, 'poke_v1'::text]));

create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid references public.buddy_matches(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists product_events_profile_created_at_idx
  on public.product_events using btree (profile_id, created_at desc);

create index if not exists product_events_match_created_at_idx
  on public.product_events using btree (match_id, created_at desc)
  where match_id is not null;

create index if not exists product_events_event_type_created_at_idx
  on public.product_events using btree (event_type, created_at desc);

alter table public.product_events enable row level security;

drop policy if exists "Users can view their own product events" on public.product_events;
create policy "Users can view their own product events"
  on public.product_events for select
  to authenticated
  using (profile_id = public.current_profile_id());

create or replace function public.log_product_event(
  p_event_type text,
  p_match_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_profile_id uuid;
  v_event_id uuid;
begin
  v_profile_id := public.current_profile_id();
  if v_profile_id is null then
    raise exception 'No profile';
  end if;

  if p_event_type is null or length(trim(p_event_type)) = 0 then
    raise exception 'Event type is required';
  end if;

  if p_match_id is not null and not exists (
    select 1
    from public.buddy_matches
    where id = p_match_id
      and (user1_id = v_profile_id or user2_id = v_profile_id)
  ) then
    raise exception 'Invalid match';
  end if;

  insert into public.product_events (profile_id, match_id, event_type, metadata)
  values (
    v_profile_id,
    p_match_id,
    trim(p_event_type),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function public.send_poke_message(
  p_match_id uuid,
  p_location_label text
) returns public.chat_messages
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_sender uuid;
  v_match record;
  v_other_id uuid;
  v_prompt text;
  v_message public.chat_messages%rowtype;
  v_location_label text;
  v_allowed_locations text[] := array[
    'Center',
    'Blizu faksa',
    'Rožna',
    'Bežigrad',
    'Vič',
    'Šiška',
    'BTC'
  ];
begin
  v_sender := public.current_profile_id();
  if v_sender is null then
    raise exception 'No profile';
  end if;

  v_location_label := trim(coalesce(p_location_label, ''));
  if v_location_label = '' then
    raise exception 'Location is required';
  end if;

  if not (v_location_label = any (v_allowed_locations)) then
    raise exception 'Invalid poke location';
  end if;

  select id, user1_id, user2_id
    into v_match
  from public.buddy_matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'Match not found';
  end if;

  if v_match.user1_id <> v_sender and v_match.user2_id <> v_sender then
    raise exception 'Not a member of this match';
  end if;

  v_other_id := case
    when v_match.user1_id = v_sender then v_match.user2_id
    else v_match.user1_id
  end;

  if exists (
    select 1
    from public.blocked_users
    where (blocker_id = v_sender and blocked_id = v_other_id)
       or (blocker_id = v_other_id and blocked_id = v_sender)
  ) then
    raise exception 'Cannot send poke to this buddy';
  end if;

  if exists (
    select 1
    from public.chat_messages
    where match_id = p_match_id
      and sender_id = v_sender
      and created_at > now() - interval '12 hours'
      and case
        when left(coalesce(content, ''), 1) = '{' then coalesce(content::jsonb->>'type', '')
        else ''
      end = 'poke'
  ) then
    raise exception 'Poke already sent recently. Poskusi znova kasneje.';
  end if;

  v_prompt := format('Greš danes na bone v %s?', v_location_label);

  insert into public.chat_messages (match_id, sender_id, content)
  values (
    p_match_id,
    v_sender,
    jsonb_build_object(
      'type', 'poke',
      'location_label', v_location_label,
      'prompt', v_prompt
    )::text
  )
  returning * into v_message;

  insert into public.product_events (profile_id, match_id, event_type, metadata)
  values (
    v_sender,
    p_match_id,
    'poke_sent',
    jsonb_build_object(
      'location_label', v_location_label,
      'message_id', v_message.id
    )
  );

  return v_message;
end;
$$;

create or replace function public.notify_new_chat_message() returns trigger
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_match record;
  v_other record;
  v_sender_name text;
  v_preview text;
  v_payload jsonb;
  v_type text;
begin
  begin
    if left(coalesce(new.content, ''), 1) = '{' then
      v_payload := new.content::jsonb;
      if coalesce(v_payload->>'suppress_push', 'false') = 'true' then
        return new;
      end if;
      v_type := v_payload->>'type';
    end if;
  exception when others then
    v_payload := null;
    v_type := null;
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

  select name into v_sender_name from public.profiles where id = new.sender_id;

  if v_type = 'bone_invite' then
    v_preview := 'Povabilo na ' || coalesce(v_payload->>'restaurant', 'bone');
  elsif v_type = 'poke' then
    v_preview := coalesce(
      v_payload->>'prompt',
      format('Greš danes na bone v %s?', coalesce(v_payload->>'location_label', 'Center'))
    );
  else
    v_preview := left(new.content, 120);
  end if;

  perform public.send_expo_push(
    v_other.expo_push_token,
    coalesce(v_sender_name, 'Boni Buddy'),
    v_preview,
    jsonb_build_object('type', 'chat', 'match_id', new.match_id::text)
  );

  return new;
end;
$$;

grant select on table public.product_events to authenticated;
grant all on function public.log_product_event(text, uuid, jsonb) to authenticated;
grant all on function public.send_poke_message(uuid, text) to authenticated;
