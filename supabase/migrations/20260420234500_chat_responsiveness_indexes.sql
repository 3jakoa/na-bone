-- Speed up chat thread reads and chat-message realtime authorization checks.
-- Existing UNIQUE (user1_id, user2_id) already covers user1_id lookups, but
-- chat RLS also filters on user2_id and chat fetches filter by match_id.

create index if not exists chat_messages_match_created_at_idx
  on public.chat_messages using btree (match_id, created_at);

create index if not exists buddy_matches_user2_id_idx
  on public.buddy_matches using btree (user2_id);
