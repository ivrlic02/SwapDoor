"use client";

import { useId } from "react";

// Shared form primitives for /admin.
//
// They exist for the same reason components/button.tsx exists: the editor is a
// screen made almost entirely of inputs, and an admin assembled from ad-hoc
// `<input className="...">` drifts within a single sitting. One label position,
// one focus ring, one hint style — CRAP repetition applied to the surface the
// site's content is actually produced on.
//
// Labels are real <label for> elements, never placeholders standing in for one:
// a placeholder disappears the moment the field has content, so the field that
// most needs its name is the field that has lost it (Nielsen #6, recognition
// rather than recall).

const CONTROL =
  "w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-fg placeholder:text-muted/60 transition focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  mono?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-muted">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${CONTROL} ${mono ? "font-mono text-xs" : ""}`}
      />
      {hint && <p className="mt-1.5 text-xs text-muted/80">{hint}</p>}
    </div>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
  hint,
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  hint?: string;
  mono?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-muted">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${CONTROL} resize-y leading-relaxed ${mono ? "font-mono text-xs" : ""}`}
      />
      {hint && <p className="mt-1.5 text-xs text-muted/80">{hint}</p>}
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-muted">
        {label}
      </label>
      <input
        id={id}
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className={CONTROL}
      />
      {hint && <p className="mt-1.5 text-xs text-muted/80">{hint}</p>}
    </div>
  );
}

/** A labelled wrapper for a control that draws itself (e.g. <Select>). */
export function FieldShell({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold text-muted">{label}</span>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted/80">{hint}</p>}
    </div>
  );
}

/** A card wrapping one editable item (a block, a step, an FAQ entry), with the
 *  reorder and delete controls in a fixed place. */
export function ItemCard({
  title,
  onUp,
  onDown,
  onRemove,
  canUp,
  canDown,
  children,
}: {
  title: string;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  canUp: boolean;
  canDown: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-accent">{title}</span>
        <div className="ml-auto flex items-center gap-1">
          <IconButton label="Move up" onClick={onUp} disabled={!canUp}>
            ↑
          </IconButton>
          <IconButton label="Move down" onClick={onDown} disabled={!canDown}>
            ↓
          </IconButton>
          <IconButton label="Remove" onClick={onRemove} danger>
            ✕
          </IconButton>
        </div>
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled = false,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-7 w-7 items-center justify-center rounded-md text-sm transition disabled:cursor-not-allowed disabled:opacity-30 ${
        danger
          ? "text-muted hover:bg-danger/15 hover:text-danger"
          : "text-muted hover:bg-surface-2 hover:text-fg"
      }`}
    >
      <span aria-hidden>{children}</span>
    </button>
  );
}
