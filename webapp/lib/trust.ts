// What the ✓ Verified badge means, in the one place the app explains it.
//
// The badge itself is decided by `public.is_verified_host` in
// supabase/trust.sql — the database is the authority, and every surface that
// draws a badge reads that computed column. This module exists for the other
// half: telling a member who is *not* verified yet what is still missing, which
// needs the individual thresholds, not just the yes/no.
//
// ⚠ THRESHOLDS ARE DUPLICATED between here and supabase/trust.sql. They are
// four numbers, they change together, and the alternative (a round trip to ask
// the database what its own constants are) buys nothing. The split is safe in
// one direction only: if these ever drift, the badge stays correct and the
// checklist becomes wrong, never the other way round.

import type { MyProfile } from "@/components/profile-context";

export const THRESHOLDS = {
  /** How long someone has to have been a member. */
  memberDays: 90,
  /** Reviews across every home they host. */
  reviews: 3,
  /** Average rating across those reviews. */
  rating: 4.5,
} as const;

/** Everything the checklist needs, whatever the caller loaded it from. */
export type TrustInput = {
  createdAt: string | null;
  bio: string | null;
  location: string | null;
  hostReviewCount: number;
  hostRating: number | null;
};

export type TrustItem = {
  /** The requirement, stated as a fact about the member. */
  label: string;
  /** Where they actually stand — shown whether or not it's met. */
  detail: string;
  done: boolean;
  /** Anchor on /profile for the thing that fixes it, when they can fix it. */
  target?: string;
};

/** Whole days since an ISO timestamp, or null if there isn't one. */
function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}

/**
 * The four requirements, each with where this member actually stands.
 *
 * Two of them (bio, location) are things they can fix right now, so they carry
 * an anchor. The other two are earned over time and by other people — there is
 * no button for "get more reviews", and pretending otherwise would be worse
 * than saying plainly that it takes time.
 */
export function trustChecklist(p: TrustInput): {
  items: TrustItem[];
  metCount: number;
  /** True when every requirement is met — mirrors is_verified_host. */
  verified: boolean;
} {
  const days = daysSince(p.createdAt);
  const daysLeft = days === null ? null : Math.max(0, THRESHOLDS.memberDays - days);

  const items: TrustItem[] = [
    {
      label: `Member for ${THRESHOLDS.memberDays} days`,
      detail:
        days === null
          ? "We don't have a join date for this account."
          : daysLeft === 0
            ? `You've been here ${days} days.`
            : `You've been here ${days} day${days === 1 ? "" : "s"} — ${daysLeft} to go.`,
      done: days !== null && days >= THRESHOLDS.memberDays,
    },
    {
      label: "A bio hosts can read",
      detail: p.bio?.trim() ? "Written." : "Still empty.",
      done: Boolean(p.bio?.trim()),
      target: "bio",
    },
    {
      label: "Where you live",
      detail: p.location?.trim() ? p.location.trim() : "Not set.",
      done: Boolean(p.location?.trim()),
      target: "location",
    },
    {
      label: `At least ${THRESHOLDS.reviews} reviews`,
      detail:
        p.hostReviewCount === 0
          ? "No guest has reviewed a home you host yet."
          : `${p.hostReviewCount} review${p.hostReviewCount === 1 ? "" : "s"} so far.`,
      done: p.hostReviewCount >= THRESHOLDS.reviews,
    },
    {
      label: `Average rating ${THRESHOLDS.rating.toFixed(1)} or better`,
      detail:
        p.hostRating === null
          ? "Nothing to average yet."
          : `Yours is ${p.hostRating.toFixed(2)}.`,
      done: p.hostRating !== null && p.hostRating >= THRESHOLDS.rating,
    },
  ];

  const metCount = items.filter((i) => i.done).length;
  return { items, metCount, verified: metCount === items.length };
}

/** Convenience for the profile page, which holds a MyProfile. */
export function trustFromProfile(p: MyProfile): TrustInput {
  return {
    createdAt: p.createdAt,
    bio: p.bio,
    location: p.location,
    hostReviewCount: p.hostReviewCount,
    hostRating: p.hostRating,
  };
}
