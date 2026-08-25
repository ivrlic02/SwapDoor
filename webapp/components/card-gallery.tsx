"use client";

import { useCallback, useRef, useState, type MouseEvent, type ReactNode, type TouchEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { BLUR_DATA_URL } from "@/lib/images";

// Photo area for a listing card. The current photo is a <Link> (click = open
// the listing, keyboard-accessible), while the arrows/dots are buttons that
// only change the photo (stopPropagation, and they sit OUTSIDE that inner Link
// so there's no nested-interactive HTML).
//
// TOUCH vs POINTER — the two are now genuinely different controls, because they
// always were and the code pretended otherwise. The arrows are a *hover*
// affordance: they live at `opacity-0` and appear under the pointer. A phone has
// no pointer, so they were force-shown with `max-md:opacity-100` — two 32px
// discs parked permanently over the middle of every photo on the page, carrying
// a desktop idiom onto a screen that has a better one and eating the image while
// they did it (Nielsen #9; and 32px is under the thumb floor anyway, Fitts).
//
// Below `lg` the arrows are gone and the photo answers a swipe instead, which is
// what a finger on a photo already expects to work (Nielsen #1: follow the
// real-world convention of the platform). The dots stay — they are the
// signifier that there is more than one photo at all, without which the swipe
// would be a gesture you had to know about rather than see (Lecture 2) — and
// they grow into a comfortable strip, since on touch they are also the only
// explicit control left. Nothing above `lg` changes.
export function CardGallery({
  images,
  alt,
  href,
  priority = false,
  overlay,
}: {
  images: string[];
  alt: string;
  href: string;
  priority?: boolean;
  overlay?: ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const many = images.length > 1;

  // WHICH PHOTOS ARE IN THE DOM — the fix for "every photo takes a while".
  //
  // This used to render `images[index]` and nothing else, so turning the page
  // unmounted one <Image> and mounted another: the browser only started
  // fetching the next photo at the moment it was asked to show it, and the
  // reader watched a blur placeholder for as long as the optimizer needed
  // (measured cold: 0.9–1.4s). Going *back* re-fetched a photo already seen.
  //
  // Now every photo the reader has looked at stays mounted (stacked, faded
  // between), and the neighbours of the current one are mounted alongside it —
  // so the photo after this one is already downloaded and decoded before the
  // arrow is clicked. Mounting is still demand-driven rather than eager: the
  // Explore grid is a dozen cards of four photos each, and mounting all of them
  // would be ~50 image requests for photos nobody has asked to see, competing
  // with the ones on screen. The card starts with its hero and pulls the second
  // photo in on the first sign of intent — a hover, a focus, or a finger
  // landing on it.
  const [live, setLive] = useState<ReadonlySet<number>>(() => new Set([0]));

  const reveal = useCallback(
    (...want: number[]) => {
      setLive((prev) => {
        let next: Set<number> | null = null;
        for (const raw of want) {
          const i = ((raw % images.length) + images.length) % images.length;
          if (prev.has(i)) continue;
          next ??= new Set(prev);
          next.add(i);
        }
        // Same set → same reference → no re-render. Worth the care: this runs
        // on pointer-enter, which fires on every card the mouse crosses.
        return next ?? prev;
      });
    },
    [images.length]
  );

  // Called on hover/focus/touch: fetch the photo the arrows would land on.
  const prime = useCallback(() => {
    if (many) reveal(1, -1);
  }, [many, reveal]);

  // Turn the page AND pull in that photo's own neighbours, so a reader holding
  // the arrow down stays ahead of the network instead of behind it.
  const show = useCallback(
    (next: number) => {
      const i = ((next % images.length) + images.length) % images.length;
      setIndex(i);
      reveal(i, i + 1, i - 1);
    },
    [images.length, reveal]
  );

  // Swipe. Touch start/end only — nothing is preventDefault-ed, so vertical
  // page scrolling stays entirely the browser's job and only a clearly
  // horizontal gesture is claimed as a swipe.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  // A swipe that ends on top of a link still fires a click in some browsers,
  // which would open the listing instead of turning the page. This flag lets
  // the capture handler below swallow exactly that one click.
  const swiped = useRef(false);

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    swiped.current = false;
    prime();
  };

  const onTouchEnd = (e: TouchEvent) => {
    const from = touchStart.current;
    touchStart.current = null;
    if (!from || !many) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - from.x;
    const dy = t.clientY - from.y;
    // 40px of travel, and clearly more sideways than up/down, so a scroll that
    // drifts a little is never mistaken for a page turn.
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    swiped.current = true;
    show(index + (dx < 0 ? 1 : -1));
  };

  const step = (delta: number) => (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    show(index + delta);
  };
  const jump = (i: number) => (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    show(i);
  };

  return (
    <div
      className="relative aspect-[4/3] touch-pan-y overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      // Hover/focus is the earliest honest signal that this card is the one
      // being considered. `onPointerEnter` and not `onMouseEnter` so a pen or a
      // trackpad tap counts too; `onFocusCapture` so arriving by keyboard warms
      // the same photos a mouse would.
      onPointerEnter={prime}
      onFocusCapture={prime}
      onClickCapture={(e) => {
        if (!swiped.current) return;
        swiped.current = false;
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <Link href={href} className="relative block h-full w-full focus:outline-none" aria-label={alt}>
        {images.map((src, i) =>
          live.has(i) ? (
            <Image
              key={`${src}-${i}`}
              src={src}
              // Only the visible photo describes the card; the ones stacked
              // behind it are the same home and would repeat the label to a
              // screen reader for no gain.
              alt={i === index ? alt : ""}
              aria-hidden={i !== index}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              // `priority` was deprecated in Next 16 in favour of `preload`,
              // and preload is the wrong tool here anyway: the grid marks its
              // first three or four cards, and four <link rel=preload> in the
              // <head> is four images racing each other and the JS for the same
              // bandwidth. Eager + high priority tells the browser to start
              // these immediately and rank them above the rest, without
              // hoisting them out of document order.
              loading={priority && i === 0 ? "eager" : "lazy"}
              fetchPriority={priority && i === 0 ? "high" : "auto"}
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              className={`object-cover transition duration-300 group-hover:scale-105 ${
                i === index ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : null
        )}
      </Link>

      {overlay}

      {many && (
        <>
          <NavButton dir="prev" onClick={step(-1)} />
          <NavButton dir="next" onClick={step(1)} />
          {/* Each dot is 6px of ink centred in a 28×28 target — the button is
              the target, the <span> is the dot.
              This used to be `px-2 py-2.5 lg:p-0`, which measured 22×26 on touch
              and, because the padding collapsed above `lg`, **6×6 on desktop**.
              Both are under the 24×24 floor of WCAG 2.5.8, and the desktop case
              failed it by a factor of four. Measured, not estimated: the old
              comment here claimed "~28×36px" and the arithmetic never supported
              it (6px dot + 2×8px of `px-2` = 22px).
              The trap was that the ACTIVE dot is `w-4`, so it measured 32px and
              passed — the one you point at while testing by hand is always the
              one that is big enough, which is why this survived several passes.
              28px at every breakpoint, so the target no longer depends on which
              dot is current or on how wide the window is. The row is wider above
              `lg` than it was; that is the honest cost of a real target. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-center pb-2.5 lg:pb-0">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={jump(i)}
                aria-label={`Go to photo ${i + 1}`}
                aria-current={i === index}
                className="pointer-events-auto grid h-7 w-7 place-items-center"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all ${
                    i === index ? "w-4 bg-white" : "w-1.5 bg-white/60 hover:bg-white/90"
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function NavButton({
  dir,
  onClick,
}: {
  dir: "prev" | "next";
  onClick: (e: MouseEvent) => void;
}) {
  const prev = dir === "prev";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={prev ? "Previous photo" : "Next photo"}
      className={`absolute top-1/2 z-10 hidden size-8 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/80 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-safe:opacity-0 motion-safe:group-hover:opacity-100 lg:grid ${
        prev ? "left-2" : "right-2"
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d={prev ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
