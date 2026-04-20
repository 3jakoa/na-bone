## Supabase Migrations

`supabase/migrations/` is now a baseline-first migration chain.

- `20260420233000_baseline_reset.sql` is the new canonical schema baseline generated from the linked Supabase project.
- `20260420233100_seed_restaurants.sql` seeds the current restaurants snapshot required by the app.
- All future migrations must use unique numeric timestamps and build on this baseline.

Legacy pre-baseline migrations were moved to `supabase/migrations_archive/pre_baseline/` for reference only. They are not part of the active Supabase CLI migration flow anymore.
