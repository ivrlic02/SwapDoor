"use client";

import { useEffect, useId, useRef, useState } from "react";

// A text field that also offers a list to pick from — the listing form's
// Country and City, and the site-wide "Where" box.
//
// Free typing still works (someone swapping a house in a hamlet no gazetteer
// lists must not be blocked), but the common case becomes recognition rather
// than recall (Nielsen #7): start typing "Spl", see "Split, Split-Dalmatia",
// press Enter.
//
// It is a real combobox, not a styled div: the input keeps role="combobox", the
// list is a listbox of options, ↑ ↓ move, Enter picks, Escape closes, and
// aria-activedescendant tells a screen reader which row is highlighted.
//
// The list can be static or fetched. Fetched is what the places tables need —
// 250 countries and 50k cities are not something to ship to the browser — and
// asking a server on every keystroke brings its own obligations, so:
//   • queries are debounced, and a result that arrives after a newer query was
//     already sent is dropped rather than flashing stale rows into the list;
//   • the list stays on screen while the next answer loads, with the status on
//     it, because emptying it on every keystroke makes the field flicker;
//   • "no matches" says so *and* says free text is fine, rather than looking
//     like the field is broken (Nielsen #1, #9).

export type Suggestion = {
  /** What gets written into this field. */
  value: string;
  /** What the row shows (e.g. "Split, Split-Dalmatia"). */
  label: string;
  /** Second line — e.g. "3 homes to swap here". */
  hint?: string;
  /** A flag or icon shown before the label. */
  leading?: string;
  /** Stable identity for the row; falls back to the label. */
  key?: string;
  /** Everything else the pick should fill in (e.g. the country and its code). */
  extra?: Record<string, string>;
};

export function SuggestInput({
  id,
  value,
  onChange,
  onPick,
  suggestions,
  load,
  placeholder,
  maxLength,
  invalid,
  disabled,
  disabledHint,
  emptyHint = "No match — you can still type it in.",
  describedBy,
  className,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  onPick: (s: Suggestion) => void;
  /** A fixed list. Ignored when `load` is given. */
  suggestions?: Suggestion[];
  /** Fetches the list for a query. Debounced; latest answer wins. */
  load?: (query: string) => Promise<Suggestion[]>;
  placeholder?: string;
  maxLength?: number;
  invalid?: boolean;
  disabled?: boolean;
  /** Why the field is disabled — shown in place of the list. */
  disabledHint?: string;
  emptyHint?: string;
  describedBy?: string;
  className?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // ── Fetching ──────────────────────────────────────────────────────────────
  // The result is stored *with the query it answers*, so "is this list still
  // being fetched?" is derived during render rather than pushed in from the
  // effect — the same move that took the last setState-in-an-effect out of this
  // codebase, and the reason the panel can never get stuck showing "Searching…"
  // after its answer arrived.
  const [result, setResult] = useState<{ key: string | null; rows: Suggestion[] }>({
    key: null,
    rows: [],
  });

  // A different loader is a different source (the city list after the country
  // changed): whatever is on screen answers the old one and must not be shown
  // under the new one. Adjusting state during render is React's documented way
  // to react to a changed prop — an effect would be a render late, and the rows
  // would flash under the wrong heading.
  //
  // The loader is wrapped in an object rather than stored bare: React reads a
  // function passed to useState as a lazy initialiser and a function passed to
  // a setter as an updater, so `useState(load)` would *call* load — with no
  // argument — the moment this mounted.
  const [source, setSource] = useState<{ fn: typeof load }>({ fn: load });
  if (source.fn !== load) {
    setSource({ fn: load });
    setResult({ key: null, rows: [] });
  }

  const query = load && open ? value.trim() : null;
  const loading = query !== null && result.key !== query;

  useEffect(() => {
    if (!load || query === null) return;
    let alive = true;
    const timer = setTimeout(async () => {
      const rows = await load(query);
      // The cleanup runs the moment the query changes, so an answer to "spl"
      // arriving after "split" was typed lands with alive === false.
      if (alive) setResult({ key: query, rows });
    }, query ? 180 : 0);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query, load]);

  // Static mode filters in place; capped so the list stays a glance, not a
  // scroll (Hick's law). Fetched mode is already capped by the query.
  const q = value.trim().toLowerCase();
  const matches = load
    ? result.rows
    : (q
        ? (suggestions ?? []).filter((s) => s.label.toLowerCase().includes(q))
        : (suggestions ?? [])
      ).slice(0, 8);

  // A shorter list can leave the highlight past its end; clamping here beats
  // another effect whose only job is to move it back.
  const activeIndex = matches.length === 0 ? 0 : Math.min(active, matches.length - 1);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open]);

  function choose(s: Suggestion) {
    onPick(s);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(0);
        return;
      }
      if (matches.length === 0) return;
      setActive((i) => {
        const from = matches.length === 0 ? 0 : Math.min(i, matches.length - 1);
        const next = e.key === "ArrowDown" ? from + 1 : from - 1;
        return (next + matches.length) % matches.length;
      });
      return;
    }
    if (e.key === "Enter" && open && matches[activeIndex]) {
      e.preventDefault();
      choose(matches[activeIndex]);
    }
  }

  const showPanel = open && !disabled;

  return (
    <div ref={rootRef} className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showPanel && matches[activeIndex] ? `${listId}-${activeIndex}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => {
          onChange(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={className}
      />

      {/* Chevron doubles as the signifier that this field has a list behind it
          — a plain box would look like any other input (Lecture 2). */}
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        aria-label={open ? "Hide suggestions" : "Show suggestions"}
        onClick={() => setOpen((o) => !o)}
        className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted transition hover:text-fg disabled:opacity-40"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d={open ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"}
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {showPanel && (matches.length > 0 || loading || value.trim().length > 0) && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-shade/50">
          <ul id={listId} role="listbox" className="max-h-64 overflow-auto p-1">
            {matches.map((s, i) => (
              <li
                key={s.key ?? `${s.label}-${i}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === activeIndex}
              >
                <button
                  type="button"
                  // pointerdown, not click: the input's blur must not close the
                  // list before the click lands.
                  onPointerDown={(e) => {
                    e.preventDefault();
                    choose(s);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition ${
                    i === activeIndex ? "bg-bg" : ""
                  }`}
                >
                  {/* A fixed chip, not a bare glyph. The flags are regional
                      indicator pairs, and Windows ships no glyph for them — it
                      renders the two letters instead. Inside a sized, tinted
                      box that reads as a country-code badge; on a platform that
                      does have the flags, the same box holds the flag. Either
                      way it looks deliberate and the rows still line up. */}
                  {s.leading && (
                    <span
                      aria-hidden
                      className="grid size-7 shrink-0 place-items-center rounded-md bg-surface-2 text-xs font-semibold leading-none text-muted"
                    >
                      {s.leading}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-fg">{s.label}</span>
                    {s.hint && <span className="block truncate text-xs text-muted">{s.hint}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/* One status line, never both, and never in place of the rows that
              are already there — replacing a good list with "Searching…" on
              every keystroke is what makes a field feel unstable. */}
          {loading && matches.length === 0 && (
            <p className="px-3.5 py-2.5 text-sm text-muted" role="status">
              Searching…
            </p>
          )}
          {!loading && matches.length === 0 && value.trim().length > 0 && (
            <p className="px-3.5 py-2.5 text-sm text-muted">{emptyHint}</p>
          )}
        </div>
      )}

      {disabled && disabledHint && (
        <p className="mt-1.5 text-xs text-muted">{disabledHint}</p>
      )}
    </div>
  );
}
