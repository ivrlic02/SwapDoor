"use client";

import { Hero } from "./hero";
import { MapSection } from "./map-section";
import { placeOf, useHomeSearch, whenSummary } from "./home-search-context";
import type { House } from "@/lib/houses";

// Connects the shared search to the map below it: submitting the hero (or the
// docked nav pill) filters the live map by "where" and scrolls to it; the map
// exposes a "see as a list" link that carries the full query to /explore so
// nothing the user typed (when / guests) is thrown away.
export function HomeHeroMap({ houses }: { houses: House[] }) {
  const { committed, clear } = useHomeSearch();

  const place = placeOf(committed);

  const params = new URLSearchParams();
  if (place.text) params.set("q", place.text);
  // A destination picked from the panel keeps its city/country/code across the
  // hop to /explore, so a search that lands empty there can still widen to the
  // country. Without these three the link would arrive as free text and the
  // widening step would have nothing to widen to.
  if (place.city) params.set("city", place.city);
  if (place.country) params.set("country", place.country);
  if (place.countryCode) params.set("cc", place.countryCode);
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
        place={place}
        guests={Number(committed.who) || 0}
        whenLabel={whenLabel}
        onClear={clear}
        exploreHref={exploreHref}
      />
    </>
  );
}
