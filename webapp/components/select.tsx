"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// The one dropdown on the site.
//
// Why this exists: three native `<select>`s were left in place (Explore's sort,
// the listing form's home type, the swap panel's offered home). Their *closed*
// state was styled to match the surrounding pills and inputs, but the list that
// drops out of a native select is drawn by the operating system, not by this
// stylesheet — on Windows that is a white, square, system-font menu appearing on
// a dark blue page. Right beside it, "Home type" and "Rating" opened the app's
// own dark popover. Two controls that do the same job looked like two different
// products, which is exactly what Nielsen #4 (consistency) is about, and the
// CRAP repetition principle (Lecture 5) says the fix is one form repeated.
//
// It is a real listbox, not a styled div: the trigger is a combobox that owns
// the list, Up/Down/Home/End rove, Enter/Space commit, Escape closes and hands
// focus back, and typing a letter jumps to the next option starting with it —
// the behaviours people already have from the native control, which is the
// reason to keep them rather than the reason to avoid building this.
//
// The panel portals to <body> and is fixed-positioned under its trigger, the
// same trick components/explore-view.tsx's PillPopover uses, so a dropdown can
// never be clipped by the nav's overflow or a card's rounded corners.

export type SelectOption<T extends string | number> = {
  value: T;
  label: string;
  /** Second line, e.g. a home's city under its name. */
  hint?: string;
};

/**
 * `pill`  — the filter pills on Explore: rounded-full, sized to its content.
 * `field` — the listing form's inputs: full width, rounded-lg, on `surface`.
 * `inset` — a field *inside* a raised panel (the swap panel), where the inputs
 *           recede to `bg` so the panel stays the nearer surface.
 *
 * A variant rather than a className override, because two background utilities
 * on one element are decided by their order in the generated stylesheet, not by
 * the order they were written in — an override that happens to work is not the
 * same as one that will keep working.
 */
type Variant = "pill" | "field" | "inset";

export function Select<T extends string | number>({
  id,
  value,
  onChange,
  options,
  variant = "field",
  ariaLabel,
  title,
  invalid,
  describedBy,
  className,
  panelWidth,
}: {
  id?: string;
  value: T;
  onChange: (next: T) => void;
  options: SelectOption<T>[];
  variant?: Variant;
  ariaLabel?: string;
  title?: string;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
  /** Force the panel's width; defaults to the trigger's own width. */
  panelWidth?: number;
}) {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  const [active, setActive] = useState(selectedIndex);
  const selected = options[selectedIndex];

  // Opening always starts on the current choice, never on the first row — the
  // native control does this, and landing anywhere else silently offers to
  // change a setting the user only meant to look at.
  function openList() {
    setActive(selectedIndex);
    setOpen(true);
  }

  function commit(index: number) {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  // Keep the highlighted row in view when the arrows walk past the panel's edge.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement;
      if (triggerRef.current?.contains(target)) return;
      if (target.closest("[data-select-panel]")) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  const typeahead = useRef({ buffer: "", at: 0 });

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      if (open) e.stopPropagation(); // don't also close the panel this sits in
      setOpen(false);
      return;
    }
    if (e.key === "Tab") {
      setOpen(false);
      return;
    }
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openList();
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => {
        const next = e.key === "ArrowDown" ? i + 1 : i - 1;
        return (next + options.length) % options.length;
      });
      return;
    }
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setActive(e.key === "Home" ? 0 : options.length - 1);
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commit(active);
      return;
    }
    // Type-to-jump, with the usual ~1s window before the buffer resets.
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const now = Date.now();
      const t = typeahead.current;
      t.buffer = now - t.at > 1000 ? e.key : t.buffer + e.key;
      t.at = now;
      const q = t.buffer.toLowerCase();
      const from = t.buffer.length === 1 ? active + 1 : active;
      for (let n = 0; n < options.length; n++) {
        const i = (from + n) % options.length;
        if (options[i].label.toLowerCase().startsWith(q)) {
          setActive(i);
          break;
        }
      }
    }
  }

  const border = invalid
    ? "border-danger"
    : open
      ? "border-brand"
      : "border-border hover:border-muted/60 focus-visible:border-brand";

  const triggerClass = {
    pill: `inline-flex items-center gap-1.5 rounded-full border bg-surface px-4 py-2 text-sm font-medium text-fg outline-none transition ${border}`,
    field: `flex w-full items-center gap-2 rounded-lg border bg-surface px-4 py-3 text-left text-fg outline-none transition ${border}`,
    inset: `flex w-full items-center gap-2 rounded-xl border bg-bg px-3 py-2.5 text-left text-sm text-fg outline-none transition ${border}`,
  }[variant];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-label={ariaLabel}
        title={title}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={className ? `${triggerClass} ${className}` : triggerClass}
      >
        <span className="min-w-0 flex-1 truncate">{selected?.label ?? ""}</span>
        <Chevron open={open} />
      </button>

      {open && (
        <SelectPanel triggerRef={triggerRef} width={panelWidth}>
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            tabIndex={-1}
            className="max-h-[min(20rem,60vh)] overflow-auto p-1.5"
          >
            {options.map((option, i) => {
              const isSelected = option.value === value;
              return (
                <li
                  key={String(option.value)}
                  id={`${listId}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSelected}
                  onPointerDown={(e) => {
                    // pointerdown, not click: the trigger's blur must not close
                    // the panel out from under the press.
                    e.preventDefault();
                    commit(i);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={[
                    "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                    i === active ? "bg-bg" : "",
                    isSelected ? "text-fg" : "text-fg",
                  ].join(" ")}
                >
                  {/* The tick, not colour, is what says "this is the current
                      one" — the same rule the filter panels follow (Lecture 6:
                      never carry meaning by colour alone). */}
                  <span className="grid size-4 shrink-0 place-items-center text-brand">
                    {isSelected && <CheckGlyph />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {option.hint && (
                      <span className="block truncate text-xs text-muted">{option.hint}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </SelectPanel>
      )}
    </>
  );
}

// Fixed-positioned and portaled, so no ancestor's overflow, clip-path or
// transform can crop the list. Flips above the trigger when there isn't room
// below, which is what makes this usable on the swap panel low on a phone.
function SelectPanel({
  triggerRef,
  width,
  children,
}: {
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  width?: number;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    function place() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const w = Math.min(Math.max(width ?? r.width, 180), window.innerWidth - 16);
      const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
      const below = window.innerHeight - r.bottom;
      const top = below < 240 && r.top > below ? Math.max(8, r.top - 8 - 320) : r.bottom + 8;
      setPos({ top, left, width: w });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [triggerRef, width]);

  if (typeof document === "undefined" || !pos) return null;

  return createPortal(
    <div
      data-select-panel
      style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
      className="z-[70] rounded-2xl border border-border bg-surface shadow-2xl shadow-black/50"
    >
      {children}
    </div>,
    document.body
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m5 13 4 4L19 7"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
