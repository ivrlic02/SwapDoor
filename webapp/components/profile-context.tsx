"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type {
  TravelProfile,
  TravelStyle,
  TravelWith,
  TripLength,
} from "@/lib/profile-types";

// The signed-in user's own profile, loaded ONCE and shared app-wide — the same
// pattern as SavedProvider. Before this, the navbar only knew the user's email
// (`supabase.auth.getUser()`); it never read `profiles`, so it had no name and
// no picture to show. Now the nav, the profile page and the listing form all
// read from here, and an edit updates every one of them at once.

export type MyProfile = TravelProfile & {
  id: string;
  email: string;
  /** Never empty — falls back to the email's local part. */
  fullName: string;
  avatarUrl: string | null;
  location: string | null;
  bio: string | null;
  /** ISO timestamp of the profile row's creation ("Member since"). */
  createdAt: string | null;
  /** Reviews across every home this member hosts — a Verified requirement. */
  hostReviewCount: number;
  /** Average of those reviews, or null when there are none. */
  hostRating: number | null;
  /**
   * Whether they've earned the ✓ Verified badge. Read from the database's own
   * `is_verified_host` computed column (supabase/trust.sql) rather than worked
   * out here, so the badge a member sees on their profile is decided by exactly
   * the same rule as the one strangers see on their listings.
   */
  verified: boolean;
  /**
   * Whether this member may edit CMS content (`profiles.role = 'admin'`).
   *
   * Used for ONE thing: deciding whether the account menu shows the "Edit
   * content" row, so an admin has a way into /admin that is not typing the URL.
   * It is not a permission — the permission lives in the RLS policies in
   * supabase/cms.sql and in the server-side check in app/admin/layout.tsx.
   * Flipping this in devtools reveals a menu item that leads to a 404.
   */
  isAdmin: boolean;
};

type ProfileCtx = {
  /** Initial load finished (or Supabase isn't configured). */
  ready: boolean;
  /** null once ready === signed out. */
  profile: MyProfile | null;
  /** How many homes this user hosts — the "My listings" badge in the menu. */
  listingCount: number;
  /** Re-read from the database (after a save) so every consumer updates. */
  refresh: () => Promise<void>;
  /** Local-only patch, for optimistic UI before the write lands. */
  patch: (fields: Partial<MyProfile>) => void;
};

const ProfileContext = createContext<ProfileCtx>({
  ready: false,
  profile: null,
  listingCount: 0,
  refresh: async () => {},
  patch: () => {},
});

export function useProfile() {
  return useContext(ProfileContext);
}

/** A display name that is never blank: the full name, else the email local part. */
function displayName(fullName: string | null, email: string): string {
  const trimmed = (fullName ?? "").trim();
  if (trimmed) return trimmed;
  return email.split("@")[0] || "You";
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => (isSupabaseConfigured ? createClient() : null));
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [listingCount, setListingCount] = useState(0);
  const [ready, setReady] = useState(!isSupabaseConfigured);

  type Loaded = { profile: MyProfile; listingCount: number } | null;

  const load = useCallback(async (): Promise<Loaded> => {
    if (!supabase) return null;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // Both in flight together — the profile row and a count-only query (no rows
    // transferred) for the "My listings" badge.
    const [{ data }, { count }] = await Promise.all([
      supabase
        .from("profiles")
        // One string literal, not a concatenation: supabase-js infers the row
        // shape from the literal text, and splitting it across `+` collapses
        // the result type to an error object.
        .select(
          "full_name, avatar_url, location, bio, created_at, travel_with, travel_style, has_pets, smoker, typical_trip, is_verified_host, host_review_count, host_rating, role"
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("houses")
        .select("id", { count: "exact", head: true })
        .eq("host_id", user.id),
    ]);

    const email = user.email ?? "";
    return {
      profile: {
        id: user.id,
        email,
        // The signup trigger copies full_name from user metadata; older accounts
        // (or an OAuth signup without a name) can still have a null row.
        fullName: displayName(data?.full_name ?? null, email),
        avatarUrl: data?.avatar_url ?? null,
        location: data?.location ?? null,
        bio: data?.bio ?? null,
        createdAt: data?.created_at ?? null,
        // The three-state fields keep their null: "hasn't answered" has to stay
        // distinguishable from "answered no" all the way to the screen, so it
        // must not be coalesced to false here.
        travelWith: (data?.travel_with as TravelWith | null) ?? null,
        travelStyle: (data?.travel_style as TravelStyle[] | null) ?? [],
        hasPets: data?.has_pets ?? null,
        smoker: data?.smoker ?? null,
        typicalTrip: (data?.typical_trip as TripLength | null) ?? null,
        hostReviewCount: data?.host_review_count ?? 0,
        // PostgREST returns numeric as a string; null stays null, because "no
        // rating yet" is not "rated zero".
        hostRating: data?.host_rating == null ? null : Number(data.host_rating),
        verified: data?.is_verified_host ?? false,
        isAdmin: data?.role === "admin",
      },
      listingCount: count ?? 0,
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    async function sync() {
      const next = await load();
      if (!active) return;
      setProfile(next?.profile ?? null);
      setListingCount(next?.listingCount ?? 0);
      setReady(true);
    }

    sync();
    // Signing in or out must swap the navbar immediately, not on next refresh.
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      sync();
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, load]);

  const refresh = useCallback(async () => {
    const next = await load();
    setProfile(next?.profile ?? null);
    setListingCount(next?.listingCount ?? 0);
  }, [load]);

  const patch = useCallback((fields: Partial<MyProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...fields } : prev));
  }, []);

  return (
    <ProfileContext.Provider value={{ ready, profile, listingCount, refresh, patch }}>
      {children}
    </ProfileContext.Provider>
  );
}
