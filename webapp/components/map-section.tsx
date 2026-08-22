"use client";

import dynamic from "next/dynamic";
import type { House } from "@/lib/houses";
import { MapSkeleton } from "@/components/skeletons";

// Leaflet touches `window`/`document`, so the map is loaded client-side only.
// While its JS + tiles load, show a shimmering block the same size as the map.
const HomeMap = dynamic(() => import("./home-map"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export function MapSection({
  houses,
  query,
  guests,
  whenLabel,
  onClear,
  exploreHref,
}: {
  houses: House[];
  query: string;
  guests: number;
  whenLabel: string;
  onClear: () => void;
  exploreHref: string;
}) {
  return (
    <section id="home-map" className="scroll-mt-20 px-6 py-20 bg-surface-2">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-center text-3xl font-bold mb-3">Find homes on the map</h2>
        <p className="text-center text-muted mb-10">
          Search above and the map updates live — see available swaps around the world.
        </p>
        <HomeMap
          houses={houses}
          query={query}
          guests={guests}
          whenLabel={whenLabel}
          onClear={onClear}
          exploreHref={exploreHref}
        />
      </div>
    </section>
  );
}
