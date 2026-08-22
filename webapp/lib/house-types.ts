// Pure, client-safe house types and filter constants — no server imports here,
// so Client Components (e.g. the Explore filters) can import the runtime values
// (HOME_TYPES / AMENITIES) without pulling in lib/houses.ts's server-only
// Supabase client (which uses `next/headers`). lib/houses.ts re-exports these,
// so existing `import type { House } from "@/lib/houses"` keeps working.

export type House = {
  id: number;
  name: string;
  location: string;
  country: string;
  date: string;
  maxGuests: number;
  pricePerNight: number;
  rating: number;
  image: string;
  // Gallery photos (element 0 mirrors `image`). Always populated by enrichHouse
  // (falls back to [image]); used by the card carousel + detail-page gallery.
  images?: string[];
  description: string;
  lat?: number;
  lng?: number;
  // Derived (see enrichHouse) when the data source doesn't carry them, so the
  // Explore "Type" and "Amenities" filters have something to work on today; the
  // Supabase schema can add real columns later without any UI change.
  type?: HomeType;
  amenities?: Amenity[];
  // Availability window end (ISO date). `date` above is the window *start*
  // ("available from"), so a real duration ("A week", "A month+") can filter:
  // the window must be at least that long. Derived until Supabase adds a column.
  availableTo?: string;
  // Whether this home shows the ✓ Verified signal. It is inherited from the
  // host's own record (`Host.verified`), because trust in a home swap attaches
  // to the person you are handing keys to, not to the building. `houses.verified`
  // stays as a per-home override: NULL means "ask the host", true/false force it.
  // Until 2026-08-22 this was `seeded(house.id, 7) > 0.3` — a hash of the id.
  verified?: boolean;
  // The owning profile's id, so a page can compare it against the signed-in
  // user (the swap panel must not offer you a swap on your own home). Separate
  // from `host` below, which is the display data and may be absent.
  hostId?: string;
  // The person offering this home, joined from `profiles` via `houses.host_id`.
  // Optional: the interim gist data carries no hosts, so it's only present once
  // served from Supabase.
  host?: Host;
  // Number of guest reviews (denormalised `houses.review_count`), shown next to
  // the rating on the card + detail page. 0/undefined → no count is shown.
  reviewCount?: number;
};

// A single guest review, shown on the detail page. Author is a public profile.
export type Review = {
  id: number;
  rating: number;
  body: string;
  createdAt: string;
  author: Host | null;
};

// A listing's host, surfaced on the card + detail page so listings feel owned by
// real people (built from the public `profiles` table — no private fields).
export type Host = {
  name: string;
  location?: string;
  bio?: string;
  avatarUrl?: string;
  memberSince?: number; // year, from the profile's created_at
  // Whether this host has earned the ✓ Verified badge — read from the
  // `is_verified_host` computed column on `profiles` (supabase/trust.sql), NOT
  // decided in the app. Every home they offer inherits it.
  verified?: boolean;
  // Their track record across every home they host, so a page can say *why*
  // the badge is there rather than only that it is.
  reviewCount?: number;
  rating?: number;
};

export type HomeType = "Apartment" | "House" | "Villa" | "Cabin" | "Loft";

/** Every home type, for the Explore "Type" filter. */
export const HOME_TYPES: HomeType[] = ["Apartment", "House", "Villa", "Cabin", "Loft"];

/** Amenity filters — chosen to be persona-relevant (Alex: Workspace/Wi-Fi;
 *  Sarah: Washer/Family friendly; Mateo & Elena: Air conditioning/parking). */
export const AMENITIES = [
  "Wi-Fi",
  "Workspace",
  "Kitchen",
  "Washer",
  "Free parking",
  "Air conditioning",
  "Pool",
  "Pets allowed",
  "Family friendly",
] as const;
export type Amenity = (typeof AMENITIES)[number];
