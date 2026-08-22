"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

// The listing page's counterpart to HomeSearchProvider.
//
// On the home page and on Explore, scrolling past the search bar docks a
// compact pill into the nav; clicking it drops the full bar back down. A
// listing page has no search to dock — but it does have one control that
// matters, and the same problem: the swap panel scrolls away and the page's
// only action goes with it, a couple of thousand pixels above wherever you have
// got to. So the mechanism is reused for the thing this page is actually about
// (Nielsen #2 consistency; CRAP repetition) — same sentinel, same cross-wipe,
// same drop-down, different cargo.
//
// HOW THE DROP-DOWN IS FILLED. The nav does not build the swap form: <SwapPanel>
// publishes its own controls here as a node, and the nav renders them. The form
// therefore has exactly one implementation and one piece of state, shown in two
// places — pick dates in the drop-down and the panel below already agrees,
// because they are the same component. This is the same arrangement Explore
// uses to put its filter pills in the nav (`dockFilters`).
//
// An earlier attempt published the nav's slot ELEMENT instead and portaled into
// it. It worked, but handing `setDropSlot` to a `ref` prop makes React's
// compiler treat this whole context object as a ref inside <Navigation>, so
// every other field read during that render became a lint error. A node has no
// such problem.

export type SwapPillData = {
  /** The home you are looking at — the pill has to say what it is about. */
  home: string;
  /**
   * Everything you have chosen so far, as ONE line: "Sep 26 – Oct 3 · 2 guests",
   * or "" while nothing is chosen.
   *
   * This was three separate segments (home / dates / guests) to mirror the
   * search pill's Where-When-Who. It read well in the abstract and terribly in
   * practice: the nav's centre slot is about a third of the header, a home name
   * is far longer than a city name, and every segment collapsed to an ellipsis
   * — "Malibu O… | A… | 2…", which is three labels saying nothing. Dates and
   * guests are one thought anyway, so they are one segment now, and the room
   * saved goes to the home name.
   */
  summary: string;
  /** The label on the pill's action chip; it must match the real CTA below. */
  cta: string;
};

type SwapDockCtx = {
  /** True only when a provider is mounted (i.e. on a listing page). */
  active: boolean;
  /** The panel has scrolled up under the nav → dock the pill. */
  collapsed: boolean;
  /** The docked pill's drop-down row is open. */
  expanded: boolean;
  pill: SwapPillData | null;
  /** The swap controls the nav renders inside the drop-down. */
  drop: ReactNode | null;
  setCollapsed: (v: boolean) => void;
  openExpanded: () => void;
  closeExpanded: () => void;
  /** Publish (or clear, with nulls) the pill summary and the drop-down body. */
  setDock: (pill: SwapPillData | null, drop: ReactNode | null) => void;
};

const noop = () => {};

const SwapDockContext = createContext<SwapDockCtx>({
  active: false,
  collapsed: false,
  expanded: false,
  pill: null,
  drop: null,
  setCollapsed: noop,
  openExpanded: noop,
  closeExpanded: noop,
  setDock: noop,
});

export function useSwapDock() {
  return useContext(SwapDockContext);
}

export function SwapDockProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [pill, setPillState] = useState<SwapPillData | null>(null);
  const [drop, setDropState] = useState<ReactNode | null>(null);

  // Stable, because <SwapPanel> calls it from an effect: a setter that changed
  // identity every render would re-fire that effect on every render.
  const setDock = useCallback((next: SwapPillData | null, node: ReactNode | null) => {
    setPillState(next);
    setDropState(node);
  }, []);

  // Scrolling back up to the panel means the drop-down has nowhere to live —
  // close it rather than leaving it floating over a page that is already
  // showing the real thing.
  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
    if (!v) setExpanded(false);
  }, []);

  const openExpanded = useCallback(() => setExpanded(true), []);
  const closeExpanded = useCallback(() => setExpanded(false), []);

  return (
    <SwapDockContext.Provider
      value={{
        active: true,
        collapsed,
        expanded,
        pill,
        drop,
        setCollapsed,
        openExpanded,
        closeExpanded,
        setDock,
      }}
    >
      {children}
    </SwapDockContext.Provider>
  );
}
