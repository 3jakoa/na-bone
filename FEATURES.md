# BoniBuddy — Feature Roadmap

Tracking the multi-phase refactor. Implement phases in order; check off as we go.

## Stack decisions
- **Mobile rewrite:** React Native via **Expo** (managed workflow). Reuse Supabase JS SDK directly.
- **Landing page:** Plain **React + Vite** (separate package, e.g. `landing/`). Public posts feed page included.
- **OAuth provider:** **Google** only (via Supabase Auth `signInWithOAuth`).
- **Auth note:** Passwords are already stored — Supabase Auth manages hashed credentials in `auth.users`. **No password migration needed.** The user's assumption was incorrect; documenting here so we don't redo this analysis.
- **"Posts" = `bones` table.** Currently bones are tied to a `match_id` and only visible to the matched pair. We are introducing a *public* mode where a bone can be discovered by anyone (no match required).

---

## Phase 1 — Public/Private bones (posts) ✅
- [x] DB migration `supabase/migrations/20260408_public_bones.sql` (visibility col, check constraint, RLS, anon read, RPC)
- [x] `match_id` already nullable; constraint enforces public ↔ no match
- [x] RLS updated: public bones readable by any authenticated user + anon; private bones unchanged
- [x] TS types updated (`BoneRow.visibility`)
- [x] `ChatView` private bone insert sets `visibility: "private"`
- [x] `/feed` route lists open public bones, with `CreatePublicBoneButton`
- [x] `RespondButton` calls `respond_to_public_bone` RPC → auto-creates match → routes to `/matches/[id]`
- [x] `BottomNav` gets a Feed link

## Phase 2 — Google OAuth2 ✅
- [x] `docs/OAUTH_SETUP.md` documents Supabase + Google Cloud setup
- [x] `GoogleSignInButton` component added to `/auth/login` and `/auth/signup`
- [x] `/auth/callback/route.ts` handles code exchange + student-domain check + smart redirect (onboarding vs discover)
- [x] OAuth users without a profile row land on `/onboarding`, which inserts the profile
- [x] Non-student emails get signed out → `/auth/login?error=not_student` (shown via `useSearchParams`)

## Phase 3 — React landing page (`landing/`) ✅
- [x] Vite + React + TS scaffold (`landing/package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`)
- [x] Tailwind config with brand colors + Open Sans
- [x] `Home.tsx` marketing page (hero, features, CTAs)
- [x] `Posts.tsx` lists public bones via `@supabase/supabase-js` anon read (RLS policy added in Phase 1 migration)
- [x] `.env.example` + `README.md`

## Phase 4 — Expo rewrite (`mobile/`) ✅ (scaffold)
- [x] Expo + expo-router + NativeWind project (`mobile/package.json`, `app.json`, `babel.config.js`, `tailwind.config.js`)
- [x] Supabase client with `expo-secure-store` adapter (`lib/supabase.ts`)
- [x] Google OAuth via `expo-auth-session` / `expo-web-browser` + student-domain check (`lib/auth.ts`)
- [x] Screens: `index` (gate), `auth/login`, `auth/signup`, `onboarding` (incl. photo upload), `(tabs)/discover|feed|matches|profile`, `matches/[id]` chat with realtime + active bone banner
- [x] Feed calls the same `respond_to_public_bone` RPC and routes to chat
- [x] `README.md` lists known gaps (swipe gestures, face validation, push, polish)

---

## Out of scope / explicitly not doing
- Password storage migration — already handled by Supabase Auth.
- Other OAuth providers (Apple, GitHub, etc.) — Google only for now.
- Code sharing between web and mobile (separate codebases; only Supabase types could be shared later if needed).
