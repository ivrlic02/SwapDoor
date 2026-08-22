import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";
import { getHouses } from "./houses";
import {
  nights,
  type SwapHome,
  type SwapMessage,
  type SwapParty,
  type SwapRequest,
  type SwapStatus,
} from "./swap-types";

export * from "./swap-types";

// Server-side data layer for swap requests + their threads, mirroring
// lib/houses.ts: one module that owns every query, so no page or component
// writes its own. Everything here uses the cookie-based (authed) client, so RLS
// narrows each result to the signed-in participant — a request is visible to
// exactly two people, and that is enforced by the database, not by a filter we
// remembered to write.

// The embeds are named by their foreign-key constraints, because `houses` and
// `profiles` are each referenced twice from swap_requests (asked-for vs offered
// home, host vs guest) and PostgREST cannot guess which is which.
const REQUEST_SELECT = `
  id, status, check_in, check_out, guests, message, created_at, updated_at,
  host_id, guest_id, offered_house_id, house_id, guest_read_at, host_read_at,
  host:profiles!swap_requests_host_id_fkey(id, full_name, avatar_url, location),
  guest:profiles!swap_requests_guest_id_fkey(id, full_name, avatar_url, location)
`;

type ProfileEmbed = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  location: string | null;
} | null;

type RequestRow = {
  id: number;
  status: SwapStatus;
  check_in: string;
  check_out: string;
  guests: number;
  message: string | null;
  created_at: string;
  updated_at: string;
  host_id: string;
  guest_id: string;
  house_id: number;
  offered_house_id: number | null;
  guest_read_at: string | null;
  host_read_at: string | null;
  host: ProfileEmbed;
  guest: ProfileEmbed;
};

type MessageRow = {
  id: number;
  request_id: number;
  sender_id: string;
  body: string;
  created_at: string;
};

/** A display name that is never blank — same rule as the account menu. */
function party(p: ProfileEmbed, fallbackId: string): SwapParty {
  return {
    id: p?.id ?? fallbackId,
    name: (p?.full_name ?? "").trim() || "A SwapDoor member",
    avatarUrl: p?.avatar_url ?? null,
    location: p?.location ?? null,
  };
}

// Homes are resolved through getHouses() rather than embedded in the query, so
// a swap card shows the SAME enriched listing the rest of the site does —
// repaired photo URLs, high-res masters and all (lib/houses.ts `enrichHouse`).
// Embedding houses here would have quietly reintroduced the dead Unsplash URLs
// that IMAGE_REPLACEMENTS exists to fix.
async function homeIndex(): Promise<Map<number, SwapHome>> {
  const houses = await getHouses();
  return new Map(
    houses.map((h) => [
      h.id,
      { id: h.id, name: h.name, location: h.location, country: h.country, image: h.image },
    ])
  );
}

// A listing can be deleted while a request that mentions it survives (the row is
// cascade-deleted for house_id, but offered_house_id is ON DELETE SET NULL, and
// the gist fallback may not know a house at all). Never render "undefined".
const MISSING_HOME: SwapHome = {
  id: 0,
  name: "A home that is no longer listed",
  location: "",
  country: "",
  image: "",
};

function buildRequest(
  row: RequestRow,
  viewerId: string,
  homes: Map<number, SwapHome>,
  msgs: MessageRow[]
): SwapRequest {
  const role = row.host_id === viewerId ? "incoming" : "sent";
  const host = party(row.host, row.host_id);
  const guest = party(row.guest, row.guest_id);
  const readAt = role === "incoming" ? row.host_read_at : row.guest_read_at;

  const thread = msgs.filter((m) => m.request_id === row.id);
  const unread = thread.filter(
    (m) => m.sender_id !== viewerId && (!readAt || m.created_at > readAt)
  ).length;

  return {
    id: row.id,
    status: row.status,
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights: nights(row.check_in, row.check_out),
    guests: row.guests,
    message: row.message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    house: homes.get(row.house_id) ?? MISSING_HOME,
    offeredHouse: row.offered_house_id ? homes.get(row.offered_house_id) ?? MISSING_HOME : null,
    host,
    guest,
    role,
    counterpart: role === "incoming" ? guest : host,
    unread,
    lastMessageAt: thread.length > 0 ? thread[thread.length - 1].created_at : null,
  };
}

/**
 * Every swap request the signed-in member is part of, on both sides, ordered by
 * the last thing that happened on it — an inbox is read by recency, not by when
 * a conversation started. Empty for signed-out / unconfigured.
 */
export async function getMySwaps(): Promise<SwapRequest[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("swap_requests")
    .select(REQUEST_SELECT)
    .order("updated_at", { ascending: false });
  if (error || !data || data.length === 0) return [];

  const rows = data as unknown as RequestRow[];

  // One query for every thread the user can see, instead of one per row. RLS
  // already restricts this to threads they participate in.
  const { data: msgData } = await supabase
    .from("swap_messages")
    .select("id, request_id, sender_id, body, created_at")
    .in(
      "request_id",
      rows.map((r) => r.id)
    )
    .order("created_at", { ascending: true });

  const homes = await homeIndex();
  const msgs = (msgData ?? []) as MessageRow[];

  return rows
    .map((row) => buildRequest(row, user.id, homes, msgs))
    .sort((a, b) => {
      const at = a.lastMessageAt ?? a.updatedAt;
      const bt = b.lastMessageAt ?? b.updatedAt;
      return bt.localeCompare(at);
    });
}

/**
 * One request plus its whole thread, or null when it does not exist or the
 * viewer is not one of its two participants (RLS returns nothing, which reads
 * here as "not found" — a request must not be probeable by id).
 */
export async function getSwapThread(
  id: number
): Promise<{ request: SwapRequest; messages: SwapMessage[]; viewerId: string } | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("swap_requests")
    .select(REQUEST_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const { data: msgData } = await supabase
    .from("swap_messages")
    .select("id, request_id, sender_id, body, created_at")
    .eq("request_id", id)
    .order("created_at", { ascending: true });

  const msgs = (msgData ?? []) as MessageRow[];
  const homes = await homeIndex();
  const request = buildRequest(data as unknown as RequestRow, user.id, homes, msgs);

  return {
    request,
    viewerId: user.id,
    messages: msgs.map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      body: m.body,
      createdAt: m.created_at,
    })),
  };
}

/**
 * Ids of the homes this member has an open (pending or accepted) request on, so
 * a listing page can say "you already asked" instead of offering a button that
 * the one-pending-per-home index would reject.
 */
export async function getOpenRequestHouseIds(): Promise<number[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("swap_requests")
    .select("house_id")
    .eq("guest_id", user.id)
    .in("status", ["pending", "accepted"]);

  return (data ?? []).map((r) => Number(r.house_id));
}
