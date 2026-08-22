# Supabase setup — 5 steps to go live

> ✅ **DONE (2026-08-17).** This project is already connected to a live Supabase
> project (ref `jkxtknkrmctgecpeozvb`) — keys, schema, auth, and an MCP server are
> all set up and verified. This guide is kept for reference / redoing the setup on
> a fresh project. See the "Supabase go-live + Hosts" section in Handoff.md for the
> current state and the pre-deploy TODOs.

All the code is already written. The app currently runs on the old gist data as a
**fallback**; the moment you add real Supabase keys, it switches to the database
and turns on authentication automatically. Nothing breaks in between.

## 1. Create the project
- Go to [supabase.com](https://supabase.com) → **New project**.
- Pick a name (e.g. `swapdoor`), a strong database password, and a region close to you.

## 2. Get your keys
- In the project: **Project Settings → API**.
- Copy **Project URL** and the **anon / public** key.

## 3. Put the keys in `.env.local`
Edit [.env.local](../../.env.local) (already created, git-ignored) and replace the placeholders:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```
> On Vercel, add these same two variables under **Project → Settings → Environment Variables**.

## 4. Create the tables + seed data
- In Supabase: **SQL Editor → New query**.
- Paste the whole contents of [supabase/schema.sql](../../supabase/schema.sql) and click **Run**.
- This creates `houses` (seeded with the 10 demo homes), `profiles`, `saved_homes`
  and `reviews`, enables Row Level Security, adds a trigger that auto-creates a
  profile on signup, gives `houses.id` a sequence so members can publish their own
  listings, and creates the `avatars` + `house-photos` Storage buckets.
- Then run [supabase/swaps.sql](../../supabase/swaps.sql) the same way. It adds
  `swap_requests` + `swap_messages` (the "Propose a swap" flow and the message
  thread), their RLS policies, the validation + status-machine triggers, and the
  `my_swap_badge()` function the account badge reads.
- Then run [supabase/places.sql](../../supabase/places.sql). It adds `countries`
  and `cities` — the reference geography behind the Country → City pickers — their
  ranked search RPCs, and `houses.country_code` / `houses.city_id`. It creates the
  tables **empty**; fill them with
  `node scripts/build-places-seed.mjs supabase/seed-places.sql` and run the ~4 MB
  file it writes (250 countries, 50k cities from GeoNames). The seed is generated
  rather than committed, so re-run the script whenever you want fresher data.
- Then run [supabase/profile.sql](../../supabase/profile.sql). It adds the **Travel & swap**
  columns a member edits on `/profile` (`travel_with`, `travel_style`, `typical_trip`,
  `has_pets`, `smoker`) with their `CHECK` constraints, and the `delete_own_account()`
  RPC behind the Danger zone — a `SECURITY DEFINER` function that takes no arguments and
  derives its target from `auth.uid()`, executable by `authenticated` only.
- Then run [supabase/trust.sql](../../supabase/trust.sql). It defines what the ✓ Verified
  badge means — `is_verified_host(profiles)` plus `host_review_count` / `host_rating`,
  exposed to PostgREST as **computed columns**, so the rule lives in the database only.
  It also resets any `houses.verified = false` to NULL, since a home now inherits the
  badge from its host and NULL is what "ask the host" looks like in that column.
- Then run [supabase/reviews.sql](../../supabase/reviews.sql). It is what has to be true
  before members can write reviews: an INSERT policy that refuses a home you host,
  a unique index so nobody reviews the same home twice, the missing UPDATE policy, and
  a `SECURITY DEFINER` trigger that keeps `houses.rating` / `review_count` in step —
  they were refreshed by hand before, which stops working the moment members write.
- The demo **hosts** and their reviews/photos are separate, optional seeds:
  `seed-hosts.mjs` (creates the auth users) then `seed-hosts.sql`, plus
  `seed-reviews.sql`, `seed-images.sql` and `seed-availability.sql`.

## 5. Configure auth redirect
- **Authentication → URL Configuration**:
  - **Site URL:** `http://localhost:3000` (and later your Vercel URL).
  - **Redirect URLs:** add `http://localhost:3000/auth/callback` (and the Vercel equivalent).
- Email confirmations are on by default. For quick local testing you can turn
  **"Confirm email"** off under **Authentication → Providers → Email**.

## Then
Restart `npm run dev`. You should be able to **Sign Up**, get a session, see your
**profile picture + name in the navbar's account menu**, and all house data now
comes from Supabase. Verify by editing a row in the Supabase **Table Editor** and
refreshing `/explore`.

Running `schema.sql` also creates the two **Storage buckets** (`avatars`,
`house-photos`) with owner-only write policies. Without them, profile pictures
and listing photos have nowhere to upload to.

---

### What the code already does
- `lib/supabase/{client,server,middleware,config}.ts` — browser + server clients, session refresh, config guard. `server.ts` also exports a cookieless `createPublicClient()` for public reads (needed at build time, where `cookies()` throws).
- `proxy.ts` — keeps the session fresh and gates `/dashboard`, `/profile`, `/my-listings` and `/list-your-home`, carrying the destination through sign-in as `?next=`.
- `lib/houses.ts` — the single data layer: reads from Supabase, falls back to the gist if unconfigured or on error. Also `getSavedHouses()` and `getMyListings()`.
- `components/auth-form.tsx` — real email/password auth UI; honours `?next=` (same-origin paths only).
- `app/auth/callback/route.ts` — completes email-confirmation / OAuth sign-in.
- `components/profile-context.tsx` — loads the signed-in user's profile once, app-wide; `components/navigation.tsx` + `user-menu.tsx` render it as an avatar and account menu, reactive to auth changes.
- `components/profile-form.tsx` / `listing-form.tsx` — profile editing with avatar upload, and the 3-step "List your home" flow that inserts a `houses` row owned by the signed-in user.

### Optional next hardening
- Add Google OAuth (Supabase → Providers → Google) — the callback route already supports it.
- **Editing** an existing listing (creating and unlisting are built; editing is not).
- **Before deploying:** turn email auto-confirm **off**, and add the Vercel URL to Site URL + the redirect allow-list.

---

## 6. The CMS (added 2026-08-22)

Two more SQL files, and one row to flip. Until these are run, `/blog` and
`/how-it-works` still render — they fall back to the content committed in
`lib/cms-seed.json` — but nothing you type in `/admin` will show on the site,
and `/admin` will tell you so in an amber banner.

### 6.1 Create the tables
- **SQL Editor → New query**, paste [supabase/cms.sql](../../supabase/cms.sql), Run.
- It adds `profiles.role` (`member` | `admin`), the `public.is_admin()` helper,
  the `blog_posts` and `site_content` tables with their RLS policies (public
  reads only *published* posts; every write requires an admin), the
  `updated_at` / `published_at` triggers, and — importantly —
  `profiles_guard_role`, the trigger that stops a member from promoting
  themselves. See the dated section in Handoff.md for why that trigger is not
  optional.

### 6.2 Load the starting content
- Paste [supabase/seed-cms.sql](../../supabase/seed-cms.sql) and Run.
- 5 blog posts and the 4 How-it-Works sections. Safe to re-run (posts upsert on
  `slug`, sections on `key`).
- It is a **generated** file. To change the seed, edit
  [lib/cms-seed.json](../../lib/cms-seed.json) and run
  `node scripts/build-cms-seed.mjs`. That one JSON file is both the seed and the
  app's fallback, so the two can never disagree.

### 6.3 Make yourself an admin
Nobody is an admin by default, and the guard trigger means you cannot grant it
from the app. Run this once in the SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Then sign out and back in (the role is read when your profile loads), and
**Edit content** appears in the account menu.

### 6.4 What you can edit
- `/admin` — every blog post, drafts included. Title, URL, category, byline,
  excerpt, cover, and the post body as an ordered list of blocks: paragraph,
  heading, list, image, gallery, quote, callout, YouTube video, code snippet,
  and a live card for any home on the site.
- `/admin/how-it-works` — the intro, the four steps (including which live
  product panel each one shows), the trust cards and every FAQ answer.

Changes to a post appear on `/blog` immediately and on `/blog/<slug>` within a
minute (ISR). `/how-it-works` likewise.
