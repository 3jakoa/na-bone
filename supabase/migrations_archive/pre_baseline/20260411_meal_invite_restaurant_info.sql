-- Store restaurant details directly on the meal invite so no lookup is needed.
ALTER TABLE public.meal_invites
  ADD COLUMN IF NOT EXISTS restaurant_info jsonb;
