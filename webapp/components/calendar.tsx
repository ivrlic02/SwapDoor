"use client";

import { useState } from "react";

// The month calendar from the search bar's "When" popover, lifted out so the
// listing form and the listing page's swap panel can use the *same* one. Three
// places asking for a date range must not offer three different pickers
// (Nielsen #2, CRAP repetition) — a member who has already searched for a stay
// knows this grid, and a native <input type="date"> would have been a second,
// browser-dependent look that ignores the site's colours entirely.
//
// Behaviour: Monday-first month grid, days outside [min, max] disabled, first
// click sets the start, second sets the end, clicking before the start begins a
// fresh range, and hovering previews the range while the end is being chosen.
//
// `max` + `markUnavailable` are what the swap panel needs: a host is only open
// for swaps between two dates, so everything outside that window is struck
// through rather than merely dimmed. Colour alone must never carry the meaning
// (Lecture 6) — the strike is the redundant signifier that survives a grayscale
// check and every kind of colour-blindness.

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/** Today as a local YYYY-MM-DD (not UTC), so "today" is right in every timezone. */
export function todayISO(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function nightsBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

/** `iso` shifted by `n` whole days, still as a YYYY-MM-DD string. */
export function addDays(iso: string, n: number): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t + n * 86_400_000).toISOString().slice(0, 10);
}

export function Calendar({
  checkIn,
  checkOut,
  min,
  max,
  markUnavailable = false,
  onSelect,
}: {
  checkIn: string;
  checkOut: string;
  min: string;
  /** Last selectable day, inclusive. Omit for "any future date". */
  max?: string;
  /** Strike out the days outside [min, max] instead of only dimming them. */
  markUnavailable?: boolean;
  onSelect: (checkIn: string, checkOut: string) => void;
}) {
  const [minY, minM] = min.split("-").map(Number);
  const [view, setView] = useState(() => {
    const base = checkIn || min;
    const [y, m] = base.split("-").map(Number);
    return { y, m: m - 1 };
  });
  const [hover, setHover] = useState<string | null>(null);

  const first = new Date(view.y, view.m, 1);
  const label = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  // A day button's accessible name is just its number, which is fine while it
  // is pickable. A *struck-out* one has to say why it can't be picked, and
  // "2026-09-01" is the machine's phrasing, not the user's (Nielsen #1).
  const monthName = first.toLocaleDateString(undefined, { month: "long" });
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // shift so Monday is the first column
  const iso = (day: number) =>
    `${view.y}-${String(view.m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  // Don't let the user page outside the bookable window — an empty month of
  // struck-out days is a dead end, not information (Nielsen #5).
  const canPrev = view.y > minY || (view.y === minY && view.m + 1 > minM);
  const [maxY, maxM] = max ? max.split("-").map(Number) : [0, 0];
  const canNext = !max || view.y < maxY || (view.y === maxY && view.m + 1 < maxM);
  const shift = (delta: number) =>
    setView((v) => {
      const n = v.m + delta;
      return { y: v.y + Math.floor(n / 12), m: ((n % 12) + 12) % 12 };
    });

  function pick(day: string) {
    if (day < min || (max && day > max)) return;
    // No start yet, or a full range already, or clicking before the start →
    // begin a fresh range. Otherwise the click sets the end.
    if (!checkIn || (checkIn && checkOut) || day <= checkIn) onSelect(day, "");
    else onSelect(checkIn, day);
  }

  // While choosing the end, preview the range up to the hovered day.
  const rangeEnd = checkOut || (checkIn && !checkOut && hover && hover > checkIn ? hover : "");

  return (
    <div onMouseLeave={() => setHover(null)}>
      <div className="mb-1 flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={!canPrev}
          aria-label="Previous month"
          className="grid size-8 place-items-center rounded-full text-lg text-fg transition hover:bg-bg disabled:opacity-25 disabled:hover:bg-transparent"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-fg">{label}</span>
        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!canNext}
          aria-label="Next month"
          className="grid size-8 place-items-center rounded-full text-lg text-fg transition hover:bg-bg disabled:opacity-25 disabled:hover:bg-transparent"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7">
        {WEEKDAYS.map((w) => (
          <span key={w} className="pb-1 text-center text-[11px] font-medium text-muted">
            {w}
          </span>
        ))}
        {Array.from({ length: lead }).map((_, i) => (
          <span key={`lead-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = iso(i + 1);
          const disabled = day < min || (!!max && day > max);
          const isIn = day === checkIn;
          const isOut = day === checkOut;
          const endpoint = isIn || isOut;
          const inRange = !!(rangeEnd && checkIn && day > checkIn && day < rangeEnd);
          const bandLeft = isIn && !!rangeEnd; // start of a range → band on its right
          const bandRight = isOut; // end of a range → band on its left

          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => pick(day)}
              onMouseEnter={() => setHover(day)}
              aria-label={disabled ? `${monthName} ${i + 1} — not available` : undefined}
              className={[
                "flex h-10 items-center justify-center text-sm",
                inRange ? "bg-brand/12" : "",
                bandLeft ? "rounded-l-full bg-brand/12" : "",
                bandRight ? "rounded-r-full bg-brand/12" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "grid size-9 place-items-center rounded-full transition",
                  endpoint
                    ? "bg-brand font-semibold text-white"
                    : disabled
                      ? `cursor-not-allowed ${
                          markUnavailable
                            ? "text-muted/45 line-through decoration-muted/45"
                            : "text-muted/30"
                        }`
                      : "text-fg hover:bg-bg",
                ].join(" ")}
              >
                {i + 1}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
