"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { Destination } from "@/lib/houses";

// `when` holds the check-in ISO date and `checkout` the check-out ISO date (a
// range, Airbnb-style); `stay` holds a duration preset token ("weekend" |
// "week" | "2weeks" | "flexible"). Dates and a preset are mutually exclusive.
export type SearchValues = {
  where: string;
  when: string;
  checkout: string;
  stay: string;
  who: string;
};

// Guests start at "Any" (empty = no constraint, shows every home). The stepper
// then goes 1, 2, … — never a meaningless "0 guests".
const EMPTY: SearchValues = { where: "", when: "", checkout: "", stay: "", who: "" };

type HomeSearchCtx = {
  /** True only when a provider is mounted (i.e. on the home page). Lets the
   *  shared <Navigation> stay unchanged on every other route. */
  active: boolean;
  /** Live, controlled input values — shared by the hero bar and the nav row. */
  values: SearchValues;
  /** The last submitted search — drives the map + the "see as a list" link. */
  committed: SearchValues;
  /** Real destinations (city + swap count) for the "Where" popover. */
  destinations: Destination[];
  /** Hero search bar has scrolled out of view → dock the compact pill. */
  collapsed: boolean;
  /** The docked pill's drop-down row is open. */
  expanded: boolean;
  /** Live mode (Explore): filtering happens as you type, so `committed` is kept
   *  in sync with `values` — the nav pill then reflects the live search. */
  live: boolean;
  /** Extra controls the current page wants inside the docked drop-down (Explore
   *  passes its filter pills + budget here); null on pages without filters. */
  dockFilters: ReactNode | null;
  /** How many of those filters are active (available if a page wants a badge). */
  dockFilterCount: number;
  /** Register/replace the docked filter controls + their active count. */
  setDock: (filters: ReactNode | null, count: number) => void;
  setValues: (patch: Partial<SearchValues>) => void;
  setCollapsed: (v: boolean) => void;
  openExpanded: () => void;
  closeExpanded: () => void;
  /** Commit the current values: filter the map + smooth-scroll to it. */
  submit: () => void;
  /** Reset everything (used by the map's Clear). */
  clear: () => void;
};

const noop = () => {};

const HomeSearchContext = createContext<HomeSearchCtx>({
  active: false,
  values: EMPTY,
  committed: EMPTY,
  destinations: [],
  collapsed: false,
  expanded: false,
  live: false,
  dockFilters: null,
  dockFilterCount: 0,
  setDock: noop,
  setValues: noop,
  setCollapsed: noop,
  openExpanded: noop,
  closeExpanded: noop,
  submit: noop,
  clear: noop,
});

export function useHomeSearch() {
  return useContext(HomeSearchContext);
}

export function HomeSearchProvider({
  children,
  destinations = [],
  initialValues,
  live = false,
}: {
  children: ReactNode;
  destinations?: Destination[];
  /** Seed the bar from the URL (used on /explore so a shared link or the Hero
   *  search lands with Where/When/Who already filled). Home passes none. */
  initialValues?: Partial<SearchValues>;
  /** Explore filters live (no submit step) — keep `committed` == `values`. */
  live?: boolean;
}) {
  const seeded = initialValues ? { ...EMPTY, ...initialValues } : EMPTY;
  const [values, setValuesState] = useState<SearchValues>(seeded);
  const [committed, setCommitted] = useState<SearchValues>(seeded);
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dockFilters, setDockFilters] = useState<ReactNode | null>(null);
  const [dockFilterCount, setDockFilterCount] = useState(0);

  function setValues(patch: Partial<SearchValues>) {
    setValuesState((v) => ({ ...v, ...patch }));
    // In live mode the search applies immediately, so the "committed" search the
    // nav pill shows must track it (no Search-button step to sync them).
    if (live) setCommitted((c) => ({ ...c, ...patch }));
  }

  const setDock = useCallback((filters: ReactNode | null, count: number) => {
    setDockFilters(filters);
    setDockFilterCount(count);
  }, []);

  function submit() {
    setCommitted(values);
    setExpanded(false);
    // Wait a frame so the map has the new query before we scroll it into view.
    requestAnimationFrame(() => {
      document
        .getElementById("home-map")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function clear() {
    setValuesState(EMPTY);
    setCommitted(EMPTY);
  }

  // When the hero search scrolls back into view we're no longer collapsed, so
  // the drop-down has nowhere to live — close it too.
  function handleSetCollapsed(v: boolean) {
    setCollapsed(v);
    if (!v) setExpanded(false);
  }

  const value: HomeSearchCtx = {
    active: true,
    values,
    committed,
    destinations,
    collapsed,
    expanded,
    live,
    dockFilters,
    dockFilterCount,
    setDock,
    setValues,
    setCollapsed: handleSetCollapsed,
    openExpanded: () => setExpanded(true),
    closeExpanded: () => setExpanded(false),
    submit,
    clear,
  };

  return <HomeSearchContext.Provider value={value}>{children}</HomeSearchContext.Provider>;
}

/** "Aug 21" style short date for the compact pill; empty → falls back to label. */
export function formatWhen(when: string): string | null {
  if (!when) return null;
  const d = new Date(when);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** One label for the "When" segment/pill: a date range, a single date, or a
 *  duration preset — whichever is set (they're mutually exclusive). */
export function whenSummary(v: { when: string; checkout: string; stay: string }): string {
  if (v.when && v.checkout) return `${formatWhen(v.when)} – ${formatWhen(v.checkout)}`;
  if (v.when) return formatWhen(v.when) ?? "";
  if (v.stay) return stayLabel(v.stay) ?? "";
  return "";
}

/** Human label for a duration preset token; null if not a known preset. */
export function stayLabel(stay: string): string | null {
  switch (stay) {
    case "weekend":
      return "A weekend";
    case "week":
      return "One week";
    case "2weeks":
      return "Two weeks";
    case "month":
      return "A month+";
    case "flexible":
      return "Flexible";
    default:
      return null;
  }
}
