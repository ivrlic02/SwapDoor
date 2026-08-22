"use client";

import { useState } from "react";
import Image from "next/image";
import { PlayIcon } from "@/components/icons";

// A YouTube embed that does NOT load YouTube until it is asked to.
//
// A plain <iframe src="youtube.com/embed/…"> pulls roughly a megabyte of
// third-party JavaScript into the page on load, whether or not anyone watches —
// on the blog that would be the single heaviest thing on a page otherwise made
// of text and one photo, and it is exactly what a PageSpeed run (still an open
// course deliverable, Handoff "What's left to do" #4) reports as unused
// JavaScript and third-party blocking time.
//
// So this renders the poster frame and a play button, and swaps in the real
// iframe on the first click, with `autoplay=1` so the click that revealed the
// player is also the click that starts it — one action, one result (Nielsen #3,
// visibility of system status: the thing you pressed is the thing that happened).

export function VideoEmbed({
  id,
  title,
  caption,
}: {
  id: string;
  title: string;
  caption?: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <figure className="my-10">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-surface-2">
        {playing ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 h-full w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
            aria-label={`Play video: ${title}`}
          >
            <Image
              // hqdefault exists for every video; maxresdefault does not, and a
              // missing one renders as a grey 120×90 placeholder stretched to
              // full width. hq is 480×360 and upscales acceptably behind the
              // dimming layer.
              src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover transition duration-300 group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition group-hover:from-black/60" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/90 text-white shadow-lg shadow-black/40 transition group-hover:scale-110 group-hover:bg-brand">
                <PlayIcon className="h-9 w-9 translate-x-[1px]" />
              </span>
            </span>
            <span className="absolute inset-x-0 bottom-0 p-4 text-left text-sm font-semibold text-white">
              {title}
            </span>
          </button>
        )}
      </div>
      {caption && (
        <figcaption className="mt-3 text-center text-sm text-muted">{caption}</figcaption>
      )}
    </figure>
  );
}
