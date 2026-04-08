# Boni Buddy — Mobile (Expo)

React Native rewrite using Expo + expo-router + NativeWind.

## Setup
```
cd mobile
npm install
cp .env.example .env
npx expo start
```

## Notes & known gaps
This is a **scaffold port** of the Next.js web app. Screens included: auth (login/signup + Google), onboarding, discover (basic swipe), feed (public bones), matches list, chat (with realtime + active bone banner), profile.

Things you will need to wire up before shipping:
- **Google OAuth** — same Supabase Google provider as web; redirect URI must include the Expo deep link `bonibuddy://auth/callback` (configured via `expo-linking` in `lib/auth.ts`). Add it in Google Cloud Console.
- **Supabase Storage** — `avatars` bucket must exist (already required by web).
- **Swipe gestures** — current `discover` screen uses tap buttons. Add `react-native-gesture-handler` + Reanimated swipe deck if you want the same UX as web.
- **Face validation** — web has `validateFace.ts` (FaceAPI/canvas). Not ported; mobile equivalent would use `expo-face-detector` or skip.
- **Push notifications** — not included; add via `expo-notifications` if needed.
- **Visual polish** — copied the web brand colors but no full design pass.

## Build
EAS:
```
npx eas build --platform ios
npx eas build --platform android
```
