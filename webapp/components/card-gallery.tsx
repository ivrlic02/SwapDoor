"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BLUR_DATA_URL } from "@/lib/images";

// Swipeable photo area for a listing card. The current photo is a <Link> (click
// = open the listing, keyboard-accessible), while the arrows/dots are buttons
// that only change the photo (stopPropagation, and they sit OUTSIDE that inner
// Link so there's no nested-interactive HTML). Arrows reveal on hover on
// desktop and stay visible on touch screens.
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
    <div className="relative aspect-[4/3] overflow-hidden">
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
          <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex items-center justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={jump(i)}
                aria-label={`Go to photo ${i + 1}`}
                aria-current={i === index}
                className={`pointer-events-auto h-1.5 rounded-full transition-all ${
                  i === index ? "w-4 bg-white" : "w-1.5 bg-white/60 hover:bg-white/90"
                }`}
              />
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
      className={`absolute top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/80 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-safe:opacity-0 motion-safe:group-hover:opacity-100 max-md:opacity-100 ${
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
