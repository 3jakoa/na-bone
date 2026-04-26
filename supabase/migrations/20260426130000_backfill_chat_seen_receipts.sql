update public.buddy_matches as bm
set
  user1_last_read_at = coalesce(bm.user1_last_read_at, latest.latest_message_at),
  user2_last_read_at = coalesce(bm.user2_last_read_at, latest.latest_message_at)
from (
  select
    match_id,
    max(created_at) as latest_message_at
  from public.chat_messages
  group by match_id
) as latest
where bm.id = latest.match_id
  and (
    bm.user1_last_read_at is null
    or bm.user2_last_read_at is null
  );
