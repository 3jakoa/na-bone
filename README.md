# Boni Buddy

This repo now contains the active Boni Buddy products:

- `mobile/` - Expo React Native app for iOS/Android.
- `landing/` - Vite React landing page and public boni feed.
- `supabase/` - database migrations.

The old root Next.js web app has been removed. Do not add app code at the repo root.

## Mobile development

```bash
cd mobile
npm install
npx expo start -c
```

Use Expo Go or the iOS simulator for day-to-day testing. Use EAS/TestFlight only for release builds and native behaviours such as deep links, Google OAuth edge cases, and notifications.

## Landing development

```bash
cd landing
npm install
npm run dev
```

The landing app deploys separately from `landing/`.

## Production build notes

- Mobile builds use Expo EAS from `mobile/`.
- Landing builds use Vercel/Vite from `landing/`.
- The old root Vercel/Next project should stay disabled or ignored.
