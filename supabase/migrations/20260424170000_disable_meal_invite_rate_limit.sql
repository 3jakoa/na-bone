-- Temporarily disable bon creation rate limiting while the new Boni flow settles.
drop trigger if exists meal_invites_rate_limit on public.meal_invites;
