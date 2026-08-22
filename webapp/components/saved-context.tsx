"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Wishlist state shared across the whole app. Instead of every card querying
// its own saved-state (N requests), the provider loads the signed-in user's
// saved house ids ONCE and every <SaveButton> reads from here. Toggling is
// optimistic (instant UI, reverts on error) — Nielsen #1 (system speaks the
// user's language: a heart) + responsive feedback.
type SavedCtx = {
  /** Initial load finished (or Supabase not configured). */
  ready: boolean;
  signedIn: boolean;
  isSaved: (id: number) => boolean;
  /** How many homes are saved — drives the count badge in the user menu. */
  count: number;
  /** Toggle a house in the wishlist. Signed-out users are sent to sign-in. */
  toggle: (id: number) => void;
};

const SavedContext = createContext<SavedCtx>({
  ready: false,
  signedIn: false,
  isSaved: () => false,
  count: 0,
  toggle: () => {},
});

export function useSaved() {
  return useContext(SavedContext);
}

export function SavedProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  // One browser client for the provider's lifetime (shares cookies/storage).
  const [supabase] = useState(() => (isSupabaseConfigured ? createClient() : null));
  const [userId, setUserId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  // If Supabase isn't wired, the feature is inert but "ready" (never blocks UI).
  const [ready, setReady] = useState(!isSupabaseConfigured);

  // Load the current user + their saved house ids; refresh on auth changes so
  // signing in/out immediately updates every heart on the page.
  useEffect(() => {
    if (!supabase) return;
    let active = true;

    async function load(uid: string | null) {
      if (!active) return;
      setUserId(uid);
      if (!uid) {
        setSavedIds(new Set());
        setReady(true);
        return;
      }
      const { data } = await supabase!
        .from("saved_homes")
        .select("house_id")
        .eq("user_id", uid);
      if (!active) return;
      setSavedIds(new Set((data ?? []).map((r) => Number(r.house_id))));
      setReady(true);
    }

    supabase.auth.getUser().then(({ data }) => load(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session?.user?.id ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const toggle = useCallback(
    (id: number) => {
      if (!supabase) return;
      if (!userId) {
        // Not signed in → prompt sign-in, then return here (user control, #3).
        const next = encodeURIComponent(window.location.pathname);
        router.push(`/sign-in?next=${next}`);
        return;
      }

      const wasSaved = savedIds.has(id);
      // Optimistic: flip the heart now, undo only if the write fails.
      setSavedIds((prev) => {
        const nextSet = new Set(prev);
        if (wasSaved) nextSet.delete(id);
        else nextSet.add(id);
        return nextSet;
      });

      const revert = () =>
        setSavedIds((prev) => {
          const nextSet = new Set(prev);
          if (wasSaved) nextSet.add(id);
          else nextSet.delete(id);
          return nextSet;
        });

      (async () => {
        const { error } = wasSaved
          ? await supabase
              .from("saved_homes")
              .delete()
              .eq("user_id", userId)
              .eq("house_id", id)
          : await supabase.from("saved_homes").insert({ user_id: userId, house_id: id });
        if (error) revert();
      })();
    },
    [supabase, userId, savedIds, router]
  );

  const isSaved = useCallback((id: number) => savedIds.has(id), [savedIds]);

  return (
    <SavedContext.Provider
      value={{ ready, signedIn: !!userId, isSaved, count: savedIds.size, toggle }}
    >
      {children}
    </SavedContext.Provider>
  );
}
