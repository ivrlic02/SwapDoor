import { coordsFor } from "./coordinates";

// Turns a city + country typed into the listing form into map coordinates.
//
// Why this exists: the maps on the home page, Explore and the listing page all
// drop any home whose lat/lng is null (they filter, so nothing crashes — the
// home simply never appears). A listing someone just published being invisible
// on the map would be a silent failure, so we try to resolve it at submit time.
//
// Two steps, cheapest first:
//   1. lib/coordinates.ts — the table the demo listings already use, instant
//      and offline for the cities it knows.
//   2. OpenStreetMap's Nominatim — free and key-less, for everywhere else.
//
// Both are best-effort. If the lookup fails, times out, or returns nothing, the
// listing is still created with null coordinates: a home missing from the map
// is a much smaller problem than a submission that refuses to go through.
export type Coords = { lat: number; lng: number };

const TIMEOUT_MS = 5000;

export async function geocode(location: string, country: string): Promise<Coords | null> {
  const known = coordsFor(location.trim(), country.trim());
  if (known) return known;

  const query = [location.trim(), country.trim()].filter(Boolean).join(", ");
  if (!query) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;

    const results = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    const hit = results[0];
    if (!hit?.lat || !hit?.lon) return null;

    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch {
    // Offline, blocked, aborted or malformed — fall through to "no coordinates".
    return null;
  }
}
