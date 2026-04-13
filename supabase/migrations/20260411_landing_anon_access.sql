-- Anonymous access for the public landing page at /posts.
-- The landing page needs to show public meal invites along with the
-- author (name, faculty, photo) and restaurant details. Anon already has
-- SELECT on meal_invites via an earlier migration; this adds the rest.

-- 1) Expose a narrow view of profiles (only fields we want public).
create or replace view public.public_profiles as
select id, name, faculty, photos
from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- 2) Allow anon to read restaurants. This table holds scraped public data
-- from studentska-prehrana.si, so it is safe to expose.
drop policy if exists "Anon can view restaurants" on public.restaurants;
create policy "Anon can view restaurants"
  on public.restaurants for select
  to anon
  using (true);
