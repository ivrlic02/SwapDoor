// What "Where" actually means, once it has been chosen.
//
// Pure and dependency-free on purpose: the search bar, the Explore grid and the
// home map all have to agree on what a destination matches, and two of them are
// components that must not pull in the Supabase browser client to ask. Same
// split as lib/house-types.ts vs lib/houses.ts — lib/places.ts re-exports
// `normalizePlaceQuery` from here so there is still exactly ONE normalisation
// rule on the site.
//
// Two problems this file exists to fix.
//
// 1. **The filter was one concatenated blob.** It read
//    `${name} ${location} ${country}`.toLowerCase().includes(query), so a query
//    containing a comma could never match: that string has no comma in it. The
//    "Where" panel prints its own rows as "Santorini, Greece" — so typing back
//    the exact words it had just shown you returned nothing at all (Nielsen #1:
//    the system must speak the user's language, and #2: the user should never
//    have to wonder whether two things mean the same). Matching is per token
//    now, so punctuation is punctuation instead of a wall, and "greece villa"
//    works for the same reason.
//
// 2. **A pick threw away everything except its label.** `onPick` stored the bare
//    city name, so by the time the results were empty nobody could say which
//    country the user had asked about — and an empty grid was the whole answer.
//    A pick now carries city + country + ISO code, which is what lets a place
//    with no homes widen to its country instead of dead-ending (see `PlaceScope`
//    below and `NoHomesHere` in explore-view.tsx).

/** A destination as the search bar committed it. */
export type PlaceFilter = {
  /** What the bar, the docked pill and the active-filter chip display. Free
   *  text when nobody picked a row — which is still a supported way to search. */
  text: string;
  /** Set only when a row was picked. "" after free typing. */
  city: string;
  country: string;
  /** ISO 3166-1 alpha-2. The country *name* is unreliable across sources —
   *  `houses.country` says "USA" where the gazetteer says "United States" — so
   *  the code is what the widening step compares on, with the name as fallback. */
  countryCode: string;
};

export const EMPTY_PLACE: PlaceFilter = { text: "", city: "", country: "", countryCode: "" };

/**
 * How far the place constraint is relaxed.
 *
 * - `exact`   — what the user actually asked for.
 * - `country` — same country, any city. The first widening step.
 * - `any`     — the place is ignored entirely; every other filter still applies.
 *
 * Explore evaluates all three and shows the narrowest one that has results, so
 * the message under an empty grid can name what it did rather than silently
 * returning something else (Nielsen #1; Lecture 3, the Gulf of Evaluation).
 */
export type PlaceScope = "exact" | "country" | "any";

/**
 * Lowercase, strip the diacritics, drop the apostrophes.
 *
 * The same normalisation runs in scripts/build-places-seed.mjs over the stored
 * `search_name`, so "Malmö", "malmo" and "MALMO" all meet in the middle. Doing
 * it here rather than in Postgres keeps the city query a plain LIKE, which the
 * trigram index can serve — `unaccent()` is not IMMUTABLE and so cannot be
 * indexed, and wrapping it would mean a function nobody would remember exists.
 */
export function normalizePlaceQuery(input: string): string {
  return input
    .replace(/[đĐ]/g, "d")
    .replace(/[øØ]/g, "o")
    .replace(/[łŁ]/g, "l")
    .replace(/ß/g, "ss")
    .replace(/[æÆ]/g, "ae")
    .replace(/[œŒ]/g, "oe")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`ʻʼ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Whether the user has asked for a place at all. */
export function isPlaceSet(p: PlaceFilter): boolean {
  return p.text.trim() !== "" || p.city !== "" || p.countryCode !== "";
}

/** True when the place carries a country, i.e. widening to it is a real step. */
export function hasCountry(p: PlaceFilter): boolean {
  return p.countryCode !== "" || p.country.trim() !== "";
}

/** What to call the country in a sentence. Falls back to the code, never to "". */
export function countryLabel(p: PlaceFilter): string {
  return p.country.trim() || p.countryCode;
}

/** The narrowest thing worth naming: the picked city, else whatever was typed. */
export function placeLabel(p: PlaceFilter): string {
  return p.city.trim() || p.text.trim();
}

/** The searchable fields of a listing. Kept structural so `House` isn't needed. */
type Listing = {
  name: string;
  location: string;
  country: string;
  countryCode?: string;
};

/**
 * Every token must appear somewhere in the listing's name/city/country.
 *
 * Split on anything that is neither a letter nor a number, so the comma in
 * "Santorini, Greece" separates two words instead of becoming part of one —
 * `normalizePlaceQuery` folds accents and case but deliberately keeps
 * punctuation, since the city table is searched with it. `\p{L}` rather than
 * `a-z`, so a name in Cyrillic or Japanese survives the split intact.
 */
function matchesText(listing: Listing, query: string): boolean {
  const tokens = normalizePlaceQuery(query)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const hay = normalizePlaceQuery(`${listing.name} ${listing.location} ${listing.country}`);
  return tokens.every((t) => hay.includes(t));
}

function matchesCountry(listing: Listing, p: PlaceFilter): boolean {
  if (p.countryCode && listing.countryCode) {
    return listing.countryCode.toUpperCase() === p.countryCode.toUpperCase();
  }
  const name = p.country.trim();
  if (!name) return false;
  return normalizePlaceQuery(listing.country) === normalizePlaceQuery(name);
}

/**
 * Does this listing satisfy the place, at the given scope?
 *
 * A picked city matches the home's own `location` **or** its free-text form —
 * the second half is deliberate: "Cape Town" is a GeoNames city, our home there
 * sits in "Camps Bay" and is *named* "Cape Town Coastal Villa", and the old
 * blob filter found it. Keeping that hit means this change only ever widens what
 * matches, never narrows it.
 */
export function placeMatches(listing: Listing, p: PlaceFilter, scope: PlaceScope): boolean {
  if (scope === "any") return true;
  if (!isPlaceSet(p)) return true;

  if (scope === "country") {
    // Free text carries no country to widen to, so this scope is the same as
    // `exact` for it — Explore then simply skips the country step.
    return hasCountry(p) ? matchesCountry(listing, p) : matchesText(listing, p.text);
  }

  // A picked city is tested on its own, without also demanding the country
  // agree. Two places of the same name in different countries is a theoretical
  // problem here; a home whose `country` is spelled differently from the
  // gazetteer's ("USA" vs "United States") is a real one, and requiring both
  // would silently drop it. The country earns its keep one scope down, where it
  // IS the test.
  if (p.city) {
    return (
      normalizePlaceQuery(listing.location) === normalizePlaceQuery(p.city) ||
      matchesText(listing, p.city)
    );
  }

  if (hasCountry(p)) return matchesCountry(listing, p);
  return matchesText(listing, p.text);
}

/** Great-circle distance in km — used to answer "near me" with a real place. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(la1) * Math.cos(la2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
