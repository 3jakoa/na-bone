# Google OAuth setup

Manual steps required once per environment.

## Google Cloud

1. Open Google Cloud Console.
2. Go to APIs & Services -> OAuth consent screen.
3. Use External user type.
4. Go to Credentials -> Create credentials -> OAuth client ID.
5. Use Web application.
6. Add this Authorized redirect URI:

```text
https://jvuswsihdessgsdnxvwn.supabase.co/auth/v1/callback
```

## Supabase

1. Go to Authentication -> Providers -> Google.
2. Enable Google.
3. Paste the Google Client ID and Client secret.
4. Go to Authentication -> URL Configuration.
5. Set Site URL to:

```text
https://bonibuddy.app
```

6. Add Redirect URLs:

```text
bonibuddy://auth/callback
bonibuddy:///auth/callback
bonibuddy://auth/reset-password
bonibuddy:///auth/reset-password
https://bonibuddy.app
https://bonibuddy.app/*
```

## Notes

- Mobile OAuth is handled in `mobile/lib/auth.ts`.
- Password reset is handled in `mobile/app/auth/forgot-password.tsx` and `mobile/app/auth/reset-password.tsx`.
- Google OAuth should be tested on both Expo Go/dev and TestFlight because native deep-link behaviour can differ.
