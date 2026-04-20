-- Phase 1: public/private bones
-- Adds a visibility column to bones, allows public bones with no match,
-- updates RLS, and adds an RPC for responding to public bones (auto-creates a match).

-- 1. Add visibility column (default private = current behavior)
alter table public.bones
  add column if not exists visibility text not null default 'private'
    check (visibility in ('public', 'private'));

-- 2. match_id is already nullable in the schema, no change needed.
--    Sanity-enforce: a private bone must have a match_id; a public bone must not.
alter table public.bones drop constraint if exists bones_visibility_match_chk;
alter table public.bones add constraint bones_visibility_match_chk check (
  (visibility = 'private' and match_id is not null)
  or (visibility = 'public' and match_id is null)
);

create index if not exists bones_public_idx
  on public.bones (created_at desc)
  where visibility = 'public' and status = 'open';

-- 3. RLS: replace the existing select policy so public bones are visible to
--    any authenticated user, while private bones stay restricted to match members.
drop policy if exists "Users can view bones in their matches" on public.bones;

create policy "Bones visibility"
  on public.bones for select
  to authenticated
  using (
    visibility = 'public'
    or user_id = (select id from public.profiles where user_id = auth.uid())
    or match_id in (
      select id from public.matches
      where user1_id = (select id from public.profiles where user_id = auth.uid())
         or user2_id = (select id from public.profiles where user_id = auth.uid())
    )
  );

-- Also let the anon role read open public bones (used by the landing page in Phase 3).
drop policy if exists "Anon can view open public bones" on public.bones;
create policy "Anon can view open public bones"
  on public.bones for select
  to anon
  using (visibility = 'public' and status = 'open');

-- 4. RPC: respond to a public bone.
--    Auto-creates a match between the responder and the bone author (if none exists),
--    converts the bone to private + attaches it to the new match,
--    and returns the match id so the client can navigate to the chat.
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

  -- Attach the bone to the new match and flip it to private/accepted.
  -- Drop the visibility/match check temporarily by updating both columns at once.
  update public.bones
    set match_id = v_match_id,
        visibility = 'private',
        status = 'accepted'
    where id = p_bone_id;

  insert into public.messages (match_id, sender_id, content)
  values (
    v_match_id,
    v_responder_profile,
    '👋 Odgovoril/a sem na tvoj javni bone!'
  );

  return v_match_id;
end;
$$;

grant execute on function public.respond_to_public_bone(uuid) to authenticated;
