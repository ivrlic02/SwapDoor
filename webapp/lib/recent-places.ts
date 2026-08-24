// The last few destinations someone searched, for the "Where" panel.
//
// **localStorage, not sessionStorage** — and that is the opposite call from
// lib/explore-query.ts, deliberately. That file parks a whole *filter set*, and
// its comment gives the reason it expires with the tab: a week-old combination
// of dates, price and amenities resurfacing would be a surprise rather than a
// convenience. A destination is not that. It is one short fact about where you
// keep looking, it is the thing every booking site remembers, and re-typing it
// every session is recall where recognition would do (Nielsen #7).
//
// Nothing here leaves the browser: no account, no sync, no server. Every read
// and write is wrapped, because a private window, cleared site data or a
// browser set to block storage throws on access rather than returning null —
// and a search bar that crashes because it could not remember a city would be a
// far worse bug than not remembering it.

import type { PlaceFilter } from "@/lib/place-filter";

const KEY = "swapdoor:recent-places";
const LIMIT = 5;

export type RecentPlace = PlaceFilter;

function read(): RecentPlace[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Written by an older version, or by hand — keep only well-formed rows.
    return parsed
      .filter(
        (p): p is RecentPlace =>
          !!p && typeof p === "object" && typeof (p as RecentPlace).text === "string"
      )
      .map((p) => ({
        text: p.text,
        city: typeof p.city === "string" ? p.city : "",
        country: typeof p.country === "string" ? p.country : "",
        countryCode: typeof p.countryCode === "string" ? p.countryCode : "",
      }))
      .filter((p) => p.text.trim() !== "")
      .slice(0, LIMIT);
  } catch {
    return [];
  }
}

// ── The store ───────────────────────────────────────────────────────────────
// Exposed as a `useSyncExternalStore` source rather than as "read it in an
// effect and setState", which is the same call components/back-to-results.tsx
// made for the remembered Explore query — and for the same reason. Reading
// storage during render would not match the HTML the server sent; reading it in
// an effect is a synchronous setState inside an effect, which this project has
// already removed once (the `usePresence` fix on 2026-08-18) and whose lint
// rule is what keeps the codebase at zero errors.
//
// The snapshot has to be referentially stable or `useSyncExternalStore` spins:
// it is re-parsed only when the raw string actually changes.

const NONE: RecentPlace[] = [];

let cachedRaw: string | null | undefined;
let cached: RecentPlace[] = NONE;
const listeners = new Set<() => void>();

function rawValue(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function emit() {
  // Force the next snapshot to re-parse, then wake every subscriber.
  cachedRaw = undefined;
  for (const l of listeners) l();
}

/** Subscribe for `useSyncExternalStore`. Also follows writes in another tab. */
export function subscribeRecentPlaces(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function getRecentPlaces(): RecentPlace[] {
  const raw = rawValue();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = read();
    if (cached.length === 0) cached = NONE;
  }
  return cached;
}

/** The server has no storage, and the value must be the same object each call. */
export function getRecentPlacesServer(): RecentPlace[] {
  return NONE;
}

/** Most recent first, de-duplicated on the label, capped at five. */
export function rememberPlace(place: RecentPlace): void {
  if (typeof window === "undefined") return;
  const label = place.text.trim();
  if (!label) return;
  const next = [
    { ...place, text: label },
    ...read().filter((p) => p.text.toLowerCase() !== label.toLowerCase()),
  ].slice(0, LIMIT);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Quota, or storage disabled. Nothing is remembered; nothing breaks.
  }
  emit();
}

export function clearRecentPlaces(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Already unavailable — the list renders empty either way.
  }
  emit();
}
