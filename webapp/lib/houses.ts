import { cache } from "react";
import { isSupabaseConfigured } from "./supabase/config";
import { createClient, createPublicClient } from "./supabase/server";
import { coordsFor } from "./coordinates";
import {
  HOME_TYPES,
  AMENITIES,
  type House,
  type HomeType,
  type Amenity,
  type Host,
  type Review,
} from "./house-types";

// Re-exported so existing imports (`import { House } from "@/lib/houses"`) keep
// working. Client Components should import these from "@/lib/house-types"
// directly to avoid bundling this server-only module.
export { HOME_TYPES, AMENITIES };
export type { House, HomeType, Amenity, Host, Review };

// Columns selected for each house, including the embedded host (joined from
// `profiles` via the houses_host_id_fkey relation). Kept in one place so the
// list and single-house queries stay in sync.
const HOUSE_SELECT =
  "*, host:profiles!houses_host_id_fkey(full_name, avatar_url, location, bio, created_at, is_verified_host, host_review_count, host_rating)";

// Some of the interim gist's Unsplash photos were removed upstream and now
// 404, which breaks both <img> and next/image (LCP + PageSpeed). Map those
// dead photo IDs to verified-working, location-appropriate replacements so
// every listing shows an image. Remove once the data source carries valid URLs.
const IMAGE_REPLACEMENTS: Record<string, string> = {
  "photo-1528154291023-a6dee1e14e29": "photo-1523217582562-09d0def993a6", // Siena / Tuscany
  "photo-1493936734716-77ba6da663d6": "photo-1490806843957-31f4c9a91c65", // Kyoto
  "photo-1518182170546-0766be6fec56": "photo-1483347756197-71ef80e95f73", // Rovaniemi / aurora
  "photo-1505576508388-c71c4c9d5d85": "photo-1499002238440-d264edd596ec", // Provence / lavender
  "photo-1580587771525-78b9dba3b91d": "photo-1564013799919-ab600027ffc6", // Cape Town / villa
};

// Unsplash serves whatever size the URL asks for, and every seeded photo asked
// for `w=800`. next/image never upscales past its source, so that 800px file was
// being stretched across the ~1000px detail hero (2x that on a retina screen) —
// which is exactly why the photos looked soft and grainy. Ask for one big master
// instead and let the optimizer resize it DOWN per device: cards still get a
// small file, the hero and lightbox finally get a sharp one.
const UNSPLASH_MASTER = "auto=format&fit=crop&w=2400&q=80";

function highRes(url: string): string {
  if (!url.includes("images.unsplash.com")) return url;
  return `${url.split("?")[0]}?${UNSPLASH_MASTER}`;
}

function fixImage(url: string): string {
  for (const [dead, live] of Object.entries(IMAGE_REPLACEMENTS)) {
    if (url.includes(dead)) return highRes(url.replace(dead, live));
  }
  return highRes(url);
}

// Words in a listing's name/description that read more like a cabin than a flat.
const CABIN_HINTS = ["cabin", "chalet", "cottage", "lodge", "aurora", "mountain", "forest", "ski"];

// Infer a plausible home type from the fields the data already has, so the
// "Type" filter is meaningful without new data. Order matters (first match wins).
function deriveType(house: House): HomeType {
  const text = `${house.name} ${house.description}`.toLowerCase();
  if (CABIN_HINTS.some((w) => text.includes(w))) return "Cabin";
  if (house.maxGuests >= 8) return "Villa";
  if (house.maxGuests >= 5) return "House";
  if (house.pricePerNight <= 130) return "Loft";
  return "Apartment";
}

