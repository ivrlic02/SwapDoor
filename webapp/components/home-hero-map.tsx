"use client";

import { Hero } from "./hero";
import { MapSection } from "./map-section";
import { useHomeSearch, whenSummary } from "./home-search-context";
import type { House } from "@/lib/houses";

// Connects the shared search to the map below it: submitting the hero (or the
// docked nav pill) filters the live map by "where" and scrolls to it; the map
// exposes a "see as a list" link that carries the full query to /explore so
// nothing the user typed (when / guests) is thrown away.
export function HomeHeroMap({ houses }: { houses: House[] }) {
  const { committed, clear } = useHomeSearch();

  const params = new URLSearchParams();
  if (committed.where.trim()) params.set("q", committed.where.trim());
  if (committed.when) params.set("date", committed.when);
  if (committed.checkout) params.set("checkout", committed.checkout);
  if (committed.stay) params.set("stay", committed.stay);
  if (committed.who && Number(committed.who) > 0) params.set("guests", committed.who);
  const exploreHref = params.toString() ? `/explore?${params}` : "/explore";

  const whenLabel = whenSummary(committed);

  return (
    <>
      <Hero houses={houses} />
      <MapSection
        houses={houses}
        query={committed.where}
        guests={Number(committed.who) || 0}
        whenLabel={whenLabel}
        onClear={clear}
        exploreHref={exploreHref}
      />
    </>
  );
}
