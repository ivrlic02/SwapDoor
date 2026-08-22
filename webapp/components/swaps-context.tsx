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

// How many swaps are waiting on you: requests you have not answered, plus
// messages that arrived since you last opened their thread.
//
// There is no `notifications` table behind this. The number is DERIVED, by the
// `my_swap_badge()` function in supabase/swaps.sql, from the rows that already
// exist — which means it can never drift out of sync with reality the way a
// stored counter does (answer a request in one tab and the badge is correct in
// the other, with no bookkeeping to get wrong). The trade is that it costs a
// query; at one call per page load, per signed-in user, that is the right side
// of the trade.
//
// Loaded ONCE and shared app-wide, the same pattern as ProfileProvider and
// SavedProvider, so the nav, the account menu and the mobile drawer all read
// one number instead of each running their own count.

type SwapsCtx = {
  /** Initial load finished (or Supabase isn't configured). */
  ready: boolean;
  /** Requests awaiting your answer + unread messages. 0 when signed out. */
  count: number;
  /** Re-read the count (after answering a request or opening a thread). */
  refresh: () => Promise<void>;
};

const SwapsContext = createContext<SwapsCtx>({
  ready: false,
  count: 0,
  refresh: async () => {},
});

export function useSwaps() {
  return useContext(SwapsContext);
}

export function SwapsProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => (isSupabaseConfigured ? createClient() : null));
  const [count, setCount] = useState(0);
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [userId, setUserId] = useState<string | null>(null);

  const read = useCallback(
    async (uid: string | null) => {
      if (!supabase || !uid) {
        setCount(0);
        setReady(true);
        return;
      }
      const { data, error } = await supabase.rpc("my_swap_badge");
      setCount(error ? 0 : Number(data ?? 0));
      setReady(true);
    },
    [supabase]
  );

  const refresh = useCallback(async () => {
    await read(userId);
  }, [read, userId]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    const load = async (uid: string | null) => {
      if (!active) return;
      setUserId(uid);
      await read(uid);
    };

    supabase.auth.getUser().then(({ data }) => load(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session?.user?.id ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, read]);

  // Coming back to the tab is the moment a stale count is most likely to be
  // noticed and most likely to matter — the other host answered while you were
  // away. Cheaper and quieter than a poll, and it costs nothing while you are
  // reading the page.
  useEffect(() => {
    if (!supabase || !userId) return;
    const onFocus = () => {
      if (document.visibilityState === "visible") read(userId);
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [supabase, userId, read]);

  return (
    <SwapsContext.Provider value={{ ready, count, refresh }}>{children}</SwapsContext.Provider>
  );
}
