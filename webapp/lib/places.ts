"use client";

// Country and city lookup, backed by the `countries` and `cities` tables in
// Supabase (250 countries, ~50k cities — see scripts/build-places-seed.mjs).
//
// What this replaces: two hardcoded arrays, 45 cities and 57 countries, typed
// into this file by hand. They were fine as a starting point but wrong in two
// ways that mattered. A member listing a home in Rijeka, Graz or anywhere else
// off the list got no help at all, so "pick one, or type your own" was mostly
// "type your own" — recall, not recognition (Nielsen #7), which is exactly what
// the picker existed to avoid. And the two fields knew nothing about each
// other: picking a city filled the country, but picking Croatia did nothing to
// the city list, so it was still possible to publish "Kyoto, Croatia".
//
// Now Country comes first and City is scoped to it, which makes the impossible
// combination unreachable rather than merely discouraged (constraints, Lecture
// 2 — the physical kind, not a warning message).
//
// The other half of the payoff is on the map. Every city row carries the
// coordinates GeoNames has for it, so a picked city *is* its coordinates:
// lib/geocode.ts's OpenStreetMap round-trip (debounced 800ms for Nominatim's
// rate limit, and silently null whenever it failed) is now only needed for a
// place someone typed freehand.

import { normalizePlaceQuery } from "@/lib/place-filter";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type Country = {
  code: string;
  name: string;
  emoji: string;
  cityCount: number;
  lat: number | null;
  lng: number | null;
};

export type City = {
  id: number;
  name: string;
  /** Region or state — what tells two Springfields apart. */
  admin1: string | null;
  lat: number;
  lng: number;
  population: number;
};

export type GlobalCity = City & {
  countryCode: string;
  countryName: string;
  emoji: string;
};

// The normalisation rule lives in lib/place-filter.ts, which is pure — the
// Explore grid and the home map need the same folding to match a destination
// and must not pull this file's Supabase client in to get it. Re-exported here
// so every existing `import { normalizePlaceQuery } from "@/lib/places"` keeps
// working and there is still exactly one rule (same split as house-types.ts).
export { normalizePlaceQuery } from "@/lib/place-filter";

// A tiny in-memory cache. The country list barely changes within a session and
// the same few city queries get retyped constantly (backspace one letter and
// the previous query comes straight back), so this removes most of the
// round-trips without any staleness worth worrying about — this is reference
// data, not the user's own.
const cache = new Map<string, unknown>();

async function cached<T>(key: string, run: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit !== undefined) return hit as T;
  const value = await run();
  // Bounded, so a long session of typing can't grow it without limit.
  if (cache.size > 200) cache.clear();
  cache.set(key, value);
  return value;
}

/** Countries matching `query`; the largest ones first when it's empty. */
export async function searchCountries(query: string, limit = 8): Promise<Country[]> {
  if (!isSupabaseConfigured) return [];
  const q = normalizePlaceQuery(query);

  return cached(`co:${q}:${limit}`, async () => {
    const { data, error } = await createClient().rpc("search_countries", { q, lim: limit });
    if (error || !data) return [];
    return (data as RawCountry[]).map(toCountry);
  });
}

/**
 * One country, by ISO code or by the name already stored on a listing.
 *
 * Both, because a draft and a published listing carry different things: a draft
 * saved after this change knows the code, while every row published before it
 * only has the country *name* its host typed. Re-opening either has to land on
 * the same country, or editing a home would silently clear its city.
 */
export async function findCountry(codeOrName: string): Promise<Country | null> {
  if (!isSupabaseConfigured || !codeOrName.trim()) return null;
  const raw = codeOrName.trim();

  return cached(`c1:${raw.toLowerCase()}`, async () => {
    const query = createClient().from("countries").select("code,name,emoji,city_count,lat,lng");
    const { data } =
      raw.length === 2
        ? await query.eq("code", raw.toUpperCase()).maybeSingle()
        : await query.eq("search_name", normalizePlaceQuery(raw)).limit(1).maybeSingle();

    if (!data) {
      // A name the seed spells differently ("Türkiye" for "Turkey", "USA" for
      // "United States") still has to resolve, and search_countries already
      // carries every alias.
      const [first] = raw.length === 2 ? [] : await searchCountries(raw, 1);
      return first ?? null;
    }
    return toCountry(data as RawCountry);
  });
}

/** Cities inside one country; its largest first when the query is empty. */
export async function searchCities(
  countryCode: string,
  query: string,
  limit = 8
): Promise<City[]> {
  if (!isSupabaseConfigured || !countryCode) return [];
  const q = normalizePlaceQuery(query);

  return cached(`ci:${countryCode}:${q}:${limit}`, async () => {
    const { data, error } = await createClient().rpc("search_cities", {
      country: countryCode,
      q,
      lim: limit,
    });
    if (error || !data) return [];
    return (data as RawCity[]).map(toCity);
  });
}

/**
 * Cities anywhere, with their country attached — what the site-wide "Where"
 * box needs, since nobody picks a country before typing "Split".
 */
export async function searchCitiesGlobal(query: string, limit = 8): Promise<GlobalCity[]> {
  if (!isSupabaseConfigured) return [];
  const q = normalizePlaceQuery(query);
  if (!q) return [];

  return cached(`gl:${q}:${limit}`, async () => {
    const { data, error } = await createClient().rpc("search_cities_global", { q, lim: limit });
    if (error || !data) return [];
    return (data as (RawCity & RawGlobalExtras)[]).map((row) => ({
      ...toCity(row),
      countryCode: row.country_code,
      countryName: row.country_name,
      emoji: row.emoji,
    }));
  });
}

// The RPCs return Postgres `numeric`, which supabase-js hands over as a string
// so no precision is lost on the wire. Every consumer wants a number.
type RawCountry = {
  code: string;
  name: string;
  emoji: string;
  city_count: number;
  lat: string | number | null;
  lng: string | number | null;
};

type RawCity = {
  id: number;
  name: string;
  admin1: string | null;
  lat: string | number;
  lng: string | number;
  population: number;
};

type RawGlobalExtras = { country_code: string; country_name: string; emoji: string };

const toCountry = (row: RawCountry): Country => ({
  code: row.code,
  name: row.name,
  emoji: row.emoji,
  cityCount: row.city_count,
  lat: row.lat === null ? null : Number(row.lat),
  lng: row.lng === null ? null : Number(row.lng),
});

const toCity = (row: RawCity): City => ({
  id: Number(row.id),
  name: row.name,
  admin1: row.admin1,
  lat: Number(row.lat),
  lng: Number(row.lng),
  population: row.population,
});

/** "Split, Split-Dalmatia" — the region only when it isn't just the city again. */
export function cityLabel(city: City): string {
  return city.admin1 && normalizePlaceQuery(city.admin1) !== normalizePlaceQuery(city.name)
    ? `${city.name}, ${city.admin1}`
    : city.name;
}
