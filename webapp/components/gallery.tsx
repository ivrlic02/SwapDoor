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

// The lightbox photo sits in a `max-w-6xl` box (1152px) with 16px of padding
// either side, so below 1184px of viewport it is the viewport width and above
// it is a constant 1152. Declared once because the hidden pre-warm copy has to
// resolve to the SAME srcset candidate as the real one, or the warm-up fetches
// a file the lightbox will not use.
const LIGHTBOX_SIZES = "(max-width: 1184px) 100vw, 1152px";
const LIGHTBOX_WIDTH = 1152;

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

  // WHICH PHOTOS THE LIGHTBOX HAS IN THE DOM.
  //
  // It used to render `images[index]` alone, so every press of → threw away one
  // <Image> and mounted another: the request for the next photo started at the
  // instant the reader asked to see it, and they watched a black rectangle for
  // as long as the optimizer took (measured cold against production: 1.0–1.8s
  // at these sizes). Pressing ← then paid the same price for a photo already
  // downloaded once.
  //
  // Now the current photo, its two neighbours, and everything already looked at
  // are all mounted and faded between. The next photo is fetched while the
  // reader is still looking at this one, so the arrow answers immediately, and
  // going back is free. Unlike the card galleries this is not gated on hover:
  // opening a full-screen gallery IS the statement of intent.
  const [live, setLive] = useState<ReadonlySet<number>>(() => new Set());

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
        return next ?? prev;
      });
    },
    [images.length]
  );

  // Clicking "Show all photos" used to be a cold start: the lightbox asks for a
  // much larger rendition than the mosaic tile does (a different width, so a
  // different cache entry), and that request only began once the overlay was
  // already on screen and black. Hovering the mosaic — or tabbing onto it — is
  // the reader deciding, so the first full-size photo is fetched then, into a
  // 1px box nobody sees. `sizes` is evaluated against the viewport rather than
  // against the element, so the hidden copy resolves to exactly the URL the
  // lightbox will ask for and the overlay opens on a browser cache hit.
  const [warm, setWarm] = useState(false);
  const warmUp = useCallback(() => setWarm(true), []);

  // Turn the page AND pull in that photo's own neighbours, so a reader holding
  // → down stays ahead of the network instead of behind it. Written against
  // `index` rather than as a `setIndex` updater because it has a second effect
  // besides moving the cursor, and an updater is supposed to be pure — the cost
  // is that the key handler below re-binds on each photo, which is nothing.
  const go = useCallback(
    (delta: number) => {
      const next = (index + delta + images.length) % images.length;
      setIndex(next);
      reveal(next, next + 1, next - 1);
    },
    [index, images.length, reveal]
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
    reveal(i, i + 1, i - 1);
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
      <div className="relative" onPointerEnter={warmUp} onFocusCapture={warmUp}>
        {/* The side column is a flex stack rather than fixed grid rows: a
            member-created listing may carry only one or two photos, and with
            hard-coded rows those left an empty cell beside the hero. Now the
            tiles split the column height between them however many there are,
            and a lone photo takes the full width. */}
        <div className="grid gap-2 overflow-hidden rounded-2xl md:h-[420px] md:grid-cols-3 lg:h-[480px]">
          {/* Hero photo — the LCP image on this page, so it loads eagerly.
              `preload` and not the `priority` prop: Next 16 deprecated the
              latter in favour of the former, and this is the one image on the
              site preload is genuinely for — a single, unambiguous LCP element
              that should start downloading from the <head> rather than waiting
              to be discovered in the body. */}
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
              preload
              fetchPriority="high"
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

        {/* The pre-warmed full-size photo 1. One pixel, invisible, no pointer
            events — it exists only so the browser has the file by the time the
            overlay opens. It is dropped the moment the lightbox mounts, which
            renders the same URL for real. */}
        {warm && !open && (
          <span aria-hidden className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0">
            <Image
              src={images[0]}
              alt=""
              width={LIGHTBOX_WIDTH}
              height={LIGHTBOX_WIDTH}
              quality={90}
              sizes={LIGHTBOX_SIZES}
              // Explicitly eager: a 1px element is a poor lazy-loading target,
              // and starting this fetch immediately is the entire point.
              loading="eager"
              className="h-px w-px"
            />
          </span>
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
            {images.map((src, i) =>
              live.has(i) ? (
                <Image
                  key={`${src}-${i}`}
                  src={src}
                  alt={i === index ? alt : ""}
                  aria-hidden={i !== index}
                  fill
                  quality={90}
                  // Was `100vw`, which is a claim this element does not make:
                  // the box is `max-w-6xl`, so above 1152px of viewport the
                  // photo never gets wider than 1152 CSS pixels. Telling the
                  // browser otherwise had it picking the 1920 and 3840
                  // renditions on ordinary laptops — the two slowest and
                  // heaviest entries in the whole pipeline (3840 measured at
                  // 2.3s cold) — to paint an image half that size.
                  sizes={LIGHTBOX_SIZES}
                  className={`object-contain transition-opacity duration-200 ${
                    i === index ? "opacity-100" : "opacity-0"
                  }`}
                />
              ) : null
            )}
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
                    onClick={() => {
                      setIndex(i);
                      reveal(i, i + 1, i - 1);
                    }}
                    // Hovering a thumbnail is a reader deciding; start the
                    // full-size fetch there rather than on the click.
                    onPointerEnter={() => reveal(i)}
                    aria-label={`Show photo ${i + 1}`}
                    aria-current={i === index}
                    className={`relative size-14 shrink-0 overflow-hidden rounded-lg transition ${
                      i === index ? "ring-2 ring-white" : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    {/* Fixed dimensions rather than `fill` + `sizes`: a 56px
                        thumbnail has no use for the ten-width responsive
                        ladder, and there is one of these per photo. */}
                    <Image
                      src={src}
                      alt=""
                      width={56}
                      height={56}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
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
