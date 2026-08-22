"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useHomeSearch, whenSummary } from "./home-search-context";
import { Calendar, nightsBetween, todayISO } from "./calendar";
import type { Destination } from "@/lib/houses";
import { searchCitiesGlobal, type GlobalCity } from "@/lib/places";

type Seg = "where" | "when" | "who";

// The "Simple & trusted" search bar: each segment is a button that opens a
// small, plain-language popover. Big targets, few choices (Hick's law), verified
// framing throughout. Shared by the hero and the nav drop-down.
export function SearchFields({ variant }: { variant: "hero" | "compact" }) {
  const { values, setValues, submit, destinations } = useHomeSearch();
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
        "flex flex-col text-left shadow-xl shadow-black/20 transition-colors",
        "gap-1 rounded-3xl p-1.5 sm:flex-row sm:items-stretch sm:gap-0 sm:rounded-full",
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
        variant === "hero" ? "mx-auto mt-10 max-w-3xl" : "w-full",
      ].join(" ")}
    >
      <Segment
        label="Where"
        icon={<PinGlyph />}
        value={values.where}
        placeholder="Search destinations"
        active={open === "where"}
        anyOpen={open !== null}
        onClick={() => toggle("where")}
        buttonRef={whereRef}
      />
      {/* Dividers fade out next to the active segment so nothing touches it. */}
      <Divider hidden={open === "where" || open === "when"} />
      <Segment
        label="When"
        icon={<CalendarGlyph />}
        value={whenValue}
        placeholder="Length or dates"
        active={open === "when"}
        anyOpen={open !== null}
        onClick={() => toggle("when")}
        buttonRef={whenRef}
      />
      <Divider hidden={open === "when" || open === "who"} />
      <Segment
        label="Who"
        icon={<GuestGlyph />}
        value={whoValue}
        placeholder="Any guests"
        active={open === "who"}
        anyOpen={open !== null}
        onClick={() => toggle("who")}
        buttonRef={whoRef}
      />

      <button
        type="submit"
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:mt-0 sm:shrink-0 sm:self-stretch sm:px-7"
      >
        <SearchGlyph />
        Search
      </button>

      {open === "where" && (
        <Popover anchorRef={whereRef} width={400}>
          <WherePanel
            destinations={destinations}
            value={values.where}
            onType={(t) => setValues({ where: t })}
            onPick={(city) => {
              setValues({ where: city });
              setOpen("when");
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
  onClick: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className="group flex flex-1 rounded-2xl p-1 text-left sm:rounded-full"
    >
      {/* Inner chip is inset from the cell by the button's p-1, so the active
          highlight floats with breathing room and never meets the dividers. */}
      <span
        className={[
          "flex w-full flex-col rounded-xl px-4 py-1.5 transition sm:rounded-full",
          active
            ? "bg-surface-raised shadow-xl shadow-black/40 ring-1 ring-brand/50"
            : anyOpen
              ? "opacity-60 group-hover:opacity-100"
              // Hover LIGHTENS now. It used to darken (`bg-bg/70`), which on a
              // bar that is itself raised would read as the cell sinking away
              // from the pointer rather than responding to it.
              : "group-hover:bg-white/[0.07]",
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
          <span aria-hidden className="shrink-0">
            {icon}
          </span>
          {label}
        </span>
        {/* Was `text-muted/70` — 4.1:1 on the bar, under the 4.5:1 AA floor for
            text this size, on the very words that tell you the field is fillable.
            Plain `muted` is 6.0:1 on the raised surface. */}
        <span className={`truncate text-sm ${value ? "text-fg" : "text-muted"}`}>
          {value || placeholder}
        </span>
      </span>
    </button>
  );
}

function Divider({ hidden = false }: { hidden?: boolean }) {
  return (
    <div
      aria-hidden
      className={`hidden w-px self-center bg-border-raised transition-opacity duration-200 sm:block sm:h-8 ${
        hidden ? "opacity-0" : "opacity-100"
      }`}
    />
  );
}

// ── Popover shell ───────────────────────────────────────────────────────────
// Portaled to <body> and fixed-positioned under its anchor, so it escapes the
// nav drop-down's overflow/clip. Repositions on scroll/resize.
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

  useLayoutEffect(() => {
    function place() {
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

  return createPortal(
    <div
      data-search-popover
      style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
      className="z-[60] max-h-[70vh] overflow-auto rounded-2xl border border-border bg-surface p-3 text-fg shadow-2xl shadow-black/50"
    >
      {children}
    </div>,
    document.body
  );
}

// ── Where ───────────────────────────────────────────────────────────────────
function WherePanel({
  destinations,
  value,
  onType,
  onPick,
  onEnter,
}: {
  destinations: Destination[];
  value: string;
  onType: (t: string) => void;
  onPick: (city: string) => void;
  onEnter: () => void;
}) {
  const q = value.trim().toLowerCase();
  const list = q
    ? destinations.filter((d) => `${d.city} ${d.country}`.toLowerCase().includes(q))
    : destinations;

  // Everywhere else on earth, from the same `cities` table the listing form
  // picks from. Before this, the only searchable places were the handful of
  // cities SwapDoor already hosts a home in — so typing "Lisbon" produced "No
  // matches", which reads as *the search is broken*, not as *nobody has listed
  // there yet* (Nielsen #1: say what actually happened). Now the city is found,
  // and the empty result that follows is honestly about the listings.
  const elsewhere = useGlobalCities(value, list);

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
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onEnter();
            }
          }}
          placeholder="Type a city"
          className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-muted"
        />
      </div>

      {list.length > 0 && (
        <p className="px-1 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Homes to swap here
        </p>
      )}
      <ul>
        {list.map((d) => (
          <li key={`${d.city}-${d.country}`}>
            <button
              type="button"
              onClick={() => onPick(d.city)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-bg"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/15 text-base">
                🏠
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-fg">
                  {d.city}, {d.country}
                </span>
                <span className="block truncate text-xs text-muted">
                  {d.count} {d.count === 1 ? "home" : "homes"} to swap
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* Second section, and second on purpose: a city where somebody is
          already offering a home is a better answer than one where nobody is,
          so the inventory leads and the gazetteer follows (Lecture 5 —
          contrast: the more useful group gets the stronger position). */}
      {elsewhere.rows.length > 0 && (
        <>
          <p className="px-1 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted">
            Anywhere else
          </p>
          <ul>
            {elsewhere.rows.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onPick(c.name)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-bg"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-base">
                    {c.emoji}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-fg">
                      {c.name}, {c.countryName}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {c.admin1 ?? "Search homes here"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {list.length === 0 && elsewhere.rows.length === 0 && (
        <p className="px-1 py-3 text-sm text-muted">
          {elsewhere.loading ? "Searching…" : "No place by that name — try another spelling."}
        </p>
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
