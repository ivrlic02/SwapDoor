"use client";

import { useEffect, useRef } from "react";
import { useHomeSearch } from "./home-search-context";
import { SearchFields } from "./search-fields";
import { Mascot } from "./hero-decor";
import { Globe } from "./globe";
import type { House } from "@/lib/house-types";

export function Hero({ houses }: { houses: House[] }) {
  const { setCollapsed } = useHomeSearch();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // When the hero search bar scrolls up under the nav, dock the compact pill.
  // IntersectionObserver fires only on enter/leave — no per-pixel scroll work.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setCollapsed(!entry.isIntersecting),
      // Flip a touch before the bar is fully gone (nav is ~64px tall).
      { rootMargin: "-72px 0px 0px 0px", threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [setCollapsed]);

  return (
    // 76vh, not 88vh: at 88 the first screen was the hero and nothing else, so
    // there was no cue that the page continued at all. This leaves the next
    // section's heading visibly above the fold on a normal laptop while still
    // giving the headline a full screen of its own to sit in.
    //
    // Below `lg` that reasoning inverts. There are no decorations there (the
    // mascot and the globe are lg-only), so 76vh of a portrait screen is a
    // headline, a line of copy, a search bar — and then a large measured hole:
    // ~200px of nothing under the bar on a 768×1024 tablet, where the whole
    // section holds 364px of content. So below `lg` there is no minimum at all:
    // the hero is its own content plus honest padding, and the map section
    // arrives at the fold rather than a screen and a half later (Nielsen #9 —
    // every extra unit of empty competes with the relevant ones).
    <section className="relative flex items-center justify-center overflow-hidden px-6 py-14 text-center sm:py-20 lg:min-h-[76vh] lg:py-20">
      {/* Ambient brand glow — depth without clutter (aesthetic & minimalist) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 0%, color-mix(in srgb, var(--color-brand) 22%, transparent) 0%, transparent 70%)",
        }}
      />

      {/* Both decorations are anchored to the whole <section> and sized from the
          viewport, so they mirror each other in the two gutters and centre
          against the hero rather than against one line of text.

          The mascot used to hang off the headline itself (`right-full` inside
          the h1's wrapper), which pinned it to the *title's* midpoint — near the
          top of a section that is much taller than the title, so it floated up
          and out of the composition. Anchoring it here drops it to the hero's
          own centre and lets it grow taller, since its height is no longer
          bounded by a line of text. `.hero-mascot` / `.hero-globe` derive their
          widths from the gutter beside the fixed 864px headline — see
          globals.css. */}
      {/* No `left-*` class — `.hero-mascot` sets `left` itself, so the art is
          centred in its gutter instead of pinned to the window edge. */}
      <Mascot className="hero-mascot pointer-events-none absolute top-1/2 hidden -translate-y-1/2 opacity-35 lg:block" />
      <Globe houses={houses} className="hero-globe pointer-events-none absolute right-1.5 top-1/2 hidden aspect-square -translate-y-1/2 lg:block" />

      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          Swap homes. Travel the world.
        </h1>

        {/* Says what the product actually is. The previous line ("Authentic
            local stays in 180+ countries") opened the site with a number the
            Stats section two screens down has to disclaim as invented — a
            credibility hole on the one page whose job is trust (Nielsen #1). */}
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
          Swap your home for someone else&rsquo;s. No nightly rate, no booking fees.
        </p>

        {/* Full search bar. Shared with the nav drop-down via context. */}
        <SearchFields variant="hero" />

        {/* Watched by the observer above — marks where the bar "docks". */}
        <div ref={sentinelRef} aria-hidden className="h-px w-full" />
      </div>
    </section>
  );
}
