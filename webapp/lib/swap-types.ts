// Pure, client-safe swap types + the small formatting helpers both sides need —
// no server imports, so Client Components (the swap panel, the thread, the
// badge) can use them without dragging in lib/swaps.ts's server-only Supabase
// client. Same split as lib/house-types.ts vs lib/houses.ts.

export type SwapStatus = "pending" | "accepted" | "declined" | "cancelled";

/** The viewer's side of a request: are you the one being asked, or the asker? */
export type SwapRole = "incoming" | "sent";

/** A participant, built from the public `profiles` table — no private fields. */
export type SwapParty = {
  id: string;
  name: string;
  avatarUrl: string | null;
  location: string | null;
};

/** Just enough of a listing to identify it in an inbox row. */
export type SwapHome = {
  id: number;
  name: string;
  location: string;
  country: string;
  image: string;
};

export type SwapRequest = {
  id: number;
  status: SwapStatus;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  /** The note written when the request was sent (frozen afterwards). */
  message: string | null;
  createdAt: string;
  updatedAt: string;
  /** The home being asked for. */
  house: SwapHome;
  /** The home the requester offered back, when they have one to offer. */
  offeredHouse: SwapHome | null;
  host: SwapParty;
  guest: SwapParty;
  role: SwapRole;
  /** The other person, from the viewer's side — who an inbox row is "with". */
  counterpart: SwapParty;
  /** Messages that arrived since the viewer last opened this thread. */
  unread: number;
  lastMessageAt: string | null;
};

export type SwapMessage = {
  id: number;
  senderId: string;
  body: string;
  createdAt: string;
};

/** Which tab of /swaps a request belongs in. */
export type SwapTab = "incoming" | "sent" | "confirmed" | "past";

/** Whole days between two ISO dates. */
export function nights(checkIn: string, checkOut: string): number {
  return Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000);
}

/** Today as a local YYYY-MM-DD (not UTC), so "past" is right in every timezone. */
export function today(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

// A stay that has already happened is history regardless of how it ended, and a
// request nobody acted on is history too. Everything else is live: waiting on
// the host (incoming), waiting on the host but sent by you (sent), or agreed
// and still ahead of you (confirmed).
export function tabFor(r: SwapRequest): SwapTab {
  if (r.status === "declined" || r.status === "cancelled") return "past";
  if (r.checkOut < today()) return "past";
  if (r.status === "accepted") return "confirmed";
  return r.role === "incoming" ? "incoming" : "sent";
}

/** "Sep 26 – Oct 3, 2026" — one range, year stated once, never twice. */
export function dateRange(checkIn: string, checkOut: string): string {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const sameYear = a.getFullYear() === b.getFullYear();
  const left = a.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const right = b.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${left} – ${right}`;
}

/** "2 hours ago" / "3 days ago" — relative time, since an inbox is read by recency. */
export function timeAgo(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Status is never carried by colour alone — each one has a word and a shape, so
// it survives a grayscale check and every kind of colour-blindness (Lecture 6,
// guideline 4). `tone` names a semantic token, not a hex.
export const STATUS_META: Record<
  SwapStatus,
  { label: string; glyph: string; tone: "brand" | "success" | "muted" | "danger" }
> = {
  pending: { label: "Awaiting reply", glyph: "…", tone: "brand" },
  accepted: { label: "Accepted", glyph: "✓", tone: "success" },
  declined: { label: "Declined", glyph: "✕", tone: "muted" },
  cancelled: { label: "Withdrawn", glyph: "↩", tone: "muted" },
};
