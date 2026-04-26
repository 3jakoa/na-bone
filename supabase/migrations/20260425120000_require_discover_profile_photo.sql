-- Regression guard: Discover eligibility is enforced in get_discover_candidates(),
-- not in the mobile UI. Profiles need at least one non-empty, non-placeholder
-- photo entry in profiles.photos before they can be returned to the deck.
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
    and exists (
      select 1
      from unnest(p.photos) as profile_photo(photo_url)
      where nullif(btrim(profile_photo.photo_url), '') is not null
        and btrim(profile_photo.photo_url) !~* '(^|/)(placeholder|default[-_]?avatar|avatar[-_]?default|fallback[-_]?avatar|avatar[-_]?fallback)(\.[[:alnum:]]+)?(\?|$)'
    )
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

revoke all on function public.get_discover_candidates() from public;
grant all on function public.get_discover_candidates() to authenticated;
grant all on function public.get_discover_candidates() to service_role;
