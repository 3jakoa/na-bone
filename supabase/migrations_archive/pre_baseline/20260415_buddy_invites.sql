-- One-time buddy invite links. Invite creation and acceptance are handled by
-- security-definer RPCs so the client never inserts directly into buddy_matches.

create table if not exists public.buddy_invites (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  constraint buddy_invites_acceptance_consistent check (
    (accepted_by is null and accepted_at is null)
    or (accepted_by is not null and accepted_at is not null)
  )
);

create index if not exists buddy_invites_inviter_idx
  on public.buddy_invites(inviter_id, created_at desc);

alter table public.buddy_invites enable row level security;

drop policy if exists "Users can view their buddy invites" on public.buddy_invites;
create policy "Users can view their buddy invites"
  on public.buddy_invites for select
  to authenticated
  using (
    inviter_id = public.current_profile_id()
    or accepted_by = public.current_profile_id()
  );

create or replace function public.create_buddy_invite()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
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

grant execute on function public.create_buddy_invite() to authenticated;

create or replace function public.get_buddy_invite_preview(p_token uuid)
returns table (
  status text,
  inviter_name text,
  inviter_faculty text,
  inviter_photo text
)
language plpgsql
security definer
set search_path = public
as $$
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

grant execute on function public.get_buddy_invite_preview(uuid) to anon, authenticated;

create or replace function public.accept_buddy_invite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
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

grant execute on function public.accept_buddy_invite(uuid) to authenticated;
