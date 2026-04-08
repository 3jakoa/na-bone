# Boni Buddy — Landing

Vite + React + Tailwind. Marketing home + `/posts` public bones feed.

## Setup
```
cd landing
npm install
cp .env.example .env   # fill in Supabase URL + anon key + app URL
npm run dev
```

Reads public bones via Supabase anon key. The Phase 1 migration adds an RLS policy that lets `anon` read bones where `visibility = 'public' and status = 'open'`.

## Deploy
Vercel or Netlify. Set the three env vars in the dashboard. Build command `npm run build`, output `dist/`.
