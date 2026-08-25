// Five stars, filled to the tenth.
//
// Lives in its own module rather than inside reviews-section.tsx because that
// file is a Client Component: importing `Stars` from it dragged the whole
// reviews UI (state, "show all" button) into the bundle of every page that only
// wanted to draw a rating. This is pure and hook-free, so it renders in Server
// Components too — the home page's reviews marquee ships no JS for it at all.
// reviews-section.tsx re-exports it, so existing imports keep working.
//
// Rounding to whole stars (what this used to do) turned a 4.6 into five full
// stars — an overstated rating in a UI whose whole job is honest trust signals.
// The number is always beside it, so the score never rests on the icons alone
// (Lecture 6: never let colour or an icon carry a meaning by itself).
export function Stars({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div
      // `role="img"` is load-bearing, not decoration: `aria-label` is PROHIBITED
      // on a generic div, so without a role the name below is silently dropped
      // and a screen reader announces nothing at all for the rating (Lighthouse
      // `aria-prohibited-attr`, 8 instances on the home page alone). The stars
      // themselves are aria-hidden, so this label is the only text there is.
      role="img"
      className={`flex items-center gap-0.5 ${className}`}
      aria-label={`${value.toFixed(1)} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} aria-hidden className="relative text-border">
            ★
            <span
              className="absolute inset-0 overflow-hidden text-accent"
              style={{ width: `${fill * 100}%` }}
            >
              ★
            </span>
          </span>
        );
      })}
    </div>
  );
}
