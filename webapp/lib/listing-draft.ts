import type { Amenity, HomeType } from "./house-types";

// A "List your home" draft, kept in the browser so a refresh, a mis-click on
// Back, or a phone that swapped tabs doesn't throw the work away.
//
// Why it matters here specifically: the form uploads photos as they're picked,
// so an abandoned form used to leave files in the `house-photos` bucket with
// nothing pointing at them. The draft keeps the URLs, so those files belong to
// something again — and "Start over" is the one place that deletes them.
//
// Everything is best-effort: private-mode Safari and a full quota both throw on
// write, and a draft is a convenience, never something the flow depends on.

export type ListingDraft = {
  v: 1;
  /** Whose draft this is — a shared computer must not restore someone else's. */
  userId: string;
  savedAt: number;
  step: number;
  name: string;
  type: HomeType;
  location: string;
  country: string;
  /** ISO code of the picked country, when it was picked rather than typed. */
  countryCode?: string | null;
  /** GeoNames id of the picked city, likewise. */
  cityId?: number | null;
  maxGuests: number;
  description: string;
  amenities: Amenity[];
  photos: string[];
  from: string;
  to: string;
  value: string;
};

const KEY = "swapdoor:listing-draft";

/** True when nothing worth restoring has been typed yet. */
export function isEmptyDraft(d: ListingDraft): boolean {
  return (
    !d.name.trim() &&
    !d.location.trim() &&
    !d.country.trim() &&
    !d.description.trim() &&
    d.photos.length === 0 &&
    !d.from &&
    !d.to &&
    !d.value
  );
}

export function loadDraft(userId: string): ListingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as ListingDraft;
    if (draft?.v !== 1 || draft.userId !== userId) return null;
    return isEmptyDraft(draft) ? null : draft;
  } catch {
    return null;
  }
}

export function saveDraft(draft: ListingDraft): void {
  if (typeof window === "undefined") return;
  try {
    // An emptied form clears the draft rather than storing a blank one, so
    // deleting everything really does mean "never mind".
    if (isEmptyDraft(draft)) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* quota or private mode — the form still works, it just won't survive a reload */
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** "2 hours ago" / "just now" — for the restored-draft notice. */
export function timeAgo(ms: number): string {
  const secs = Math.max(1, Math.round((Date.now() - ms) / 1000));
  if (secs < 90) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
