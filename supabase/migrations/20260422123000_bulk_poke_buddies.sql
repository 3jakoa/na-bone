create or replace function public.send_bulk_poke_messages(
  p_match_ids uuid[],
  p_location_text text,
  p_scheduled_at timestamptz
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_sender uuid;
  v_match_ids uuid[];
  v_location_text text;
  v_local_scheduled timestamp;
  v_local_today date;
  v_local_target date;
  v_day_diff int;
  v_time text;
  v_when text;
  v_message_text text;
  v_inserted record;
  v_sent_count int := 0;
  v_message_ids uuid[] := '{}'::uuid[];
begin
  v_sender := public.current_profile_id();
  if v_sender is null then
    raise exception 'No profile';
  end if;

  select array_agg(distinct match_id)
    into v_match_ids
  from unnest(p_match_ids) as input(match_id)
  where match_id is not null;

  if coalesce(cardinality(v_match_ids), 0) = 0 then
    raise exception 'Select at least one buddy';
  end if;

  v_location_text := trim(coalesce(p_location_text, ''));
  if v_location_text = '' then
    raise exception 'Location is required';
  end if;

  if p_scheduled_at is null or p_scheduled_at <= now() then
    raise exception 'Scheduled time must be in the future';
  end if;

  if exists (
    select 1
    from unnest(v_match_ids) as input(match_id)
    left join public.buddy_matches bm
      on bm.id = input.match_id
     and (bm.user1_id = v_sender or bm.user2_id = v_sender)
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
    raise exception 'Cannot send poke to a blocked buddy';
  end if;

  if exists (
    select 1
    from unnest(v_match_ids) as input(match_id)
    join public.product_events pe
      on pe.match_id = input.match_id
     and pe.profile_id = v_sender
     and pe.event_type = 'poke_sent'
    where timezone('Europe/Ljubljana', pe.created_at)::date = timezone('Europe/Ljubljana', now())::date
    group by input.match_id
    having count(*) >= 2
  ) then
    raise exception 'Dnevni limit: temu buddyju si danes že poslal/a 2 pokea.';
  end if;

  v_local_scheduled := timezone('Europe/Ljubljana', p_scheduled_at);
  v_local_today := timezone('Europe/Ljubljana', now())::date;
  v_local_target := v_local_scheduled::date;
  v_day_diff := v_local_target - v_local_today;
  v_time := to_char(v_local_scheduled, 'HH24:MI');

  if v_day_diff = 0 then
    v_when := format('danes ob %s', v_time);
  elsif v_day_diff = 1 then
    v_when := format('jutri ob %s', v_time);
  else
    v_when := format('%s ob %s', to_char(v_local_scheduled, 'DD.MM.'), v_time);
  end if;

  v_message_text := format(
    'Greš %s na bone v %s? Pingni me tukaj, če greš.',
    v_when,
    v_location_text
  );

  for v_inserted in
    insert into public.chat_messages (match_id, sender_id, content)
    select input.match_id, v_sender, v_message_text
    from unnest(v_match_ids) as input(match_id)
    returning id, match_id
  loop
    insert into public.product_events (profile_id, match_id, event_type, metadata)
    values (
      v_sender,
      v_inserted.match_id,
      'poke_sent',
      jsonb_build_object(
        'scheduled_at', p_scheduled_at,
        'location_text', v_location_text,
        'message_id', v_inserted.id
      )
    );

    v_sent_count := v_sent_count + 1;
    v_message_ids := array_append(v_message_ids, v_inserted.id);
  end loop;

  return jsonb_build_object(
    'sent_count', v_sent_count,
    'match_ids', v_match_ids,
    'message_ids', v_message_ids
  );
end;
$$;

grant all on function public.send_bulk_poke_messages(uuid[], text, timestamptz) to authenticated;
