"use client";

import {
  Fragment,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  CLEARED_PLACE,
  placeValues,
  useHomeSearch,
  whenSummary,
} from "./home-search-context";
import { Calendar, nightsBetween, todayISO } from "./calendar";
import { ClockIcon, GlobeIcon, HomeIcon, LocateIcon } from "./icons";
import type { CountryStat, Destination } from "@/lib/houses";
import {
  distanceKm,
  EMPTY_PLACE,
  normalizePlaceQuery,
  type PlaceFilter,
} from "@/lib/place-filter";
import {
  clearRecentPlaces,
  getRecentPlaces,
  getRecentPlacesServer,
  rememberPlace,
  subscribeRecentPlaces,
} from "@/lib/recent-places";
import { searchCitiesGlobal, type GlobalCity } from "@/lib/places";

type Seg = "where" | "when" | "who";

// The "Simple & trusted" search bar: each segment is a button that opens a
// small, plain-language popover. Big targets, few choices (Hick's law), verified
// framing throughout. Shared by the hero and the nav drop-down.
export function SearchFields({ variant }: { variant: "hero" | "compact" }) {
  const { values, setValues, submit, destinations, countries } = useHomeSearch();
  const [open, setOpen] = useState<Seg | null>(null);

  const rootRef = useRef<HTMLFormElement>(null);
  const whereRef = useRef<HTMLButtonElement>(null);
  const whenRef = useRef<HTMLButtonElement>(null);
  const whoRef = useRef<HTMLButtonElement>(null);

  // Close on outside click (accounting for portaled popovers) and on Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      const t = e.target as HTMLElement;
      if (rootRef.current?.contains(t)) return;
      if (t.closest("[data-search-popover]")) return;
      setOpen(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (seg: Seg) => setOpen((cur) => (cur === seg ? null : seg));

  const whenValue = whenSummary(values);
  const whoCount = Number(values.who) || 0;
  const whoValue = whoCount > 0 ? `${whoCount} guest${whoCount > 1 ? "s" : ""}` : "";

  return (
    <form
      ref={rootRef}
      onSubmit={(e) => {
        e.preventDefault();
        setOpen(null);
        submit();
      }}
      className={[
        "flex text-left shadow-xl shadow-shade/20 transition-colors",
        // The HERO keeps its stacked-on-phones bar: it is the whole point of
        // that screen, it has the room, and three labelled rows read clearly.
        //
        // The COMPACT bar does not. On /explore it is one of four control
        // groups stacked above the results, and stacked it cost ~250px of a
        // 844px screen before a single home appeared. Below `sm` it collapses
        // to one row — icon plus value, exactly the cells the docked nav pill
        // already uses, so the same control looks the same in both places
        // (Nielsen #2; CRAP repetition). From `sm` up nothing changes.
        variant === "compact"
          ? "items-stretch gap-0 rounded-full p-1.5"
          : "flex-col gap-1 rounded-3xl p-1.5 sm:flex-row sm:items-stretch sm:gap-0 sm:rounded-full",
        // The site's primary control used to be `surface` on `bg` — 1.35:1 of
        // luminance, i.e. very nearly the page itself, held apart by a hairline
        // alone (Lecture 5: contrasted elements must be *very* different). The
        // whole lift/dim mechanic below is unchanged, just moved one step
        // lighter: the resting bar is `surface-raised`, and when a popover
        // opens the bar drops to `surface` so the active segment can rise back
        // to `surface-raised` above it.
        open
          ? "border border-border bg-surface"
          : "border border-border-raised bg-surface-raised",
        variant === "hero" ? "mx-auto mt-8 max-w-3xl lg:mt-10" : "w-full",
      ].join(" ")}
    >
      <Segment
        label="Where"
        icon={<PinGlyph />}
        value={values.where}
        placeholder="Search destinations"
        active={open === "where"}
        anyOpen={open !== null}
        compact={variant === "compact"}
        onClick={() => toggle("where")}
        buttonRef={whereRef}
      />
      {/* Dividers fade out next to the active segment so nothing touches it. */}
      <Divider compact={variant === "compact"} hidden={open === "where" || open === "when"} />
      <Segment
        label="When"
        icon={<CalendarGlyph />}
        value={whenValue}
        placeholder="Length or dates"
        active={open === "when"}
        anyOpen={open !== null}
        compact={variant === "compact"}
        onClick={() => toggle("when")}
        buttonRef={whenRef}
      />
      <Divider compact={variant === "compact"} hidden={open === "when" || open === "who"} />
      <Segment
        label="Who"
        icon={<GuestGlyph />}
        value={whoValue}
        placeholder="Any guests"
        active={open === "who"}
        anyOpen={open !== null}
        compact={variant === "compact"}
        onClick={() => toggle("who")}
        buttonRef={whoRef}
      />

      <button
        type="submit"
        aria-label="Search"
        className={[
          "inline-flex items-center justify-center gap-2 rounded-full bg-brand font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:mt-0 sm:shrink-0 sm:self-stretch sm:px-7 sm:py-3",
          variant === "compact"
            ? "size-11 shrink-0 self-center p-0 sm:size-auto sm:self-stretch"
            : "mt-1 px-6 py-3",
        ].join(" ")}
      >
        <SearchGlyph />
        <span className={variant === "compact" ? "hidden sm:inline" : undefined}>Search</span>
      </button>

      {open === "where" && (
        <Popover anchorRef={whereRef} width={400}>
          <WherePanel
            destinations={destinations}
            countries={countries}
            value={values.where}
            // Typing invalidates a previous pick: the city/country/code that
            // came with it no longer describe what is in the box, and leaving
            // them behind would widen an empty result to the wrong country.
            onType={(t) => setValues({ ...CLEARED_PLACE, where: t })}
            onPick={(place, advance = true) => {
              setValues(placeValues(place));
              // "Near me" passes false: it picked the city for you, so the
              // panel stays open long enough to say which one and why.
              if (advance) setOpen("when");
            }}
            onEnter={() => setOpen("when")}
          />
        </Popover>
      )}
      {open === "when" && (
        <Popover anchorRef={whenRef} width={380}>
          <WhenPanel
            stay={values.stay}
            when={values.when}
            checkout={values.checkout}
            onPreset={(token) => {
              setValues({ stay: token, when: "", checkout: "" });
              setOpen("who");
            }}
            onExact={(checkIn, checkOut) => {
              setValues({ when: checkIn, checkout: checkOut, stay: "" });
              // Both ends chosen → move on to guests, like Airbnb.
              if (checkIn && checkOut) setOpen("who");
            }}
          />
        </Popover>
      )}
      {open === "who" && (
        <Popover anchorRef={whoRef} width={340}>
          <WhoPanel
            count={whoCount}
            onChange={(n) => setValues({ who: n > 0 ? String(n) : "" })}
          />
        </Popover>
      )}
    </form>
  );
}

// ── Segment button ──────────────────────────────────────────────────────────
// The whole padded cell is one big target. When a popover is open the active
// cell lifts (raised surface + ring) and the others dim — the Airbnb mechanic,
// tuned for our dark theme.
function Segment({
  label,
  icon,
  value,
  placeholder,
  active,
  anyOpen,
  compact = false,
  onClick,
  buttonRef,
}: {
  label: string;
  /** Decorative glyph beside the label — the resting-state signifier. */
  icon: React.ReactNode;
  value: string;
  placeholder: string;
  active: boolean;
  anyOpen: boolean;
  /** One-row phone layout (the /explore bar). See the note on the form. */
  compact?: boolean;
  onClick: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-expanded={active}
      // The name must CONTAIN the visible text, or voice control has nothing to
      // match on: this said just "Where" while the cell reads "Where / Search
      // destinations", so "click Search destinations" hit nothing (Lighthouse
      // `label-content-name-mismatch`, all three cells). Now the name is exactly
      // what is on screen — and in the compact phone bar, where the label is
      // `display:none` and only the sub-line shows, it still leads with the
      // label, which is allowed: the rule wants the visible text contained, not
      // identical.
      aria-label={`${label} ${value || placeholder}`}
      className="group flex min-w-0 flex-1 rounded-2xl p-1 text-left sm:rounded-full"
    >
      {/* Inner chip is inset from the cell by the button's p-1, so the active
          highlight floats with breathing room and never meets the dividers. */}
      <span
        className={[
          "flex w-full min-w-0 rounded-xl transition sm:rounded-full",
          // One line on a phone in compact mode; the original two-line cell
          // everywhere else, and everywhere from `sm` up.
          compact
            ? "items-center gap-1 px-2.5 py-2.5 sm:flex-col sm:items-stretch sm:gap-0 sm:px-4 sm:py-1.5"
            : "flex-col px-4 py-1.5",
          active
            ? "bg-surface-raised shadow-xl shadow-shade/40 ring-1 ring-brand/50"
            : anyOpen
              ? "opacity-60 group-hover:opacity-100"
              // Hover LIGHTENS now. It used to darken (`bg-bg/70`), which on a
              // bar that is itself raised would read as the cell sinking away
              // from the pointer rather than responding to it.
              : "group-hover:bg-tint/[0.07]",
        ].join(" ")}
      >
        {/* The icon is the resting-state signifier. Without one these cells were
            a label over grey text with no border, no caret and no icon — they
            only announced themselves as controls on hover, which on a
            touchscreen is never (Lecture 2: an affordance nobody can perceive
            is not signified; Nielsen #6, recognition over recall). */}
        <span
          className={`flex items-center gap-1.5 text-xs font-semibold ${active ? "text-accent" : "text-muted"}`}
        >
          {/* Below 360px the three cells are ~76px each and the glyph plus its
              gap costs 19 of them, which truncated "Where" and "When" to "Wh…"
              — two different segments showing the same two letters (Nielsen #2:
              the user should never have to wonder whether two things mean the
              same). On the very narrowest phones the word wins; the raised pill
              and its blue search button still say this is a control. */}
          <span
            aria-hidden
            className={`shrink-0 ${compact ? "max-[359px]:hidden" : ""}`}
          >
            {icon}
          </span>
          {/* In the one-row phone bar the glyph carries the segment on its own
              and the label becomes the placeholder below, because there is no
              second line to put it on and ~95px per cell will not hold
              "Search destinations" beside a word. */}
          <span className={compact ? "hidden sm:inline" : undefined}>{label}</span>
        </span>{" "}
        {/* The space above is not cosmetic. axe concatenates an element's
            visible text with `join("")`, so with the two spans flush against
            each other it read this cell as "WhereSearch destinations" — a string
            no sensible accessible name can contain, which is why the name above
            still failed the mismatch rule after it was corrected. A whitespace-
            only text run between two flex items is explicitly not rendered
            (CSS Flexbox §4), so this changes the audit and nothing else. */}
        {/* Was `text-muted/70` — 4.1:1 on the bar, under the 4.5:1 AA floor for
            text this size, on the very words that tell you the field is fillable.
            Plain `muted` is 6.0:1 on the raised surface. */}
        <span
          className={`truncate ${compact ? "text-[13px] sm:text-sm" : "text-sm"} ${
            value ? "text-fg" : "text-muted"
          }`}
        >
          {compact ? (
            <>
              <span className="sm:hidden">{value || label}</span>
              <span className="hidden sm:inline">{value || placeholder}</span>
            </>
          ) : (
            value || placeholder
          )}
        </span>
      </span>
    </button>
  );
}

function Divider({ hidden = false, compact = false }: { hidden?: boolean; compact?: boolean }) {
  return (
    <div
      aria-hidden
      className={`w-px self-center bg-border-raised transition-opacity duration-200 sm:block sm:h-8 ${
        // The hero stacks below `sm`, where a vertical rule between rows would
        // be nonsense; the compact bar is a row at every width, so it keeps its
        // dividers all the way down.
        compact ? "h-6" : "hidden"
      } ${hidden ? "opacity-0" : "opacity-100"}`}
    />
  );
}

// ── Popover shell ─────────────────────────────────────────────────
// Portaled to <body> and fixed-positioned, so it escapes the nav drop-down's
// overflow/clip. Repositions on scroll/resize.
//
// TWO presentations, because one of them was broken on a phone. Anchored under
// its segment, the When panel measured 492px tall starting at y=498 on a
// 390×844 screen — it ran to y=990, and being `position: fixed` the page could
// not be scrolled to reach the rest. The whole "Or stay flexible" block (four
// duration choices) was simply unreachable on a phone: not hard to find, not
// hidden, *impossible* (Nielsen #4, and Lecture 2's visibility principle — a
// control the user cannot get to does not exist).
//
// So below `lg` the panel docks to the bottom edge instead, as a sheet with its
// own scroll and a grab handle. That is not a new pattern invented here: it is
// the same `.swap-sheet` rise the listing page's date picker already uses on
// phones, so both date pickers on the site behave identically (CRAP repetition,
// Nielsen #2). Above `lg` nothing changes — same anchored panel, same width.
const SHEET_BELOW = 1024;

function Popover({
  anchorRef,
  width,
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  width: number;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [sheet, setSheet] = useState(false);

  useLayoutEffect(() => {
    function place() {
      if (window.innerWidth < SHEET_BELOW) {
        setSheet(true);
        // Still set a truthy `pos` so the render gate below is one condition.
        setPos({ top: 0, left: 0, width: 0 });
        return;
      }
      setSheet(false);
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const w = Math.min(width, window.innerWidth - 16);
      const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
      setPos({ top: r.bottom + 8, left, width: w });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [anchorRef, width]);

  if (typeof document === "undefined" || !pos) return null;

  if (sheet) {
    return createPortal(
      <>
        {/* Dimmed page behind the sheet. It carries no handler of its own — the
            form's existing outside-pointerdown listener closes the panel, and
            this element is deliberately NOT marked `data-search-popover`, so a
            tap on it counts as "outside". */}
        <div className="fixed inset-0 z-[59] bg-black/50" aria-hidden />
        <div
          data-search-popover
          className="swap-sheet fixed inset-x-0 bottom-0 z-[60] max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-3xl border-t border-border bg-surface p-4 text-fg shadow-2xl shadow-shade/50"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        >
          <div aria-hidden className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" />
          {children}
        </div>
      </>,
      document.body
    );
  }

  return createPortal(
    <div
      data-search-popover
      style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
      className="z-[60] max-h-[70vh] overflow-auto rounded-2xl border border-border bg-surface p-3 text-fg shadow-2xl shadow-shade/50"
    >
      {children}
    </div>,
    document.body
  );
}

// ── Where ───────────────────────────────────────────────────────────────────
// A real combobox, and four ways in instead of one.
//
// **What it was.** A plain `<input>` over a list of `<button>`s. No `role`, no
// `aria-activedescendant`, no arrow keys, and Enter skipped to "When" rather
// than choosing the row under the cursor — so a keyboard user could read the
// suggestions and not take one. Meanwhile components/suggest-input.tsx, the
// picker the listing form uses for exactly this job, is a full combobox. One
// site, two destination pickers, two behaviours (Nielsen #2; CRAP repetition).
//
// **What a pick threw away.** `onPick` stored the bare city name, so the
// country died on the click — which is why a search for a city nobody hosts in
// could only ever end on "no homes match your filters". A row now hands over a
// whole `PlaceFilter`, and Explore can widen to the country instead of stopping
// (see `NoHomesHere` in explore-view.tsx).
//
// **The three new groups** answer a person who has no city in mind — Persona 3
// (Mateo & Elena) plans a trip by region, not by address, and Persona 1 travels
// wherever the work allows. Four labelled groups of a few rows each is Hick's
// prescribed shape ("restructure into groups"), not a longer list.
//
// One deliberate difference from suggest-input.tsx: there the row is a
// `<button>` inside `role="option"`, which makes every suggestion a tab stop
// and announces each row twice. Here the `<li>` *is* the option, focus stays in
// the input, and `aria-activedescendant` does the announcing — the shape the
// ARIA combobox pattern actually specifies. suggest-input should follow; it is
// used in the publish flow, so it was left for a pass that can re-verify it.

/** One row. `place` is what a click commits; `action` rows resolve first. */
type WhereOption = {
  id: string;
  label: string;
  hint?: string;
  leading: React.ReactNode;
  place: PlaceFilter | null;
  action?: "near";
};

type WhereGroup = { key: string; title: string | null; options: WhereOption[] };

/** A tinted, fixed-size chip so an icon, a flag and a bare "HR" all line up. */
function RowChip({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "brand" | "muted";
}) {
  return (
    <span
      aria-hidden
      className={`grid size-9 shrink-0 place-items-center rounded-lg text-xs font-semibold leading-none ${
        tone === "brand" ? "bg-brand/15 text-accent" : "bg-surface-2 text-muted"
      }`}
    >
      {children}
    </span>
  );
}

function WherePanel({
  destinations,
  countries,
  value,
  onType,
  onPick,
  onEnter,
}: {
  destinations: Destination[];
  countries: CountryStat[];
  value: string;
  onType: (t: string) => void;
  onPick: (place: PlaceFilter, advance?: boolean) => void;
  onEnter: () => void;
}) {
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  // The highlight is stored WITH the list it belongs to, so it resets during
  // render when the answers change instead of in an effect. Leaving a stale
  // index parked would silently move the highlight onto a row nobody looked at,
  // and Enter would then commit that one. (Same shape as the `usePresence`
  // set-state-in-effect fix on 2026-08-18 — derive, don't synchronise.)
  const [highlight, setHighlight] = useState<{ key: string; index: number }>({
    key: "",
    index: -1,
  });
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [nearNote, setNearNote] = useState<string | null>(null);

  // localStorage as an external store, not "read it in an effect": see the
  // note in lib/recent-places.ts. Server render gets a stable empty list, so
  // there is nothing to hydrate-mismatch.
  const recent = useSyncExternalStore(
    subscribeRecentPlaces,
    getRecentPlaces,
    getRecentPlacesServer
  );

  const q = value.trim();
  const nq = normalizePlaceQuery(q);
  const typing = q !== "";

  // Everywhere else on earth, from the same `cities` table the listing form
  // picks from. Before this, the only searchable places were the handful of
  // cities SwapDoor already hosts a home in — so typing "Lisbon" produced "No
  // matches", which reads as *the search is broken*, not as *nobody has listed
  // there yet* (Nielsen #1: say what actually happened). Now the city is found,
  // and the empty result that follows is honestly about the listings.
  // Typed: every match. Untyped: the eight most-offered, which is what this
  // list has always shown — the cap is a display decision (Hick), and it lives
  // here rather than in the data so `locateMe` below can still see all of them.
  const cityMatches = typing
    ? destinations.filter((d) => normalizePlaceQuery(`${d.city} ${d.country}`).includes(nq))
    : destinations.slice(0, 8);
  const elsewhere = useGlobalCities(value, cityMatches);

  const countryMatches = typing
    ? countries.filter((c) => normalizePlaceQuery(c.name).includes(nq))
    : countries.slice(0, 6);

  const groups: WhereGroup[] = [];

  // 1. The two answers that need no typing at all. Hidden once someone starts
  //    typing: they have said what they want, and a shortcut competing with
  //    their own words is the clutter Nielsen #9 is about.
  if (!typing) {
    groups.push({
      key: "quick",
      title: null,
      options: [
        {
          id: "near",
          label: locating ? "Locating…" : "Near me",
          hint: "Closest place with homes to swap",
          leading: (
            <RowChip tone="brand">
              <LocateIcon className="size-4" />
            </RowChip>
          ),
          place: null,
          action: "near",
        },
        {
          id: "anywhere",
          label: "Anywhere",
          hint: "Every home on SwapDoor",
          leading: (
            <RowChip tone="brand">
              <GlobeIcon className="size-4" />
            </RowChip>
          ),
          place: EMPTY_PLACE,
        },
      ],
    });

    if (recent.length > 0) {
      groups.push({
        key: "recent",
        title: "Recent",
        options: recent.map((p, i) => ({
          id: `recent-${i}`,
          label: p.text,
          leading: (
            <RowChip>
              <ClockIcon className="size-4" />
            </RowChip>
          ),
          place: p,
        })),
      });
    }
  }

  // 2. Inventory, most specific first: a city somebody is actually offering a
  //    home in is a better answer than a country, which is a better answer than
  //    a gazetteer entry (Lecture 5 — the more useful group gets the stronger
  //    position). The order does not change between the empty and typed states,
  //    so the panel never rearranges itself under the pointer.
  if (cityMatches.length > 0) {
    groups.push({
      key: "cities",
      title: "Homes to swap here",
      options: cityMatches.map((d) => ({
        id: `city-${d.city}-${d.country}`,
        label: `${d.city}, ${d.country}`,
        hint: `${d.count} ${d.count === 1 ? "home" : "homes"} to swap`,
        leading: (
          <RowChip tone="brand">
            <HomeIcon className="size-4" />
          </RowChip>
        ),
        place: {
          text: `${d.city}, ${d.country}`,
          city: d.city,
          country: d.country,
          countryCode: d.countryCode ?? "",
        },
      })),
    });
  }

  if (countryMatches.length > 0) {
    groups.push({
      key: "countries",
      title: "Whole country",
      options: countryMatches.map((c) => ({
        id: `country-${c.code ?? c.name}`,
        label: c.name,
        hint: `${c.count} ${c.count === 1 ? "home" : "homes"} to swap`,
        leading: <RowChip>{c.code ?? c.name.slice(0, 2).toUpperCase()}</RowChip>,
        place: { text: c.name, city: "", country: c.name, countryCode: c.code ?? "" },
      })),
    });
  }

  if (elsewhere.rows.length > 0) {
    groups.push({
      key: "elsewhere",
      title: "Anywhere else",
      options: elsewhere.rows.map((c) => ({
        id: `global-${c.id}`,
        label: `${c.name}, ${c.countryName}`,
        hint: c.admin1 ?? "Search homes here",
        // The flags are regional-indicator pairs and Windows ships no glyph for
        // them — it renders the two letters. The chip is sized either way, so
        // it reads as a country-code badge there and holds the flag elsewhere.
        leading: <RowChip>{c.emoji}</RowChip>,
        place: {
          text: `${c.name}, ${c.countryName}`,
          city: c.name,
          country: c.countryName,
          countryCode: c.countryCode,
        },
      })),
    });
  }

  const flat = groups.flatMap((g) => g.options);
  // Identity of the current answer set. Any change to it drops the highlight.
  const listKey = `${nq}|${flat.map((o) => o.id).join("|")}`;
  const activeIndex = highlight.key === listKey ? highlight.index : -1;
  const active = activeIndex >= 0 && activeIndex < flat.length ? flat[activeIndex] : null;
  const setActiveIndex = (index: number) => setHighlight({ key: listKey, index });

  useEffect(() => {
    if (activeIndex < 0) return;
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function choose(option: WhereOption) {
    if (option.action === "near") {
      locateMe();
      return;
    }
    if (option.place) commit(option.place);
  }

  function commit(place: PlaceFilter) {
    setNearNote(null);
    setGeoError(null);
    if (place.text.trim()) rememberPlace(place);
    onPick(place);
  }

  // "Near me" answers with a destination that HAS homes, not with a radius.
  // A radius can legitimately contain nothing, and a shortcut that can return
  // an empty result reads as broken (Nielsen #1) — this way the answer is
  // always a real place, and the note says how far it is so the number is the
  // user's to judge rather than ours to hide.
  function locateMe() {
    if (!("geolocation" in navigator)) {
      setGeoError("Geolocation isn't supported by your browser.");
      return;
    }
    const mappable = destinations.flatMap((d) =>
      typeof d.lat === "number" && typeof d.lng === "number"
        ? [{ ...d, lat: d.lat, lng: d.lng }]
        : []
    );
    if (mappable.length === 0) {
      setGeoError("No mapped destinations to compare against yet.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    setNearNote(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        let best = mappable[0];
        let bestKm = distanceKm(me, best);
        for (const d of mappable.slice(1)) {
          const km = distanceKm(me, d);
          if (km < bestKm) {
            best = d;
            bestKm = km;
          }
        }
        const place: PlaceFilter = {
          text: `${best.city}, ${best.country}`,
          city: best.city,
          country: best.country,
          countryCode: best.countryCode ?? "",
        };
        rememberPlace(place);
        // Deliberately does NOT advance to "When" like a typed pick does. The
        // panel chose this city on the user's behalf, so it stays open long
        // enough to say which one and why (Nielsen #3, and Lecture 3's
        // evaluation side: "what happened?" answered before the next step).
        setNearNote(
          `Closest to you: ${best.city}, ${best.country} — about ${Math.round(bestKm).toLocaleString()} km away.`
        );
        onPick(place, false);
      },
      () => {
        setLocating(false);
        setGeoError("Couldn't get your location — check your browser permissions.");
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (flat.length === 0) return;
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      const from = activeIndex < 0 ? (step === 1 ? -1 : 0) : activeIndex;
      setActiveIndex((from + step + flat.length) % flat.length);
      return;
    }
    if (e.key === "Home" && flat.length > 0) {
      e.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (e.key === "End" && flat.length > 0) {
      e.preventDefault();
      setActiveIndex(flat.length - 1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      // A highlighted row wins; otherwise Enter means "I have typed enough" and
      // moves on, which is what it has always done here.
      if (active) choose(active);
      else onEnter();
    }
  }

  // Announced, not just drawn: a sighted user sees the list grow, a screen
  // reader user gets this line (Nielsen #3 on a control that answers over the
  // network).
  const status = elsewhere.loading
    ? "Searching…"
    : flat.length === 0
      ? "No place by that name — try another spelling."
      : `${flat.length} ${flat.length === 1 ? "suggestion" : "suggestions"}`;

  let index = -1;

  return (
    <div>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2.5">
        <span className="text-muted">
          <SearchGlyph />
        </span>
        <input
          autoFocus
          value={value}
          onChange={(e) => onType(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a city or country"
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active ? `${listId}-${activeIndex}` : undefined}
          className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-muted"
        />
      </div>

      {nearNote && (
        <p className="mt-2 rounded-xl bg-brand/10 px-3 py-2 text-xs leading-relaxed text-fg">
          {nearNote}
        </p>
      )}
      {geoError && (
        <p className="mt-2 text-xs text-danger" role="alert">
          {geoError}
        </p>
      )}

      <ul id={listId} role="listbox" aria-label="Destinations" ref={listRef}>
        {groups.map((g) => (
          <Fragment key={g.key}>
            {g.title && (
              <li
                role="presentation"
                className="px-1 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted"
              >
                {g.title}
              </li>
            )}
            {g.options.map((o) => {
              index += 1;
              const i = index;
              return (
                <li
                  key={o.id}
                  id={`${listId}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={i === activeIndex}
                  // pointerdown, not click: the input keeps focus, and a blur
                  // must never close the list out from under the tap.
                  onPointerDown={(e) => {
                    e.preventDefault();
                    choose(o);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 text-left transition ${
                    i === activeIndex ? "bg-bg" : ""
                  }`}
                >
                  {o.leading}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-fg">{o.label}</span>
                    {o.hint && (
                      <span className="block truncate text-xs text-muted">{o.hint}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </Fragment>
        ))}
      </ul>

      <p
        role="status"
        className={`px-1 pt-3 text-xs text-muted ${flat.length > 0 ? "sr-only" : ""}`}
      >
        {status}
      </p>

      {recent.length > 0 && !typing && (
        <div className="mt-2 border-t border-border pt-2 text-right">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              clearRecentPlaces();
            }}
            className="rounded-lg px-2 py-1 text-xs font-medium text-accent transition hover:text-brand"
          >
            Clear recent
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Debounced global city search for the panel above.
 *
 * Same shape as the one in components/suggest-input.tsx — the answer is stored
 * beside the query it answers, so "still loading?" is derived during render and
 * a slow reply to an older query can't overwrite a newer list.
 */
function useGlobalCities(value: string, alreadyShown: Destination[]) {
  const [result, setResult] = useState<{ key: string | null; rows: GlobalCity[] }>({
    key: null,
    rows: [],
  });

  const query = value.trim();
  const loading = query.length > 0 && result.key !== query;

  useEffect(() => {
    if (!query) return;
    let alive = true;
    const timer = setTimeout(async () => {
      const rows = await searchCitiesGlobal(query, 6);
      if (alive) setResult({ key: query, rows });
    }, 200);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query]);

  // Never offer the same city twice under two headings.
  const shown = new Set(alreadyShown.map((d) => d.city.toLowerCase()));
  return {
    loading,
    rows: query && result.key === query ? result.rows.filter((c) => !shown.has(c.name.toLowerCase())) : [],
  };
}
// ── When ────────────────────────────────────────────────────────────────────
// An Airbnb-style range picker: a real month calendar (check-in → check-out)
// on top, with a few quick "flexible" lengths below (Hick's law). Picking dates
// clears the length preset and vice-versa, so the two never conflict.
const DURATIONS = [
  { token: "weekend", label: "A weekend" },
  { token: "week", label: "One week" },
  { token: "2weeks", label: "Two weeks" },
];

function WhenPanel({
  stay,
  when,
  checkout,
  onPreset,
  onExact,
}: {
  stay: string;
  when: string;
  checkout: string;
  onPreset: (token: string) => void;
  onExact: (checkIn: string, checkOut: string) => void;
}) {
  const today = todayISO();
  const nights = when && checkout ? nightsBetween(when, checkout) : 0;

  const presetClass = (active: boolean) =>
    `rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
      active
        ? "border-brand bg-brand/15 text-fg"
        : "border-border text-muted hover:bg-bg hover:text-fg"
    }`;

  return (
    <div>
      {/* Header — prompt, or the chosen range + nights (visibility of status) */}
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-sm font-semibold text-fg">
          {when && checkout
            ? `${nights} night${nights === 1 ? "" : "s"}`
            : when
              ? "Select check-out"
              : "Select dates"}
        </span>
        {(when || stay) && (
          <button
            type="button"
            onClick={() => onExact("", "")}
            className="text-xs font-medium text-accent transition hover:text-brand"
          >
            Clear
          </button>
        )}
      </div>

      <Calendar checkIn={when} checkOut={checkout} min={today} onSelect={onExact} />

      {/* Quick "flexible" lengths — for when exact dates don't matter. */}
      <div className="mt-3 border-t border-border pt-3">
        <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Or stay flexible
        </p>
        <div className="grid grid-cols-3 gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.token}
              type="button"
              onClick={() => onPreset(d.token)}
              className={presetClass(stay === d.token)}
            >
              {d.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onPreset("flexible")}
          className={`mt-2 w-full ${presetClass(stay === "flexible")}`}
        >
          I&rsquo;m flexible
        </button>
      </div>
    </div>
  );
}

// ── Who ─────────────────────────────────────────────────────────────────────
function WhoPanel({ count, onChange }: { count: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 px-1 py-1">
        <div>
          <p className="text-sm font-semibold text-fg">Guests</p>
          <p className="text-xs text-muted">Everyone joining the swap</p>
        </div>
        <Stepper value={count} min={0} max={16} zeroLabel="Any" onChange={onChange} />
      </div>
      <p className="mt-3 rounded-xl bg-bg px-3 py-2.5 text-xs leading-relaxed text-muted">
        Leave it on “Any”, or set how many are travelling. Ages, pets and extra
        details can be arranged directly with your host.
      </p>
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  zeroLabel,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  zeroLabel?: string;
  onChange: (n: number) => void;
}) {
  const btn =
    "grid size-9 place-items-center rounded-full border border-border text-xl leading-none text-fg transition hover:border-muted/60 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Fewer guests"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={btn}
      >
        −
      </button>
      <span className="min-w-[3ch] text-center text-sm font-semibold text-fg">
        {value === 0 && zeroLabel ? zeroLabel : value}
      </span>
      <button
        type="button"
        aria-label="More guests"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={btn}
      >
        +
      </button>
    </div>
  );
}

// Segment glyphs. Same 18px, same 2.2 stroke, same round caps as SearchGlyph
// so the four marks in the bar read as one set (CRAP: repetition).
function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function PinGlyph() {
  return (
    <Glyph>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </Glyph>
  );
}

function CalendarGlyph() {
  return (
    <Glyph>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Glyph>
  );
}

function GuestGlyph() {
  return (
    <Glyph>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </Glyph>
  );
}

export function SearchGlyph() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
