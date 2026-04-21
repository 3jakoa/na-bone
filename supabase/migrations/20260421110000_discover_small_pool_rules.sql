create or replace function public.get_discover_candidates()
returns setof public.profiles
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select public.current_profile_id() as profile_id
  )
  select p.*
  from public.profiles p
  cross join me
  left join public.profile_swipes ps
    on ps.swiper_id = me.profile_id
   and ps.swiped_id = p.id
  where me.profile_id is not null
    and p.is_onboarded = true
    and p.id <> me.profile_id
    and not exists (
      select 1
      from public.blocked_users bu
      where (bu.blocker_id = me.profile_id and bu.blocked_id = p.id)
         or (bu.blocker_id = p.id and bu.blocked_id = me.profile_id)
    )
    and not exists (
      select 1
      from public.buddy_matches bm
      where (bm.user1_id = me.profile_id and bm.user2_id = p.id)
         or (bm.user1_id = p.id and bm.user2_id = me.profile_id)
    )
    and (
      ps.id is null
      or (
        ps.direction = 'left'
        and ps.created_at <= now() - interval '7 days'
      )
    )
  order by
    case when ps.id is null then 0 else 1 end,
    case when ps.id is null then p.created_at end desc,
    case when ps.id is not null then ps.created_at end asc,
    p.id asc;
$$;


alter function public.get_discover_candidates() owner to postgres;


create or replace function public.remaining_daily_right_swipes()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    0,
    10 - count(*)::int
  )
  from public.profile_swipes
  where swiper_id = public.current_profile_id()
    and direction = 'right'
    and timezone('Europe/Ljubljana', created_at)::date = timezone('Europe/Ljubljana', now())::date;
$$;


alter function public.remaining_daily_right_swipes() owner to postgres;


create or replace function public.rate_limit_profile_swipes()
returns trigger
language plpgsql
as $$
declare
  right_swipe_count int;
begin
  new.created_at := now();

  if new.direction <> 'right' then
    return new;
  end if;

  select count(*)
    into right_swipe_count
  from public.profile_swipes ps
  where ps.swiper_id = new.swiper_id
    and ps.direction = 'right'
    and timezone('Europe/Ljubljana', ps.created_at)::date = timezone('Europe/Ljubljana', now())::date
    and (tg_op <> 'UPDATE' or ps.id <> old.id);

  if right_swipe_count >= 10 then
    raise exception 'Porabil si vse današnje buddyje. Jutri lahko spet iščeš buddyja.';
  end if;

  return new;
end;
$$;


drop trigger if exists profile_swipes_rate_limit on public.profile_swipes;


create trigger profile_swipes_rate_limit
before insert or update on public.profile_swipes
for each row execute function public.rate_limit_profile_swipes();


revoke all on function public.get_discover_candidates() from public;
grant all on function public.get_discover_candidates() to authenticated;
grant all on function public.get_discover_candidates() to service_role;


revoke all on function public.remaining_daily_right_swipes() from public;
grant all on function public.remaining_daily_right_swipes() to authenticated;
grant all on function public.remaining_daily_right_swipes() to service_role;
