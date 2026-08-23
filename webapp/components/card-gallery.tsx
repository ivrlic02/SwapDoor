"use client";

import { useRef, useState, type MouseEvent, type ReactNode, type TouchEvent } from "react";
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
    setIndex((i) => (i + (dx < 0 ? 1 : -1) + images.length) % images.length);
  };

  const step = (delta: number) => (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIndex((i) => (i + delta + images.length) % images.length);
  };
  const jump = (i: number) => (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIndex(i);
  };

  return (
    <div
      className="relative aspect-[4/3] touch-pan-y overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClickCapture={(e) => {
        if (!swiped.current) return;
        swiped.current = false;
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <Link href={href} className="relative block h-full w-full focus:outline-none" aria-label={alt}>
        <Image
          src={images[index]}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={priority && index === 0}
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          className="object-cover transition duration-300 group-hover:scale-105"
        />
      </Link>

      {overlay}

      {many && (
        <>
          <NavButton dir="prev" onClick={step(-1)} />
          <NavButton dir="next" onClick={step(1)} />
          {/* Each dot is 6px of ink inside a ~28×36px target on touch — the
              padding is the button, the <span> is the dot. Above `lg` the
              padding collapses and the geometry is exactly what it was. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-0.5 pb-2.5 lg:bottom-2 lg:gap-1.5 lg:pb-0">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={jump(i)}
                aria-label={`Go to photo ${i + 1}`}
                aria-current={i === index}
                className="pointer-events-auto grid place-items-center px-2 py-2.5 lg:p-0"
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
