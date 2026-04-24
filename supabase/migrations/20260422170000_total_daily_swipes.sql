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
    and timezone('Europe/Ljubljana', created_at)::date = timezone('Europe/Ljubljana', now())::date;
$$;


alter function public.remaining_daily_right_swipes() owner to postgres;


create or replace function public.rate_limit_profile_swipes()
returns trigger
language plpgsql
as $$
declare
  daily_swipe_count int;
begin
  new.created_at := now();

  select count(*)
    into daily_swipe_count
  from public.profile_swipes ps
  where ps.swiper_id = new.swiper_id
    and timezone('Europe/Ljubljana', ps.created_at)::date = timezone('Europe/Ljubljana', now())::date
    and (tg_op <> 'UPDATE' or ps.id <> old.id);

  if daily_swipe_count >= 10 then
    raise exception 'Porabil si vse današnje buddyje. Jutri lahko spet iščeš buddyja.';
  end if;

  return new;
end;
$$;


drop trigger if exists profile_swipes_rate_limit on public.profile_swipes;


create trigger profile_swipes_rate_limit
before insert or update on public.profile_swipes
for each row execute function public.rate_limit_profile_swipes();


revoke all on function public.remaining_daily_right_swipes() from public;
grant all on function public.remaining_daily_right_swipes() to authenticated;
grant all on function public.remaining_daily_right_swipes() to service_role;
