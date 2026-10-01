# Winter Arc — Cloud Edition

A light-theme, responsive 92-day Winter Arc web app with optional Supabase cloud sync.

## 1. Create a Supabase project

Create a project at https://supabase.com/.

In **SQL Editor**, paste and run `schema.sql`.

In **Authentication → Providers → Email**, enable Email/Password. You can enable Google later.

## 2. Add your public keys

Open `config.js` and replace:

- `YOUR_SUPABASE_URL`
- `YOUR_SUPABASE_ANON_KEY`

Use the project's public/anon key. Never put a service-role key in this file.

## 3. Run it

This is a static app. You can deploy the folder to Vercel, Netlify, Cloudflare Pages, GitHub Pages, or any static host.

For local development, use any static server, for example:

`python3 -m http.server 8080`

Then open `http://localhost:8080`.

## Cloud behavior

- Users can create an account and sign in.
- Progress is stored per user in Supabase.
- The app keeps local storage as an offline cache/fallback.
- On sign-in, local Day 1 data can be merged into the cloud record.
- The same account can be used on Mac, iPhone, iPad, etc.

## Before public launch

Add a privacy policy, account deletion flow, email verification/password reset, analytics consent if needed, and a proper production domain.


## Profile
The app includes a signed-in Profile page with name, gender, date of birth, height (feet/inches), weight (kg), cloud sync via Supabase, and logout. Run `profile_migration.sql` once in Supabase for existing projects before saving profile details.
