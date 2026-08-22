-- ============================================================================
-- SwapDoor — Supabase schema
-- Run this once in your Supabase project: Dashboard -> SQL Editor -> paste ->
-- Run. It creates the tables, row-level-security policies, an auto-profile
-- trigger, and seeds the 10 demo houses (same data the app used from the gist).
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- houses (public listings)
-- ---------------------------------------------------------------------------
create table if not exists public.houses (
  id              bigint primary key,
  name            text not null,
  location        text,
  country         text,
  date            text,
  max_guests      integer,
  price_per_night numeric,
  rating          numeric,
  image           text,
  description     text,
  lat             numeric,
  lng             numeric,
  created_at      timestamptz not null default now()
);

alter table public.houses enable row level security;

-- Anyone can read houses; writes are admin-only (via Supabase dashboard/service role).
drop policy if exists "Houses are viewable by everyone" on public.houses;
create policy "Houses are viewable by everyone"
  on public.houses for select
  using (true);

-- ---------------------------------------------------------------------------
-- profiles (one per auth user)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  full_name  text,
  avatar_url text,
  location   text,
  bio        text,
  created_at timestamptz not null default now()
);

-- Add the richer profile columns on projects created before they existed.
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists bio text;

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- This is a trigger-only function; it must not be callable as a PostgREST RPC.
-- Revoking EXECUTE closes the exposed /rest/v1/rpc/handle_new_user endpoint
-- without affecting the trigger (which fires regardless of caller privilege).
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- houses.host_id -> profiles (added here, once profiles exists). Demo hosts are
-- created out-of-band by supabase/seed-hosts.mjs + seed-hosts.sql (they need
-- real auth users, which can't be seeded from plain SQL).
-- ---------------------------------------------------------------------------
alter table public.houses add column if not exists host_id uuid;
alter table public.houses drop constraint if exists houses_host_id_fkey;
alter table public.houses
  add constraint houses_host_id_fkey
  foreign key (host_id) references public.profiles(id) on delete set null;

-- ---------------------------------------------------------------------------
-- saved_homes (a user's wishlist — one row per saved house)
-- ---------------------------------------------------------------------------
create table if not exists public.saved_homes (
  user_id    uuid   not null references auth.users on delete cascade,
  house_id   bigint not null references public.houses on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, house_id)
);

create index if not exists saved_homes_user_idx on public.saved_homes (user_id);

alter table public.saved_homes enable row level security;

-- Each user can only see and change their own saved rows.
drop policy if exists "Users can view their own saved homes" on public.saved_homes;
create policy "Users can view their own saved homes"
  on public.saved_homes for select
  using (auth.uid() = user_id);

drop policy if exists "Users can add their own saved homes" on public.saved_homes;
create policy "Users can add their own saved homes"
  on public.saved_homes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove their own saved homes" on public.saved_homes;
create policy "Users can remove their own saved homes"
  on public.saved_homes for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- reviews (guest reviews of a house). Seeded by supabase/seed-reviews.sql.
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  id         bigint generated always as identity primary key,
  house_id   bigint not null references public.houses on delete cascade,
  author_id  uuid references public.profiles on delete set null,
  rating     numeric not null check (rating >= 1 and rating <= 5),
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists reviews_house_idx on public.reviews (house_id);

alter table public.reviews enable row level security;

drop policy if exists "Reviews are viewable by everyone" on public.reviews;
create policy "Reviews are viewable by everyone"
  on public.reviews for select
  using (true);

drop policy if exists "Users can write their own reviews" on public.reviews;
create policy "Users can write their own reviews"
  on public.reviews for insert
  with check (auth.uid() = author_id);

drop policy if exists "Users can delete their own reviews" on public.reviews;
create policy "Users can delete their own reviews"
  on public.reviews for delete
  using (auth.uid() = author_id);

-- Denormalised review count on houses for cheap card display. Refresh with:
--   update public.houses h set review_count =
--     (select count(*) from public.reviews r where r.house_id = h.id);
alter table public.houses add column if not exists review_count integer not null default 0;

-- Gallery photos (element 0 = hero, then interiors). Seeded by
-- supabase/seed-images.sql. Falls back to [image] in the app when null.
alter table public.houses add column if not exists images text[];

-- End of the availability window (`date` is the start). Real dates per home,
-- seeded below and refreshable via supabase/seed-availability.sql. When null,
-- lib/houses.ts falls back to a seeded 4-45 day window.
alter table public.houses add column if not exists available_to text;

-- ---------------------------------------------------------------------------
-- User-created listings ("List your home")
-- ---------------------------------------------------------------------------

-- The 10 demo rows are inserted with explicit ids below, so `id` had no default
-- at all and a user-submitted listing could never insert. The sequence starts
-- above the seeded range so it can never collide with the demo data.
create sequence if not exists public.houses_id_seq as bigint start with 100 owned by public.houses.id;
select setval('public.houses_id_seq', greatest(100, (select coalesce(max(id), 0) + 1 from public.houses)), false);
alter table public.houses alter column id set default nextval('public.houses_id_seq');

-- Real `type` / `amenities` / `verified` columns. All three were derived in
-- lib/houses.ts from guests, price and keywords; someone filling in the listing
-- form states them outright, and discarding that in favour of a guess would be
-- worse. Nullable, so the seeded rows keep using the derived values (the app
-- reads `row.x ?? derive(...)`) and nothing about the existing UI changes.
alter table public.houses add column if not exists type text;
alter table public.houses add column if not exists amenities text[];
alter table public.houses add column if not exists verified boolean;

-- Public read already exists above. Writes are owner-only: you may create a
-- listing only with yourself as the host, and only touch rows you host.
drop policy if exists "Users can create their own listings" on public.houses;
create policy "Users can create their own listings"
  on public.houses for insert
  to authenticated
  with check (auth.uid() = host_id);

drop policy if exists "Hosts can update their own listings" on public.houses;
create policy "Hosts can update their own listings"
  on public.houses for update
  to authenticated
  using (auth.uid() = host_id)
  with check (auth.uid() = host_id);

drop policy if exists "Hosts can delete their own listings" on public.houses;
create policy "Hosts can delete their own listings"
  on public.houses for delete
  to authenticated
  using (auth.uid() = host_id);

create index if not exists houses_host_idx on public.houses (host_id);

-- ---------------------------------------------------------------------------
-- Storage: profile pictures + listing photos
-- ---------------------------------------------------------------------------
-- `profiles.avatar_url` has existed since the first schema, but the project had
-- no buckets, so there was nowhere to put a file and every row stayed null.
--
-- Both buckets are PUBLIC-read, so next/image can fetch the URL directly with
-- no signed-URL round trip per card, and owner-only for writes.
--
-- Path convention: <auth.uid()>/<filename>. The first folder segment IS the
-- owner's id, which is what the policies check — nobody can write into someone
-- else's folder. lib/storage.ts builds and parses these paths.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880,
   array['image/jpeg','image/png','image/webp','image/gif']),
  ('house-photos', 'house-photos', true, 10485760,
   array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read of user media" on storage.objects;
create policy "Public read of user media"
  on storage.objects for select
  using (bucket_id in ('avatars', 'house-photos'));

drop policy if exists "Users can upload their own media" on storage.objects;
create policy "Users can upload their own media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('avatars', 'house-photos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own media" on storage.objects;
create policy "Users can update their own media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('avatars', 'house-photos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own media" on storage.objects;
create policy "Users can delete their own media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('avatars', 'house-photos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Seed: demo houses
-- ---------------------------------------------------------------------------
-- Availability windows are real dates per home, each one in its own season
-- (ski in winter, aurora in the polar night, lavender in June) and of a
-- believable length. See supabase/seed-availability.sql for the rationale and
-- for refreshing them once they age into the past.
insert into public.houses
  (id, name, location, country, date, available_to, max_guests, price_per_night, rating, image, description, lat, lng)
values
  (1,  'Villa Serenity',            'Santorini',  'Greece',       '2026-09-05', '2026-09-27', 8,  450.00,  4.9, 'https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?auto=format&fit=crop&w=800&q=80', 'A stunning white-washed villa with an infinity pool overlooking the caldera.', 36.3932, 25.4615),
  (2,  'Alpine Chalet Retreat',     'Zermatt',    'Switzerland',  '2027-01-09', '2027-02-13', 10, 1200.00, 4.8, 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=800&q=80', 'Luxury ski-in/ski-out chalet with fireplace and mountain views.', 46.0207, 7.7491),
  (3,  'Tuscan Sun Farmhouse',      'Siena',      'Italy',        '2026-09-12', '2026-10-04', 12, 600.00,  4.7, 'https://images.unsplash.com/photo-1528154291023-a6dee1e14e29?auto=format&fit=crop&w=800&q=80', 'Restored stone farmhouse surrounded by vineyards and olive groves.', 43.3188, 11.3308),
  (4,  'Bali Bamboo Haven',         'Ubud',       'Indonesia',    '2026-10-03', '2026-12-06', 4,  150.00,  4.9, 'https://images.unsplash.com/photo-1537726235470-8504e3beef77?auto=format&fit=crop&w=800&q=80', 'Eco-friendly bamboo structure nestled deep in the jungle.', -8.5069, 115.2625),
  (5,  'Malibu Oceanfront Modern',  'California', 'USA',          '2026-09-26', '2026-10-05', 6,  2500.00, 5.0, 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=800&q=80', 'Sleek modern architecture with direct beach access and glass walls.', 34.0259, -118.7798),
  (6,  'Kyoto Traditional Machiya', 'Kyoto',      'Japan',        '2026-11-07', '2026-11-18', 5,  300.00,  4.8, 'https://images.unsplash.com/photo-1493936734716-77ba6da663d6?auto=format&fit=crop&w=800&q=80', 'Authentic wooden townhouse with a private zen garden.', 35.0116, 135.7681),
  (7,  'Nordic Glass Igloo',        'Rovaniemi',  'Finland',      '2026-12-05', '2027-01-17', 2,  550.00,  4.6, 'https://images.unsplash.com/photo-1518182170546-0766be6fec56?auto=format&fit=crop&w=800&q=80', 'Sleep under the Northern Lights in this thermal glass igloo.', 66.5039, 25.7294),
  (8,  'Provencal Lavender Estate', 'Provence',   'France',       '2027-06-12', '2027-07-11', 14, 900.00,  4.7, 'https://images.unsplash.com/photo-1505576508388-c71c4c9d5d85?auto=format&fit=crop&w=800&q=80', 'Historic estate in the heart of lavender fields with a private chef.', 43.9352, 6.0679),
  (9,  'Cape Town Coastal Villa',   'Camps Bay',  'South Africa', '2026-12-19', '2027-01-24', 8,  750.00,  4.8, 'https://images.unsplash.com/photo-1580587771525-78b9dba3b91d?auto=format&fit=crop&w=800&q=80', 'Contemporary villa with panoramic views of the Twelve Apostles.', -33.9500, 18.3776),
  (10, 'Rainforest Treehouse',      'Costa Rica', 'Costa Rica',   '2027-01-16', '2027-03-28', 3,  180.00,  4.9, 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80', 'Suspended high in the canopy, perfect for wildlife watching.', 10.3010, -84.8080)
on conflict (id) do nothing;
