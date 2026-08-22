import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { Stars } from "@/components/stars";
import type { FeaturedReview } from "@/lib/houses";

// Real guest reviews drifting past in two rows, pulled from the same `reviews`
// table the listing pages read — nothing here is written copy.
//
// Why this exists: both cautious personas (Overview §3) decide on *other
// people*, not on features, and until now the first evidence that anyone had
// ever used SwapDoor sat three screens down. Why it *moves*: a single quote
// reads as one cherry-picked testimonial, whereas a wall of them that keeps
// arriving reads as a population. Two rows in opposite directions so the pair
// never scans as one block of sliding text.
//
// Entirely server-rendered — the motion is CSS (`.rv-marquee` in globals.css),
// so this ships no JavaScript. Motion is decoration only: every card is fully
// readable while paused, hovering or tabbing into the strip pauses it, and
// `prefers-reduced-motion` turns it into an ordinary horizontal scroller.

// A row narrower than the viewport would leave a visible gap as it loops, so a
// short review set is repeated until it can fill one.
const MIN_PER_ROW = 6;

function fill(items: FeaturedReview[]): FeaturedReview[] {
  if (items.length === 0) return [];
  const out = [...items];
  while (out.length < MIN_PER_ROW) out.push(...items);
  return out;
}

export function ReviewsMarquee({ reviews }: { reviews: FeaturedReview[] }) {
  // No reviews yet → no section. A row of empty placeholders would be a hollow
  // trust signal, which is exactly what this section exists to replace.
  if (reviews.length === 0) return null;

  // Alternate rather than split down the middle, so neither row ends up all one
  // rating or all one city.
  const rowA = fill(reviews.filter((_, i) => i % 2 === 0));
  const rowB = fill(reviews.filter((_, i) => i % 2 === 1));

  return (
    // Named like the map section above it, so the strip can be linked to.
    <section id="reviews" className="scroll-mt-20 overflow-hidden py-20">
      <div className="mx-auto mb-10 max-w-6xl px-6 text-center">
        <p className="mb-2 font-semibold text-accent">Real swaps, real people</p>
        <h2 className="text-3xl font-bold">What members say afterwards</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          Every review below was left by a member on a home they actually stayed in.
        </p>
      </div>

      {/* One `.rv-marquee` wraps both rows, so hovering or focusing anywhere in
          the strip pauses both — you never have to chase a moving card to read
          the one beside it. */}
      <div className="rv-marquee overflow-hidden">
        <Row items={rowA} duration="72s" />
        {rowB.length > 0 && <Row items={rowB} duration="88s" reverse className="mt-4" />}
      </div>
    </section>
  );
}

function Row({
  items,
  duration,
  reverse = false,
  className = "",
}: {
  items: FeaturedReview[];
  duration: string;
  reverse?: boolean;
  className?: string;
}) {
  return (
    <ul
      // Slightly different durations per row so the two never line up into a
      // repeating pattern the eye can lock onto.
      style={{ "--rv-duration": duration } as React.CSSProperties}
      className={`rv-track gap-4 ${reverse ? "rv-track--reverse" : ""} ${className}`}
    >
      {items.map((r, i) => (
        <Card key={`${r.id}-${i}`} review={r} />
      ))}
      {/* The second copy is what makes the loop seamless: translating the track
          exactly -50% lands this copy where the first one started. It is hidden
          from assistive tech and from reduced-motion users, who get the reviews
          once, in the DOM, unmoved. */}
      {items.map((r, i) => (
        <Card key={`dup-${r.id}-${i}`} review={r} duplicate />
      ))}
    </ul>
  );
}

function Card({ review, duplicate = false }: { review: FeaturedReview; duplicate?: boolean }) {
  const name = review.author?.name ?? "SwapDoor guest";
  const { house } = review;

  return (
    <li
      {...(duplicate ? { "aria-hidden": true, "data-rv-dup": "" } : {})}
      className="flex w-[19rem] shrink-0 flex-col rounded-2xl border border-border bg-surface p-5"
    >
      <Stars value={review.rating} />

      {/* The review itself is the loudest text in the card — the names and the
          home beneath it are supporting detail (Lecture 5: contrast). */}
      <p className="mt-3 flex-1 text-sm leading-relaxed text-fg">&ldquo;{review.body}&rdquo;</p>

      <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
        <Avatar name={name} src={review.author?.avatarUrl} size={36} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fg">{name}</p>
          {review.author?.location && (
            <p className="truncate text-xs text-muted">{review.author.location}</p>
          )}
        </div>
      </div>

      {/* Naming the home — and linking to it — is what separates this from an
          anonymous compliment: the claim is checkable in one click. The
          duplicate copy is not a link, so a keyboard user tabs through each
          review exactly once. */}
      {duplicate ? (
        <p className="mt-3 truncate text-xs text-muted" aria-hidden>
          Swapped into {house.name}, {house.location}
        </p>
      ) : (
        <Link
          href={`/explore/${house.id}`}
          className="mt-3 truncate rounded text-xs text-accent transition hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Swapped into {house.name}, {house.location} →
        </Link>
      )}
    </li>
  );
}
