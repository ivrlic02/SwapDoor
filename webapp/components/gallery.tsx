"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEventHandler,
  type TouchEvent,
} from "react";
import Image from "next/image";
import { BLUR_DATA_URL } from "@/lib/images";

// Detail-page photo gallery.
//
// Layout is the mosaic every travel site uses — one large photo plus a column of
// smaller ones, with a "Show all photos" button over the corner (Nielsen #2:
// follow the conventions people already know from Airbnb/Booking). On phones it
// collapses to the single large photo, since side tiles that small are unusable.
//
// Clicking any tile opens a full-screen lightbox at THAT photo. Keyboard: ← →
// to move, Esc to close (#4 user control); focus returns to the tile that opened
// it, and body scroll is locked while it's up.
export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const many = images.length > 1;
  // The tile that opened the lightbox, so focus can go back where it started.
  const openerRef = useRef<HTMLElement | null>(null);

  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + images.length) % images.length),
    [images.length]
  );

  // Swipe inside the lightbox. The arrows are a pointer control (see the note
  // on <LightboxNav>); on touch, a full-screen photo is swiped, which is what
  // the card galleries on every other page already do (CRAP repetition).
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const from = touchStart.current;
    touchStart.current = null;
    if (!from || !many) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - from.x;
    const dy = t.clientY - from.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    go(dx < 0 ? 1 : -1);
  };

  const openAt = (i: number) => (e: React.MouseEvent<HTMLButtonElement>) => {
    openerRef.current = e.currentTarget;
    setIndex(i);
    setOpen(true);
  };

  // Closing always returns focus to the tile that opened the lightbox, so a
  // keyboard user lands back where they were instead of at the top of the page.
  function close() {
    setOpen(false);
    openerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        openerRef.current?.focus();
      } else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, go]);

  // The mosaic shows the hero + up to 3 side photos; anything beyond that is
  // reachable through the lightbox (and counted on the last tile).
  const side = images.slice(1, 4);
  const hidden = Math.max(0, images.length - 4);

  return (
    <div>
      <div className="relative">
        {/* The side column is a flex stack rather than fixed grid rows: a
            member-created listing may carry only one or two photos, and with
            hard-coded rows those left an empty cell beside the hero. Now the
            tiles split the column height between them however many there are,
            and a lone photo takes the full width. */}
        <div className="grid gap-2 overflow-hidden rounded-2xl md:h-[420px] md:grid-cols-3 lg:h-[480px]">
          {/* Hero photo — the LCP image on this page, so it loads eagerly. */}
          <button
            type="button"
            onClick={openAt(0)}
            aria-label="Open photo 1 in full screen"
            className={`group relative aspect-[4/3] w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand md:aspect-auto md:h-full ${
              side.length > 0 ? "md:col-span-2" : "md:col-span-3"
            }`}
          >
            <Image
              src={images[0]}
              alt={alt}
              fill
              priority
              quality={90}
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 62vw, 780px"
              className="object-cover transition duration-300 group-hover:brightness-110"
            />
          </button>

          {/* Side tiles — hidden on phones, where they'd be thumbnail-sized. */}
          {side.length > 0 && (
            <div className="hidden md:flex md:h-full md:flex-col md:gap-2">
              {side.map((src, i) => {
                const last = i === side.length - 1;
                return (
                  <button
                    key={src + i}
                    type="button"
                    onClick={openAt(i + 1)}
                    aria-label={`Open photo ${i + 2} in full screen`}
                    className="group relative min-h-0 flex-1 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                      sizes="380px"
                      className="object-cover transition duration-300 group-hover:brightness-110"
                    />
                    {last && hidden > 0 && (
                      <span className="absolute inset-0 grid place-items-center bg-black/55 text-lg font-semibold text-white">
                        +{hidden}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {many && (
          <button
            type="button"
            onClick={openAt(0)}
            className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-lg bg-black/70 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <GridIcon />
            Show all {images.length} photos
          </button>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex touch-pan-y items-center justify-center bg-black/92 p-4"
          onClick={close}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          role="dialog"
          aria-modal="true"
          aria-label="Photo gallery"
        >
          <button
            type="button"
            aria-label="Close gallery"
            onClick={close}
            autoFocus
            // 44px on touch, where it is the only guaranteed way out of a
            // full-screen overlay (Fitts); the desktop size is unchanged.
            className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:size-10"
          >
            ✕
          </button>

          <div
            className="relative h-[78vh] w-full max-w-6xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[index]}
              alt={alt}
              fill
              quality={90}
              sizes="100vw"
              className="object-contain"
            />
          </div>

          {many && (
            <>
              <LightboxNav
                dir="prev"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
              />
              <LightboxNav
                dir="next"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
              />
              {/* Thumbnail strip — recognition rather than recall (#7): you can
                  see which photos are left instead of clicking blindly. */}
              <div
                className="absolute bottom-4 left-1/2 flex max-w-[92vw] -translate-x-1/2 items-center gap-2 overflow-x-auto rounded-xl bg-white/10 p-2 backdrop-blur"
                onClick={(e) => e.stopPropagation()}
              >
                {images.map((src, i) => (
                  <button
                    key={src + i}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Show photo ${i + 1}`}
                    aria-current={i === index}
                    className={`relative size-14 shrink-0 overflow-hidden rounded-lg transition ${
                      i === index ? "ring-2 ring-white" : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <Image src={src} alt="" fill sizes="56px" className="object-cover" />
                  </button>
                ))}
                <span className="px-2 text-sm tabular-nums text-white/80">
                  {index + 1} / {images.length}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function LightboxNav({
  dir,
  onClick,
}: {
  dir: "prev" | "next";
  onClick: MouseEventHandler<HTMLButtonElement>;
}) {
  const prev = dir === "prev";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={prev ? "Previous photo" : "Next photo"}
      // Pointer-only. On a phone these two discs sit on top of a photo that
      // fills the screen, covering the thing they exist to help you look at,
      // for a gesture the reader would have reached for anyway — so on touch
      // the photo is swiped and the thumbnail strip below stays the visible
      // signifier of how many are left (Nielsen #7 over a hidden gesture).
      className={`absolute top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:grid ${
        prev ? "left-4" : "right-4"
      }`}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
