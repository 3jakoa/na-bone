# Boni Buddy Codex Guide

## Active Areas

- `mobile/` - Expo React Native app (`expo-router`) for auth, onboarding, discover/swipe, matches, chat, invites, and deep links. Use the existing commands in `mobile/package.json` and `mobile/README.md`: `npm run start`, `npm run android`, `npm run ios`, or `npx expo start -c` when local Expo cache reset is needed.
- `landing/` - Vite React landing page, including public/invite entry points. Use `npm run dev` and `npm run build`.
- `supabase/` - SQL migrations, RLS, RPCs, triggers, and business logic.
- Root - docs and shared repo config only. Do not add new production app code at the repo root.

## Bug-Fix Approach

- For complex or ambiguous bugs, inspect the affected flow first and make a short plan before coding.
- Keep fixes minimal, targeted, and root-cause oriented. Do not do broad refactors unless explicitly requested.
- Treat auth, onboarding, discover/swipe, match creation, chat, public/private meal invites, and landing-to-app invite links as critical flows.
- If auth, authorization, invite tokens, or sensitive business rules are involved, prefer enforcing the fix in Supabase SQL/RPC/RLS/triggers where appropriate, not only in client code.
- Validate the affected flow and 1 nearby regression path before calling the task done.

## Validation Policy

- Default first step: reproduce and validate in the local dev setup for the touched area.
- Mobile local validation usually means `cd mobile && npm install && npx expo start -c`, plus `npm run android` or `npm run ios` when simulator/native runtime behavior matters.
- Landing local validation usually means `cd landing && npm install && npm run dev`, then `npm run build` for TypeScript/build validation.
- Run existing lint, typecheck, and relevant tests when available. This repo currently does not expose dedicated lint/test scripts in `mobile/` or `landing/`, so do not invent new scripts for a bug-fix task.
- Local Expo/dev validation is usually enough for UI bugs, screen state bugs, navigation bugs, form validation, loading/empty/error states, and non-native chat UI issues.
- Require `mobile/eas.json` preview/internal build and/or real-device verification for OAuth, deep links, push notifications, permissions, camera/photo library flows, release-only crashes, Android-only or iOS-only issues, and anything involving native config.
- If a task touches invite links, OAuth, notifications, auth redirects, or Android release notification behavior, do not mark it fully done based only on simulator/local validation.

## Repo-Specific Do Nots

- Only treat `mobile/`, `landing/`, and `supabase/` as active implementation areas unless the task explicitly requires otherwise.
- Do not move important authorization or business rules into client-only code.
- Do not casually change OAuth redirect behavior, deep-link routing, the `bonibuddy` scheme, invite token flows, or Supabase policies/triggers.
- Do not assume Android notification fixes are complete without considering `mobile/android/app/google-services.json` and EAS/FCM credentials.
- Do not add new tooling or scripts just to validate a bug fix when the repo does not already use them.

## Required Bug-Fix Output

After each bug-fix task, report:

- Root cause
- Files changed
- What was validated locally
- What still requires preview build / real-device verification
- Any risks or follow-ups
