// The theme mechanism, in one file. No React, no "use client" — the root
// layout (a Server Component) imports the bootstrap script from here, and
// <ThemeToggle> imports the setter, so there is exactly one definition of the
// storage key, the default and the event.
//
// How it works, end to end:
//   1. app/layout.tsx renders <html data-theme="dark">, so the prerendered HTML
//      is valid on its own and the site still works with JavaScript off.
//   2. THEME_BOOTSTRAP runs in <head>, synchronously, while the browser is
//      still parsing — before anything is painted — and rewrites the attribute
//      if the visitor has chosen otherwise. That ordering is the whole point:
//      an effect (even useLayoutEffect) runs after hydration, so on a slow
//      connection the browser paints the server's theme first and the page
//      flashes. See node_modules/next/dist/docs/01-app/02-guides/preventing-
//      flash-before-hydration.md, which is where this pattern comes from.
//   3. app/globals.css keys the whole palette off that one attribute.
//   4. setTheme() rewrites it, persists it, and fires THEME_EVENT for the two
//      things CSS cannot reach — the Leaflet basemap and the globe canvas.

export type Theme = "dark" | "light";

/** The site's default, and what the prerendered HTML says. */
export const DEFAULT_THEME: Theme = "dark";

export const THEME_STORAGE_KEY = "swapdoor-theme";

/**
 * Fired on `window` after the theme changes. It exists for the two surfaces
 * that are drawn by JavaScript rather than by CSS and therefore cannot follow a
 * custom property on their own: the Leaflet tile layers (components/map-basemap)
 * and the hero globe's canvas (components/globe.tsx).
 *
 * A DOM event rather than a React context on purpose. All three maps are
 * `next/dynamic({ ssr: false })` leaves that already own imperative Leaflet
 * objects, and the globe is a `useEffect` that runs its own animation loop —
 * none of them re-render on state, so a context would have bought a provider,
 * three more subscriptions and no fewer effects.
 */
export const THEME_EVENT = "swapdoor:themechange";

/**
 * The bootstrap, as source text for the inline <script> in the document head.
 *
 * Deliberately tiny and defensive: `localStorage` throws outright in a Safari
 * private window and in some embedded webviews, so the whole thing sits in a
 * try/catch and a failure simply leaves the server's `data-theme` alone. It
 * only ever writes "light" — the default is already on the element, so there is
 * nothing to do in the common case.
 */
export const THEME_BOOTSTRAP = `(function(){try{if(localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)})==="light")document.documentElement.setAttribute("data-theme","light")}catch(e){}})()`;

/**
 * The stored preference, or the default — the SAME question the bootstrap above
 * answers, so the two can never disagree.
 *
 * Storage, and not the `data-theme` attribute, is the source of truth here.
 * That looks like a distinction without a difference and is not: React's Strict
 * Mode remount in development resets <html> to only the attributes React
 * manages from JSX, so for one render the attribute says "dark" while the
 * member's saved answer says "light" — and anything reading the attribute would
 * conclude the theme had changed and write that back over their choice.
 */
export function storedTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/**
 * Subscription half of the `useSyncExternalStore` source <ThemeToggle> reads.
 *
 * Why a store and not `useState`: the server prerenders the default, so the
 * button that ships in the HTML always says Dark, while a returning visitor's
 * first client render should say Light. Every other way of reconciling that is
 * wrong in a specific way — a lazy `useState` initialiser reading storage is a
 * hydration mismatch (and `suppressHydrationWarning` "fixes" it by keeping the
 * *server's* stale DOM, which is the opposite of what is wanted here), and
 * setting state in an effect is the `set-state-in-effect` lint error this
 * project has already paid for twice. `useSyncExternalStore` is the one API
 * that is built for it: it hydrates with `getServerSnapshot`, so the markup
 * matches exactly, then re-renders with the real value. It is also the call
 * components/back-to-results.tsx and lib/recent-places.ts already make, for the
 * same reason.
 *
 * It listens for two things. THEME_EVENT is this tab's own switch. `storage`
 * fires only in OTHER tabs, so a member with the site open twice sees both
 * follow — and since that tab's <html> was never touched, the handler applies
 * the attribute and re-broadcasts locally so its maps and globe follow too.
 */
export function subscribeTheme(onChange: () => void): () => void {
  const local = () => onChange();
  const cross = (e: StorageEvent) => {
    if (e.key !== null && e.key !== THEME_STORAGE_KEY) return;
    syncThemeAttribute(storedTheme());
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: storedTheme() }));
    onChange();
  };
  window.addEventListener(THEME_EVENT, local);
  window.addEventListener("storage", cross);
  return () => {
    window.removeEventListener(THEME_EVENT, local);
    window.removeEventListener("storage", cross);
  };
}

/** The snapshot React hydrates with: whatever the server rendered. */
export function serverThemeSnapshot(): Theme {
  return DEFAULT_THEME;
}

/**
 * Puts the attribute back on <html> without touching storage or firing the
 * event. Only the dev remount described above needs this; in production it
 * writes the value that is already there.
 */
export function syncThemeAttribute(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

/**
 * Applies a theme: the attribute first (so the repaint happens immediately),
 * then the persistence, then the notification. Storage is best-effort for the
 * same reason as above — a browser that refuses to remember the choice should
 * still honour it for this visit rather than throwing on the click.
 */
export function setTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* private mode, or storage disabled — the choice still applies to this page */
  }
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}