// Deterministic 0..1 from a house id + salt. Stable across SSR and client (same
// input → same output), so seeded amenities never cause a hydration mismatch and
// don't flicker between renders. A demo-data stand-in until real amenity columns.
function seeded(id: number, salt: number): number {
  const x = Math.sin(id * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function deriveAmenities(house: House, type: HomeType): Amenity[] {
  const out: Amenity[] = ["Wi-Fi", "Kitchen"]; // baseline every home carries
  if (seeded(house.id, 1) > 0.45) out.push("Workspace");
  if (seeded(house.id, 2) > 0.5) out.push("Washer");
  if (seeded(house.id, 3) > 0.5) out.push("Free parking");
  if (seeded(house.id, 4) > 0.4) out.push("Air conditioning");
  if (seeded(house.id, 5) > 0.6) out.push("Pets allowed");
  if (type === "Villa" || house.pricePerNight >= 300) out.push("Pool");
  if (house.maxGuests >= 4) out.push("Family friendly");
  return out;
}

// Availability window END, derived from the "available from" `date` + a seeded
// span of 4..45 days, so duration presets actually filter (a 4-day window can't
// satisfy "A month+"). Falls back to the start date if `date` is unparseable.
function deriveAvailableTo(house: House): string {
  const from = new Date(house.date);
  if (Number.isNaN(from.getTime())) return house.date;
  const span = 4 + Math.floor(seeded(house.id, 6) * 42); // 4..45 days
  const to = new Date(from);
  to.setDate(to.getDate() + span);
  return to.toISOString().slice(0, 10);
}

// Fill in map coordinates (own lat/lng wins, else the known-locations table),
// repair any dead listing image, and derive a type + amenities when the source
// doesn't provide them.
function enrichHouse(house: House): House {
  const image = fixImage(house.image);
  const type = house.type ?? deriveType(house);
  const amenities = house.amenities ?? deriveAmenities(house, type);
  const availableTo = house.availableTo ?? deriveAvailableTo(house);
  // The badge is inherited from the host, never invented here. Until
  // 2026-08-22 this line read `house.verified ?? deriveVerified(house)`, where
  // deriveVerified was a hash of the listing's id — a ✓ that touched no fact
  // about anyone. `houses.verified` survives as a per-home override: NULL (the
  // normal case) falls through to the host's own record, which the database
  // computes in `is_verified_host` (supabase/trust.sql).
  //
  // `??` and not `||`, so an explicit `false` override still wins over a
  // verified host. The gist fallback carries no hosts, so homes served from it
  // are simply unverified — correct, since there is nobody to vouch for them.
  const verified = house.verified ?? Boolean(house.host?.verified);
  // Gallery: repair any dead photo URLs; fall back to the single hero when the
  // source carries none (the gist path), so the carousel always has ≥1 image.
  const source = house.images && house.images.length > 0 ? house.images : [image];
  const images = source.map(fixImage);
  const base: House = { ...house, image, images, type, amenities, availableTo, verified };
  if (typeof house.lat === "number" && typeof house.lng === "number") {
    return base;
  }
  const c = coordsFor(house.location, house.country);
  return c ? { ...base, lat: c.lat, lng: c.lng } : base;
}

// Interim data source, used until Supabase is configured (and as a fallback
// if a Supabase query fails). Once `isSupabaseConfigured` is true, houses come
// from the database instead.
const GIST_URL =
  "https://gist.githubusercontent.com/ivrlic02/bd1d69cb1921220a341a099770b952cf/raw/6103bd76c57779026487390bc0712724d35f6903/data.json";

async function fetchHousesFromGist(): Promise<House[]> {
  // ISR: cache the demo data and revalidate hourly instead of re-downloading
  // the whole gist on every render (`no-store` was the main source of slow
  // loads). Near-instant after the first request; still refreshes each hour.
  const res = await fetch(GIST_URL, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error("Failed to fetch houses");
  const data = await res.json();
  return (data.houses as House[]).map(enrichHouse);
}

// Embedded host row (from the profiles join). All fields are public columns.
type HostRow = {
  full_name: string | null;
  avatar_url: string | null;
  location: string | null;
  bio: string | null;
  created_at: string | null;
  // Computed columns on `profiles` (supabase/trust.sql), not stored fields.
  // PostgREST exposes a function taking the row type as if it were a column,
  // so the rule that decides the badge lives in exactly one place.
  is_verified_host?: boolean | null;
  host_review_count?: number | null;
  host_rating?: number | string | null;
};

// Database rows use snake_case; the app uses camelCase.
type HouseRow = {
  id: number;
  name: string;
  location: string;
  country: string;
  // Backfilled for all 14 rows (supabase/places.sql). Optional in the type
  // because the gist fallback has no such field.
  country_code?: string | null;
  date: string;
  max_guests: number;
  price_per_night: number;
  rating: number;
  image: string;
  description: string;
  lat: number | null;
  lng: number | null;
  images?: string[] | null;
  // Optional future columns — when present they win over the derived values.
  available_to?: string | null;
  verified?: boolean | null;
  review_count?: number | null;
  // The owning profile's id. Needed on its own (not just via the embed) so a
  // page can tell whether the *viewer* is this home's host without a second
  // query — e.g. the swap panel, which must never offer you your own home.
  host_id?: string | null;
  // Embedded host (single object, or null when a house has no host_id).
  host?: HostRow | null;
};

function mapHost(host: HostRow | null | undefined): Host | undefined {
  if (!host) return undefined;
  const year = host.created_at ? new Date(host.created_at).getFullYear() : undefined;
  // `host_rating` comes back from PostgREST as a string (numeric), so it is
  // parsed here rather than at each call site.
  const rating = host.host_rating == null ? undefined : Number(host.host_rating);

  return {
    name: host.full_name ?? "SwapDoor host",
    location: host.location ?? undefined,
    bio: host.bio ?? undefined,
    avatarUrl: host.avatar_url ?? undefined,
    memberSince: year && !Number.isNaN(year) ? year : undefined,
    verified: host.is_verified_host ?? undefined,
    reviewCount: host.host_review_count ?? undefined,
    rating: rating !== undefined && !Number.isNaN(rating) ? rating : undefined,
  };
}

function mapRow(row: HouseRow): House {
  return enrichHouse({
    id: row.id,
    name: row.name,
    location: row.location,
    country: row.country,
    countryCode: row.country_code ?? undefined,
    date: row.date,
    maxGuests: row.max_guests,
    pricePerNight: row.price_per_night,
    rating: row.rating,
    image: row.image,
    images: row.images ?? undefined,
    description: row.description,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    availableTo: row.available_to ?? undefined,
    verified: row.verified ?? undefined,
    reviewCount: row.review_count ?? undefined,
    hostId: row.host_id ?? undefined,
    host: mapHost(row.host),
  });
}

// One guest review joined to its author's public profile.
type ReviewRow = {
  id: number;
  rating: number;
  body: string;
  created_at: string;
  author: HostRow | null;
};

function mapReview(row: ReviewRow): Review {
  return {
    id: row.id,
    rating: Number(row.rating),
    body: row.body,
    createdAt: row.created_at,
    author: mapHost(row.author) ?? null,
  };
}

// Reviews for one house, newest first, each with its author's public profile.
export async function getReviews(houseId: number): Promise<Review[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, rating, body, created_at, author:profiles!reviews_author_id_fkey(full_name, avatar_url, location, bio, created_at)"
    )
    .eq("house_id", houseId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as ReviewRow[]).map(mapReview);
}

// A review carrying the home it was written about, so it can be shown away from
// that home's page — on the marquee it names the place *and* links to it, which
// is what separates a quotable testimonial from an anonymous compliment.
export type FeaturedReview = Review & {
  house: { id: number; name: string; location: string; country: string };
};

type FeaturedReviewRow = ReviewRow & {
  house: { id: number; name: string; location: string; country: string } | null;
};

// The best real reviews across every home, for the landing-page marquee.
//
// `rating >= 4` is a floor, not a filter that invents a reputation: the seeded
// set is all 4+ anyway, so today it excludes nothing. It exists so a future
// genuinely bad review is left on its listing (where a buyer needs it) rather
// than hoisted onto the marketing page, without ever silently *hiding* it —
// the listing page still shows every review, and the aggregate the trust strip
// prints is computed from all of them.
//
// Empty is a valid answer: with no reviews the marquee renders nothing at all
// rather than a row of placeholders.
export const getFeaturedReviews = cache(async (limit = 16): Promise<FeaturedReview[]> => {
  if (!isSupabaseConfigured) return [];

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, rating, body, created_at," +
        " author:profiles!reviews_author_id_fkey(full_name, avatar_url, location, bio, created_at)," +
        " house:houses!reviews_house_id_fkey(id, name, location, country)"
    )
    .gte("rating", 4)
    .order("rating", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as unknown as FeaturedReviewRow[])
    // A review whose house row is gone (deleted listing) has nothing to point
    // at, so it is dropped rather than rendered with a dead link.
    .filter((row) => row.house !== null)
    .map((row) => ({ ...mapReview(row), house: row.house! }));
});

// Wrapped in React `cache()` so multiple callers in one render (e.g. the home
// page needs the list for the hero/map *and* topDestinations *and* Trending)
// share a single fetch instead of hitting the source repeatedly.
export const getHouses = cache(async (): Promise<House[]> => {
  if (!isSupabaseConfigured) return fetchHousesFromGist();

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("houses")
    .select(HOUSE_SELECT)
    .order("id", { ascending: true });

  if (error || !data) return fetchHousesFromGist();
  return (data as unknown as HouseRow[]).map(mapRow);
});

export type Destination = {
  city: string;
  country: string;
  /** ISO code, so a pick can widen to its country without matching on a name. */
  countryCode?: string;
  count: number;
  /** The first mapped home in this city — what "near me" measures against. */
  lat?: number;
  lng?: number;
};

// Group listings by city so the "Where" popover can suggest real destinations
// with a live count of how many homes are open to swap there.
//
// Each entry also carries the country's ISO code and a representative point.
// The code is what a pick hands to the filter (see lib/place-filter.ts); the
// point is what "Near me" measures against, so that button can answer with a
// city SwapDoor actually has homes in rather than with a radius that might
// contain none — an empty answer to "near me" reads as a broken feature
// (Nielsen #1), and this data was already loaded by the page.
export function topDestinations(houses: House[], limit = 8): Destination[] {
  const byCity = new Map<string, Destination>();
  for (const h of houses) {
    const key = `${h.location}|${h.country}`;
    const existing = byCity.get(key);
    if (existing) {
      existing.count += 1;
      // A city's first home may be the one without coordinates; take the first
      // that has them rather than the first that appears.
      if (existing.lat === undefined && typeof h.lat === "number" && typeof h.lng === "number") {
        existing.lat = h.lat;
        existing.lng = h.lng;
      }
      continue;
    }
    byCity.set(key, {
      city: h.location,
      country: h.country,
      countryCode: h.countryCode,
      count: 1,
      lat: typeof h.lat === "number" ? h.lat : undefined,
      lng: typeof h.lng === "number" ? h.lng : undefined,
    });
  }
  return [...byCity.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

export type CountryStat = { name: string; code?: string; count: number };

// Every country SwapDoor has a home in, biggest first — the "Where" panel's
// third way in, beside a typed city and a picked one.
//
// Derived from ALL houses rather than from `topDestinations`, which is capped
// at 8 for Hick's-law reasons: a list headed "Countries with homes" that quietly
// omitted some would be a worse claim than no list (Nielsen #1). `houses.country_code`
// has existed and been indexed since 2026-08-21 and until now nothing read it.
export function topCountries(houses: House[], limit = 12): CountryStat[] {
  const byCountry = new Map<string, CountryStat>();
  for (const h of houses) {
    // Key on the code when there is one so "USA" and "United States" cannot
    // split into two rows; fall back to the name for the gist path.
    const key = h.countryCode?.toUpperCase() || h.country.toLowerCase();
    const existing = byCountry.get(key);
    if (existing) existing.count += 1;
    else byCountry.set(key, { name: h.country, code: h.countryCode, count: 1 });
  }
  return [...byCountry.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

// A signed-in user's wishlist, newest-saved first. Uses the cookie-based
// (authed) client so RLS returns only this user's rows; returns empty for
// signed-out/unconfigured. Reuses getHouses() (already enriched + cached) and
// filters, so there's no duplicate row mapping.
export async function getSavedHouses(): Promise<House[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("saved_homes")
    .select("house_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  const all = await getHouses();
  const byId = new Map(all.map((h) => [h.id, h]));
  return data
    .map((r) => byId.get(Number(r.house_id)))
    .filter((h): h is House => Boolean(h));
}

// Every review guests have left on the signed-in member's own listings, newest
// first — their reputation as a host, gathered in one place.
//
// It reads reviews *of* their homes rather than reviews they have written,
// because writing one isn't possible yet: `reviews` has an owner-only INSERT
// policy but no UI behind it, so a "Reviews you've written" list could only
// ever be permanently empty. Promising a section that can never fill is the
// same hollow signal as a badge nobody earned (see the blanket "✔ verified"
// removed on 2026-08-15), so it isn't offered until reviewing is real.
export async function getMyHostReviews(): Promise<FeaturedReview[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Which homes are mine — ids only, no rows transferred.
  const { data: mine, error: mineErr } = await supabase
    .from("houses")
    .select("id")
    .eq("host_id", user.id);
  if (mineErr || !mine || mine.length === 0) return [];

  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, rating, body, created_at," +
        " author:profiles!reviews_author_id_fkey(full_name, avatar_url, location, bio, created_at)," +
        " house:houses!reviews_house_id_fkey(id, name, location, country)"
    )
    .in(
      "house_id",
      mine.map((r) => Number(r.id))
    )
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as unknown as FeaturedReviewRow[])
    .filter((row) => row.house !== null)
    .map((row) => ({ ...mapReview(row), house: row.house! }));
}

// Every review the signed-in member has written about other people's homes,
// newest first. This is the other half of getMyHostReviews(): what they said,
// rather than what was said about them.
//
// It was deliberately left unbuilt on 2026-08-22 because writing a review was
// impossible, so the list could only ever have been empty. supabase/reviews.sql
// changed that, so it is real now.
export async function getMyWrittenReviews(): Promise<FeaturedReview[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, rating, body, created_at," +
        " author:profiles!reviews_author_id_fkey(full_name, avatar_url, location, bio, created_at)," +
        " house:houses!reviews_house_id_fkey(id, name, location, country)"
    )
    .eq("author_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as unknown as FeaturedReviewRow[])
    .filter((row) => row.house !== null)
    .map((row) => ({ ...mapReview(row), house: row.house! }));
}

// The homes the signed-in user hosts, newest first. Uses the cookie-based
// (authed) client: `houses` is publicly readable, so this filters by host_id
// rather than relying on RLS to narrow it.
export async function getMyListings(): Promise<House[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("houses")
    .select(HOUSE_SELECT)
    .eq("host_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as HouseRow[]).map(mapRow);
}

// Cached like getHouses(): the detail route asks for the same house twice in one
// render (generateMetadata + the page itself), and that should be one query.
export const getHouseById = cache(async (id: number): Promise<House | null> => {
  if (!isSupabaseConfigured) {
    // Reuse the cached list instead of a second full download just to find one
    // house (this path runs when a map pin → /explore/[id] is opened).
    const houses = await getHouses();
    return houses.find((h) => h.id === id) ?? null;
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("houses")
    .select(HOUSE_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return mapRow(data as unknown as HouseRow);
});
