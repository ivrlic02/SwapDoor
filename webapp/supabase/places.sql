-- SwapDoor — reference geography for the Country / City pickers.
--
-- Run this after schema.sql and swaps.sql, then load the data with:
--
--     node scripts/build-places-seed.mjs supabase/seed-places.sql
--
-- and run the file it writes. The seed is ~4 MB (250 countries, ~50k cities
-- from GeoNames), which is why it is generated on demand rather than committed:
-- the script is the source of record, not the SQL it produces.
--
-- ── Why these tables exist ──────────────────────────────────────────────────
-- The listing form's City and Country fields used to read from two hand-typed
-- arrays in lib/places.ts: 45 cities and 57 countries. Two things were wrong
-- with that. A host listing a home in Rijeka, Graz or anywhere else off the
-- list got no help at all, so "pick one, or type your own" was in practice just
-- "type your own" — recall rather than recognition (Nielsen #7), which is the
-- one thing the picker existed to avoid. And the two fields knew nothing about
-- each other: picking a city filled in the country, but picking a country did
-- nothing to the city list, so "Kyoto, Croatia" was a publishable address.
--
-- Country now leads and City is scoped to it, which makes the impossible pair
-- unreachable instead of merely discouraged — a constraint, not a warning
-- (Lecture 2).
--
-- The second payoff is on the map. Every city row carries GeoNames'
-- coordinates, so a picked city *is* its coordinates: lib/geocode.ts's
-- OpenStreetMap round-trip (debounced 800ms for Nominatim's one-request-a-second
-- policy, and silently null whenever it failed) is now only needed for a place
-- somebody typed freehand.

create extension if not exists pg_trgm with schema extensions;

-- ── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.countries (
  code        text primary key,             -- ISO 3166-1 alpha-2
  name        text not null,
  -- Lowercased, unaccented ASCII, plus the aliases people actually type ("usa",
  -- "holland", "hrvatska"). Queries are normalised the same way in JS
  -- (normalizePlaceQuery in lib/places.ts), so searching never needs Postgres's
  -- unaccent at query time — which matters, because unaccent() is not IMMUTABLE
  -- and therefore cannot back the trigram index below.
  search_name text not null,
  emoji       text not null,                -- flag, from the regional-indicator pair
  continent   text,
  lat         numeric,                      -- population-weighted centroid of its cities
  lng         numeric,
  city_count  integer not null default 0
);

create table if not exists public.cities (
  id           bigint primary key,          -- GeoNames id
  country_code text not null references public.countries(code) on delete cascade,
  name         text not null,
  search_name  text not null,
  admin1       text,                        -- region / state, to tell duplicates apart
  lat          numeric not null,
  lng          numeric not null,
  population   integer not null default 0
);

create index if not exists cities_country_pop_idx    on public.cities (country_code, population desc);
create index if not exists cities_search_trgm_idx    on public.cities using gin (search_name gin_trgm_ops);
create index if not exists countries_search_trgm_idx on public.countries using gin (search_name gin_trgm_ops);
create index if not exists countries_city_count_idx  on public.countries (city_count desc);

-- Reference data: everyone reads, nobody writes. No insert/update/delete policy
-- exists, so RLS denies those to anon and authenticated alike; the seed runs as
-- the table owner, which bypasses RLS.
alter table public.countries enable row level security;
alter table public.cities    enable row level security;

drop policy if exists "countries are public" on public.countries;
create policy "countries are public" on public.countries for select using (true);

drop policy if exists "cities are public" on public.cities;
create policy "cities are public" on public.cities for select using (true);

-- ── Search ──────────────────────────────────────────────────────────────────
-- Ranking is the point: a prefix match beats a match found anywhere in the
-- string, and inside each tier the bigger place wins. So "san" offers San
-- Francisco before Sandnes, and an empty query offers a country's largest
-- cities rather than whichever rows the planner reached first.

create or replace function public.search_countries(q text default '', lim integer default 8)
returns table (code text, name text, emoji text, city_count integer, lat numeric, lng numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select c.code, c.name, c.emoji, c.city_count, c.lat, c.lng
  from public.countries c
  where coalesce(q, '') = ''
     or c.search_name like coalesce(q, '') || '%'
     or c.search_name like '%' || coalesce(q, '') || '%'
  order by
    case when c.search_name like coalesce(q, '') || '%' then 0 else 1 end,
    c.city_count desc,
    c.name
  limit least(greatest(coalesce(lim, 8), 1), 50);
$$;

create or replace function public.search_cities(country text, q text default '', lim integer default 8)
returns table (id bigint, name text, admin1 text, lat numeric, lng numeric, population integer)
language sql
stable
security invoker
set search_path = public
as $$
  select c.id, c.name, c.admin1, c.lat, c.lng, c.population
  from public.cities c
  where c.country_code = upper(country)
    and (coalesce(q, '') = ''
         or c.search_name like coalesce(q, '') || '%'
         or c.search_name like '%' || coalesce(q, '') || '%')
  order by
    case when c.search_name like coalesce(q, '') || '%' then 0 else 1 end,
    c.population desc,
    c.name
  limit least(greatest(coalesce(lim, 8), 1), 50);
$$;

-- A city search that is *not* scoped to a country — what the site-wide "Where"
-- box needs, since nobody picks a country before typing "Split".
create or replace function public.search_cities_global(q text default '', lim integer default 8)
returns table (id bigint, name text, admin1 text, country_code text, country_name text,
               emoji text, lat numeric, lng numeric, population integer)
language sql
stable
security invoker
set search_path = public
as $$
  select c.id, c.name, c.admin1, c.country_code, co.name, co.emoji,
         c.lat, c.lng, c.population
  from public.cities c
  join public.countries co on co.code = c.country_code
  where coalesce(q, '') <> ''
    and (c.search_name like q || '%' or c.search_name like '%' || q || '%')
  order by
    case when c.search_name like q || '%' then 0 else 1 end,
    c.population desc,
    c.name
  limit least(greatest(coalesce(lim, 8), 1), 50);
$$;

grant execute on function public.search_countries(text, integer)      to anon, authenticated;
grant execute on function public.search_cities(text, text, integer)   to anon, authenticated;
grant execute on function public.search_cities_global(text, integer)  to anon, authenticated;

-- ── Listings link to the reference data ─────────────────────────────────────
-- `houses.location` / `houses.country` stay: they are what every card, map
-- popup and page renders, and a home in a hamlet no gazetteer lists must still
-- be publishable. These two columns are the structured *addition*, so counting
-- "how many homes in Croatia" stops being a string comparison against whatever
-- the host happened to type — "USA", "United States" and "US" are three answers
-- to the same question in the seeded rows.
--
-- Both are null whenever the place was typed rather than picked. A wrong link
-- would be worse than no link: a home filed under the wrong country would be
-- found by people who cannot travel to it.

alter table public.houses
  add column if not exists country_code text references public.countries(code),
  add column if not exists city_id      bigint references public.cities(id);

create index if not exists houses_country_code_idx on public.houses (country_code);
create index if not exists houses_city_id_idx      on public.houses (city_id);

-- Backfill for rows that predate the columns.
with alias(typed, code) as (
  values ('usa','US'), ('us','US'), ('united states of america','US'),
         ('uk','GB'), ('united kingdom','GB'), ('great britain','GB'),
         ('netherlands','NL'), ('holland','NL'), ('turkiye','TR'),
         ('south korea','KR'), ('russia','RU'), ('turkey','TR'), ('czech republic','CZ'),
         ('uae','AE'), ('vietnam','VN'), ('bolivia','BO'), ('venezuela','VE')
)
update public.houses h
set country_code = coalesce(
  (select a.code from alias a where a.typed = lower(btrim(h.country))),
  -- Prefix, not equality: search_name leads with the name people type and then
  -- carries the official form and the aliases, so the Netherlands is stored as
  -- "netherlands the netherlands holland" and an exact match would miss it.
  (select c.code from public.countries c where c.search_name like lower(btrim(h.country)) || '%')
)
where h.country is not null and h.country_code is null;

-- City is best-effort by design: "California", "Provence" and "Costa Rica" are
-- a state, a region and a country sitting in a column called `location`, so
-- they resolve to nothing and stay null rather than being forced onto a point
-- that isn't theirs.
update public.houses h
set city_id = (
  select c.id
  from public.cities c
  where c.country_code = h.country_code
    and (c.search_name = lower(btrim(h.location))
         or c.search_name like lower(btrim(h.location)) || ' %')
  order by c.population desc
  limit 1
)
where h.country_code is not null and h.city_id is null and h.location is not null;
