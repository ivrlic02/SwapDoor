// Single source of truth for button styling — CRAP *Repetition* (Lecture 5) and
// Nielsen #4 *Consistency & standards* (Lecture 4) live here in code: every
// button on the site pulls its look from one place, so the same role always
// looks the same.
//
// Three roles (pick by intent, not by looks):
//   • primary   — the ONE main action of a section. Filled brand blue = the 10%
//                 accent in the 60-30-10 rule (Lecture 6), so use it sparingly:
//                 at most one per section.
//   • secondary — other real actions competing on the same screen (outline).
//   • ghost     — navigation, dismiss, low-stakes actions (text only).
//
// Note: the home search bar keeps its own rounded-full "pill" look — it is a
// distinct component (one visual unit), not a generic button, so it does not
// use this helper.

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover",
  secondary: "border border-border text-fg hover:bg-surface",
  ghost: "text-muted hover:text-fg",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

/** Class string for a button/link. Keep the element (`<button>` / `<Link>`) —
 *  only the classes are standardized. `extra` appends layout tweaks (e.g. w-full). */
export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra = "",
): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${extra}`.trim();
}
