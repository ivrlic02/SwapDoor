"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "@/components/icons";
import {
  serverThemeSnapshot,
  setTheme,
  storedTheme,
  subscribeTheme,
  syncThemeAttribute,
} from "@/lib/theme";

/*
  The appearance control. One component, three placements — the footer's bottom
  bar, the account menu and the mobile drawer — so the site can never grow two
  ways of doing the same thing (CRAP repetition; Nielsen #2).

  Why a two-segment control and not a switch or a single icon button
  ─────────────────────────────────────────────────────────────────────────────
  The obvious cheap version is a lone moon that turns into a sun. It is also
  ambiguous in a way nobody notices until they use it: a single glyph cannot say
  whether it is reporting the state you are IN or the state it will take you TO,
  and half the web picks each convention. That is recall, on a control whose
  whole job is a preference — exactly what Nielsen #7 says to replace with
  recognition, and it is why this shows both options at once with the current
  one filled. You read your setting instead of deducing it (#1, visibility of
  system status).

  It is also the shape the site already has for a binary view choice — Explore's
  List/Map toggle and the sign-in/sign-up tabs are the same filled-segment
  pattern — so a new control in the chrome reads as part of the existing system.

  Each segment carries a mark AND its word. Selection is carried by fill,
  position and `aria-pressed`, never by colour on its own (Lecture 6,
  guideline 4), and the pair survives a greyscale check.

  Why useSyncExternalStore
  ─────────────────────────────────────────────────────────────────────────────
  The server prerenders the default, so the HTML that ships always says Dark,
  while a returning visitor's first client render should say Light. The two
  obvious reconciliations are both wrong, and the wrong one is worth naming
  because it *looks* right and renders a lie: a lazy `useState` reading storage
  is a hydration mismatch, and silencing that with `suppressHydrationWarning`
  makes React keep the SERVER's DOM — so the page goes light and the control
  goes on insisting Dark is selected. Setting state in an effect is the
  `set-state-in-effect` error this project has already paid for twice.

  `useSyncExternalStore` is the API built for exactly this: it hydrates with the
  server snapshot, so the markup matches, then immediately re-renders with the
  real value. The store lives in lib/theme.ts.
*/

export function ThemeToggle({
  /** When set, the control renders as a labelled row — the shape the account
   *  menu and the mobile drawer want. Without it, just the segments. */
  label,
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const theme = useSyncExternalStore(subscribeTheme, storedTheme, serverThemeSnapshot);

  // Re-assert the attribute against React's Strict Mode remount, which in
  // development resets <html> to only the attributes React manages from JSX and
  // so wipes the one the bootstrap script set. In production it writes the value
  // that is already there. Documented at node_modules/next/dist/docs/01-app/
  // 02-guides/preventing-flash-before-hydration.md.
  //
  // It reads storage rather than `theme`, and runs on mount rather than on every
  // change, and BOTH of those are load-bearing. `theme` is the *server* snapshot
  // during the hydration render — so an effect keyed on it writes "dark" back
  // over the bootstrap's "light", flips the entire page dark for the rest of
  // that tick, and hands that dark window to anything reading the theme in its
  // own mount effect. The globe caught it and painted the dark continents onto
  // a white page; the Leaflet basemap catches it about half the time. Found by
  // sampling the canvas, not by reading this file.
  useLayoutEffect(() => {
    syncThemeAttribute(storedTheme());
  }, []);

  const segments = (
    <div className="theme-toggle flex items-center gap-0.5 rounded-full border border-border bg-bg p-1">
      <Segment
        value="light"
        active={theme === "light"}
        icon={<SunIcon className="size-4" />}
        label="Light"
      />
      <Segment
        value="dark"
        active={theme === "dark"}
        icon={<MoonIcon className="size-4" />}
        label="Dark"
      />
    </div>
  );

  if (!label) return <div className={className}>{segments}</div>;

  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <span className="text-sm text-muted">{label}</span>
      {segments}
    </div>
  );
}

/** One half of the pair. With the row's padding the control stands 44px tall —
 *  the thumb floor the mobile pass set for every target below `lg` (Fitts,
 *  Lecture 3).
 *
 *  Which half looks selected is decided by CSS, off `data-theme` — the same
 *  attribute the palette hangs off — and not by the `active` prop. React cannot
 *  do it: `useSyncExternalStore` correctly renders the SERVER snapshot during
 *  hydration, so on a light visitor's first paint React believes Dark is
 *  selected and only corrects it a tick later. That is invisible on the page
 *  (CSS had already painted it light) and glaring on this one control, which
 *  would sit there insisting Dark was on. Reading the fill from the same source
 *  as the palette means the control cannot disagree with the page it describes.
 *
 *  `active` still drives `aria-pressed`, because an attribute is not paintable.
 *  It settles one tick after hydration, which is the ordinary behaviour of every
 *  other client-state control on the site. */
function Segment({
  value,
  active,
  icon,
  label,
}: {
  value: "light" | "dark";
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => setTheme(value)}
      data-theme-option={value}
      aria-pressed={active}
      // The visible word is the accessible name for a sighted user, but "Light"
      // on its own does not say what pressing it does, so the label spells it out.
      aria-label={`${label} theme`}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted transition hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span aria-hidden>{icon}</span>
      {label}
    </button>
  );
}
