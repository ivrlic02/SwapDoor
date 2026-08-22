"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHomeSearch, whenSummary } from "@/components/home-search-context";
import { useSwapDock, type SwapPillData } from "@/components/swap-dock-context";
import { SearchFields, SearchGlyph } from "@/components/search-fields";
import { buttonClass } from "@/components/button";
import { UserMenu } from "@/components/user-menu";
import { MobileAccount } from "@/components/mobile-account";
import { useProfile } from "@/components/profile-context";
import { DoorMark } from "@/components/brand";

export function Navigation() {
  const [open, setOpen] = useState(false);
  // Which section we're in, so the nav can say so. See NavLink below.
  const pathname = usePathname();
  // Who's signed in, with their name + picture. Loaded once by ProfileProvider
  // (root layout) — the nav used to run its own getUser() call and only ever
  // learned the email, which is why it could never show a name or an avatar.
  const { profile } = useProfile();
  const signedIn = !!profile;
  // "List Your Home" is shown in BOTH states. It used to sit in the signed-out
  // branch only, so the moment you actually had an account — the one state where
  // you can really list a home — the button vanished.
  const listHref = signedIn ? "/list-your-home" : "/sign-in?next=/list-your-home";

  // The nav's centre slot is a dock. Two kinds of page fill it, and they are
  // mutually exclusive by construction — the search provider is mounted on the
  // home page and Explore, the swap dock only on a listing page, never both:
  //
  //   "search" — the hero/Explore search bar scrolled away; dock its pill, and
  //              on Explore carry the filter controls into the drop-down too.
  //   "swap"   — a listing page's swap panel scrolled away; dock its pill, and
  //              let <SwapPanel> portal the same form into the drop-down.
  //
  // One set of presence/animation rules serves both, so the two pages cannot
  // drift into two different hand-off animations (CRAP repetition).
  const search = useHomeSearch();
  const swap = useSwapDock();

  const mode: "search" | "swap" | null =
    search.active && search.collapsed
      ? "search"
      : swap.active && swap.collapsed
        ? "swap"
        : null;
  const { committed, dockFilters } = search;
  const expanded = mode === "search" ? search.expanded : mode === "swap" ? swap.expanded : false;
  const openDock = mode === "swap" ? swap.openExpanded : search.openExpanded;
  const closeDock = mode === "swap" ? swap.closeExpanded : search.closeExpanded;

  const showPill = mode !== null;
  // The compact pill is only on screen while docked *and* not expanded.
  const pillDocked = showPill && !expanded;
  // Keep the pill mounted through its wipe-out so exit is animated, not instant.
  const pill = usePresence(pillDocked, 380);
  // The nav links are the pill's counterpart: they wipe in from the opposite
  // side as the pill wipes out (and vice-versa) for a continuous hand-off.
  const links = usePresence(!pillDocked, 380);
  // Keep the docked *row* mounted for its close animation. Without this,
  // scrolling back up (showPill → false) unmounts the expanded row instantly;
  // now it shrinks (grid 1fr→0fr) and fades out first. Open/closed is driven by
  // `dropOpen`; this presence only delays the unmount.
  const dropOpen = showPill && expanded;
  const dock = usePresence(showPill, 460);

  // Escape closes the docked drop-down (user control & freedom).
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDock();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, closeDock]);

  return (
    <>
      <header className="sticky top-0 z-50 bg-bg/90 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-3">
          {/* The home link. `doormark-trigger` is what opens the door on hover
              and on keyboard focus — see the `.door-mark` block in globals.css.
              The label is not optional: while the search pill is docked on a
              phone the wordmark is hidden, and the mark itself is aria-hidden,
              so without it the link would announce as nothing at all. */}
          <Link
            href="/"
            aria-label="SwapDoor — home"
            aria-current={pathname === "/" ? "page" : undefined}
            className="doormark-trigger flex items-center gap-2 text-xl font-bold shrink-0 rounded-xl md:min-w-0 md:flex-1"
          >
            <DoorMark />
            {/* Collapse the wordmark to icon-only on phones *only* while the
                search pill is docked, so the pill has room. */}
            <span className={pillDocked ? "hidden sm:inline" : ""}>SwapDoor</span>
          </Link>

          {/* Center slot. Links sit in flow; the pill overlays them so the two
              can cross-wipe during the hand-off. The pill wipes from the LEFT,
              the links from the RIGHT — opposite sides, matched directions, so
              one appears to slide in as the other slides out. */}
          {/* The centre slot is an even third of the header for the search pill,
              whose three segments are short words ("Greece", "Sep 26", "2").
              A swap pill has to fit a home NAME, so from `lg` up it is given a
              larger share — the logo and the account controls have fixed-width
              content and were only padding empty space with it. Below `lg` the
              split stays even, because at those widths the right-hand controls
              genuinely need their third. */}
          <div
            className={`relative flex h-full min-w-0 items-center justify-center px-1 ${
              mode === "swap" ? "flex-1 lg:flex-[1.7]" : "flex-1"
            }`}
          >
            {links.mounted && (
              <nav
                className={`hidden items-center gap-8 md:flex motion-safe:transition-[clip-path,opacity] motion-safe:duration-[380ms] ease-[cubic-bezier(0.76,0,0.24,1)] ${
                  links.entered
                    ? "opacity-100 [clip-path:inset(0_0_0_0)]"
                    : "opacity-0 [clip-path:inset(0_0_0_100%)]"
                }`}
              >
                <NavLink href="/explore" pathname={pathname}>Explore</NavLink>
                <NavLink href="/how-it-works" pathname={pathname}>How it Works</NavLink>
                <NavLink href="/blog" pathname={pathname}>Blog</NavLink>
              </nav>
            )}

            {pill.mounted && (
              <div className="absolute inset-0 flex items-center justify-center px-1">
                {mode === "swap" && swap.pill ? (
                  /* A listing page docks the home it is about, plus the swap you
                     have configured so far. Same shape, same wipe, same tokens
                     as the search pill — it is the same control in the same
                     slot, so it must not look like a different one. */
                  <SwapPill entered={pill.entered} onClick={openDock} data={swap.pill} />
                ) : (
                  /* Clean pill, identical on home and Explore. Clicking it drops
                     the full search — plus all filters on Explore (via
                     dockFilters below). No filters button/count crowding it. */
                  <SearchPill
                    entered={pill.entered}
                    onClick={openDock}
                    where={committed.where}
                    when={whenSummary(committed)}
                    who={
                      committed.who && Number(committed.who) > 0
                        ? `${committed.who} guest${Number(committed.who) > 1 ? "s" : ""}`
                        : ""
                    }
                  />
                )}
              </div>
            )}
          </div>

          {/* Right slot. Stable spatial mapping in both auth states: the host
              CTA sits in the same place, and the account control is ALWAYS the
              rightmost thing in the header — signed out that's "Sign In",
              signed in it's your avatar. Same arrangement Airbnb uses, so the
              corner means the same thing before and after you log in
              (Nielsen #2 consistency, Lecture 2 mapping). */}
          <div className="hidden md:flex md:flex-1 md:min-w-0 items-center justify-end gap-3 h-full">
            <Link href={listHref} className={buttonClass("secondary", "md", "shrink-0")}>
              List Your Home
            </Link>
            {signedIn ? (
              <UserMenu />
            ) : (
              <Link
                href="/sign-in"
                className="flex items-center h-full px-1 text-muted hover:text-fg transition"
              >
                Sign In
              </Link>
            )}
          </div>

          <button
            className="-m-2 p-2 text-xl text-fg shrink-0 md:hidden"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            ☰
          </button>
        </div>

        {/* Drop-down search row — only exists while the pill is docked. The
            grid 0fr→1fr reveal opens the row to its natural height (no layout
            jump), while the bar itself wipes open left→right via clip-path. */}
        {dock.mounted && (
          <div
            className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-[400ms] ease-[cubic-bezier(0.76,0,0.24,1)] ${
              dropOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden">
              <div
                className={`mx-auto ${
                  mode === "search" && dockFilters ? "max-w-5xl" : "max-w-3xl"
                } px-6 pb-4 pt-1 motion-safe:transition-[clip-path,opacity] motion-safe:duration-[450ms] ease-[cubic-bezier(0.76,0,0.24,1)] ${
                  dropOpen
                    ? "opacity-100 [clip-path:inset(0_0_0_0)]"
                    : "opacity-0 [clip-path:inset(0_100%_0_0)]"
                }`}
              >
                {mode === "swap" ? (
                  /* The listing page's own dates + guests + CTA, published by
                     <SwapPanel>. The docked form and the one in the sidebar are
                     the same component reading the same state, so they cannot
                     disagree — see swap-dock-context.tsx. */
                  swap.drop
                ) : (
                  <>
                    <SearchFields variant="compact" />
                    {/* Explore's filter pills + budget, if this page registered
                        them. Their pop-out panels are portaled to <body>, so the
                        clip-path above doesn't crop them. */}
                    {dockFilters && <div className="mt-4">{dockFilters}</div>}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Click-away backdrop for the docked search drop-down. */}
      {dropOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          aria-hidden
          onClick={closeDock}
        />
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80">
          <div className="absolute right-0 top-0 h-full w-[85%] bg-surface p-6">
            <div className="flex justify-between mb-10">
              <span className="flex items-center gap-2 font-bold">
                <DoorMark />
                SwapDoor
              </span>
              <button aria-label="Close menu" onClick={() => setOpen(false)}>✕</button>
            </div>

            <div className="flex flex-col gap-6">
              <NavLink href="/explore" pathname={pathname} onClick={() => setOpen(false)}>
                Explore
              </NavLink>
              <NavLink href="/how-it-works" pathname={pathname} onClick={() => setOpen(false)}>
                How it Works
              </NavLink>
              <NavLink href="/blog" pathname={pathname} onClick={() => setOpen(false)}>
                Blog
              </NavLink>
              <Link
                href={listHref}
                onClick={() => setOpen(false)}
                className={buttonClass("secondary", "md", "w-full")}
              >
                List Your Home
              </Link>
              {/* No dropdown on a phone — the drawer IS the menu, so the same
                  account rows render inline under an identity header. */}
              <MobileAccount onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// A nav link that knows whether it is the page you are on.
//
// Every link used to render identically on every route, so the nav answered
// "where can I go" but never "where am I" — the first question Nielsen #1 asks
// of any interface. `/blog/some-post` still counts as Blog, and "/" is matched
// exactly so it can never light up everywhere.
//
// Current is signalled twice, by colour AND by an underline, because a state
// carried by colour alone is invisible to the ~8% of men with a colour vision
// deficiency and does not survive a grayscale check (Lecture 6, guideline 4).
// `aria-current="page"` says the same thing to assistive tech.
function NavLink({
  href,
  pathname,
  children,
  onClick,
}: {
  href: string;
  pathname: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  const current = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={current ? "page" : undefined}
      className={`transition ${
        current
          ? "text-fg underline decoration-accent decoration-2 underline-offset-8"
          : "text-muted hover:text-fg"
      }`}
    >
      {children}
    </Link>
  );
}

// Keeps an element mounted through its exit transition. `entered` drives the
// enter/exit classes; after `exitMs` the element unmounts. Two rAFs ensure the
// initial (hidden) styles paint before we flip to entered, so the CSS
// transition actually runs on mount.
//
// `mounted` is *derived* rather than stored. It used to be state that an effect
// set synchronously, which is the cascading-render pattern React's lint rule
// warns about: the element mounted a render later than it needed to, and the
// hook was the project's only lint error. Whether a node belongs on screen is
// knowable during render — it is shown, or it is still playing its exit — so
// the flip is handled by React's documented "adjust state during render"
// escape hatch, and the effects below only ever call setState from a timer or
// animation-frame callback, which is what effects are for.
function usePresence(show: boolean, exitMs: number) {
  const [entered, setEntered] = useState(show);
  const [exiting, setExiting] = useState(false);
  const [prevShow, setPrevShow] = useState(show);

  if (prevShow !== show) {
    setPrevShow(show);
    // Entering: start from the hidden styles so the transition has somewhere to
    // animate from. Leaving: apply them now and keep the node mounted until the
    // transition has run.
    setEntered(false);
    setExiting(!show);
  }

  const mounted = show || exiting;

  // Enter — two frames, so the hidden styles paint before `entered` flips.
  useEffect(() => {
    if (!show) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [show]);

  // Exit — unmount once the transition has had its time.
  useEffect(() => {
    if (!exiting) return;
    const timer = setTimeout(() => setExiting(false), exitMs);
    return () => clearTimeout(timer);
  }, [exiting, exitMs]);

  return { mounted, entered };
}

// Compact, docked version of the search bar. Summarizes the active query and
// wipes in left→right when the hero bar scrolls away (wipes out right→left on
// exit). Clicking it opens the full search row. On narrow screens the "When"
// segment is hidden to fit.
function SearchPill({
  entered,
  wide = false,
  onClick,
  where,
  when,
  who,
}: {
  entered: boolean;
  wide?: boolean;
  onClick: () => void;
  where: string;
  when: string;
  who: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open search"
      aria-expanded={false}
      className={`flex w-full min-w-0 ${
        wide ? "max-w-[580px]" : "max-w-[460px]"
      } items-center gap-3 rounded-full border border-border-raised bg-surface-raised py-2 pl-6 pr-2 text-[15px] shadow-lg shadow-black/10 hover:-translate-y-0.5 hover:border-muted/50 hover:shadow-xl hover:shadow-black/25 active:translate-y-0 active:scale-[0.99] motion-safe:transition-all motion-safe:duration-[380ms] ease-[cubic-bezier(0.76,0,0.24,1)] ${
        entered
          ? "opacity-100 [clip-path:inset(0_0_0_0)]"
          : "opacity-0 [clip-path:inset(0_100%_0_0)]"
      }`}
    >
      <PillSeg icon={<PinGlyph />} value={where} label="Where" />
      <span aria-hidden className="hidden h-5 w-px shrink-0 bg-border-raised sm:block" />
      <PillSeg icon={<CalGlyph />} value={when} label="When" className="hidden sm:flex" />
      <span aria-hidden className="h-5 w-px shrink-0 bg-border-raised" />
      <PillSeg icon={<GuestGlyph />} value={who} label="Who" />
      <span className="ml-auto grid size-10 shrink-0 place-items-center rounded-full bg-brand text-white shadow-sm shadow-brand/40 transition-colors">
        <SearchGlyph />
      </span>
    </button>
  );
}

// Compact, docked version of the SWAP PANEL, for a listing page. Deliberately
// built from the same parts as SearchPill above — same rounded-full shape, same
// `surface-raised`/`border-raised` tokens, same clip-path wipe, same PillSeg
// cells — because it lands in the same slot in the same header and a user has
// no reason to read it as a different kind of object (Nielsen #2; CRAP
// repetition). What differs is only what it carries: the home you are looking
// at, one line for everything you have chosen, and the page's real CTA.
//
// TWO segments, not three. See the note on `summary` in swap-dock-context.tsx:
// three made every one of them an ellipsis.
//
// The action chip is a <span>, not a nested <button> (which would be invalid
// HTML): the whole pill is one button, and pressing it opens the drop-down
// where the actual "Propose a swap" control lives — the same one-press-to-open
// behaviour the search pill has.
function SwapPill({
  entered,
  onClick,
  data,
}: {
  entered: boolean;
  onClick: () => void;
  data: SwapPillData;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open swap options for ${data.home}`}
      aria-expanded={false}
      className={`flex w-full min-w-0 max-w-[620px] items-center gap-3 rounded-full border border-border-raised bg-surface-raised py-2 pl-5 pr-2 text-[15px] shadow-lg shadow-black/10 hover:-translate-y-0.5 hover:border-muted/50 hover:shadow-xl hover:shadow-black/25 active:translate-y-0 active:scale-[0.99] motion-safe:transition-all motion-safe:duration-[380ms] ease-[cubic-bezier(0.76,0,0.24,1)] ${
        entered
          ? "opacity-100 [clip-path:inset(0_0_0_0)]"
          : "opacity-0 [clip-path:inset(0_100%_0_0)]"
      }`}
    >
      <PillSeg icon={<HomeGlyph />} value={data.home} label="This home" />
      <span aria-hidden className="hidden h-5 w-px shrink-0 bg-border-raised lg:block" />
      <PillSeg
        icon={<CalGlyph />}
        value={data.summary}
        label="Add dates"
        className="hidden lg:flex"
      />
      <span className="ml-auto shrink-0 whitespace-nowrap rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand/40 transition-colors">
        {data.cta}
      </span>
    </button>
  );
}

// One Where/When/Who cell in the docked pill: a small icon + either the chosen
// value (emphasised) or the segment's label as a muted placeholder.
//
// NOTE: the docked pill is deliberately its own component (it is a single button
// that opens the real bar, not three popover triggers), but it is the SAME
// control to a user — so its surface, border and divider tokens must track
// `SearchFields`. They drifted apart once already, when the full bar moved to
// `surface-raised` and this did not: the search box changed colour depending on
// whether it was docked or open, on the same page (Nielsen #4, consistency).
function PillSeg({
  icon,
  value,
  label,
  className = "",
}: {
  icon: ReactNode;
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <span className={`flex min-w-0 items-center gap-1.5 ${className}`}>
      <span className="shrink-0 text-muted">{icon}</span>
      <span className={`truncate ${value ? "font-medium text-fg" : "text-muted"}`}>
        {value || label}
      </span>
    </span>
  );
}

function HomeGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9.5 21v-6h5v6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function PinGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CalGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function GuestGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

