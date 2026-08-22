"use client";

import { useSaved } from "@/components/saved-context";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Heart toggle overlaid on a listing image. Lives OUTSIDE the card's <Link>
// (an interactive element can't nest in an anchor), so it's positioned by the
// caller. Filled vs outline carries the state by SHAPE, not colour alone
// (Lecture 6): a filled brand heart when saved, an outline when not.
export function SaveButton({
  houseId,
  className = "",
  variant = "overlay",
}: {
  houseId: number;
  className?: string;
  /** `overlay` sits on a photo (icon only); `inline` sits on the page next to
   *  other page controls, where an icon with no label would be a guess. */
  variant?: "overlay" | "inline";
}) {
  const { isSaved, toggle } = useSaved();

  // Nothing to save against if the backend isn't wired.
  if (!isSupabaseConfigured) return null;

  const saved = isSaved(houseId);
  const inline = variant === "inline";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(houseId);
      }}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved homes" : "Save this home"}
      title={saved ? "Saved — click to remove" : "Save this home"}
      className={`${
        inline
          ? "inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-fg hover:bg-surface"
          : "grid size-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-black/75"
      } transition active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
    >
      <HeartIcon filled={saved} />
      {inline && (saved ? "Saved" : "Save")}
    </button>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? "var(--color-brand)" : "none"}
      stroke={filled ? "var(--color-brand)" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="motion-safe:transition-transform"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}
