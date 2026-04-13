# Google OAuth setup

Manual steps required once per environment.

## 1. Google Cloud
1. https://console.cloud.google.com → create/select project
2. APIs & Services → OAuth consent screen → External, fill required fields
3. Credentials → Create credentials → OAuth client ID → Web application
4. Authorized redirect URI:
   `https://<your-supabase-project>.supabase.co/auth/v1/callback`
5. Copy Client ID + Client secret

## 2. Supabase
1. Dashboard → Authentication → Providers → Google → Enable
2. Paste Client ID + secret, save
3. Authentication → URL Configuration → add your site URLs:
   - `http://localhost:3000/auth/callback` (dev)
   - `https://<prod-domain>/auth/callback` (prod)

## 3. Notes
- Student-domain restriction is enforced post-OAuth in `src/app/auth/callback/route.ts`. Non-student emails are signed out and redirected to `/auth/login?error=not_student`.
- New OAuth users have no `profiles` row until they complete `/onboarding`.
