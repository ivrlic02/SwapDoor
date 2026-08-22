"use client";

import dynamic from "next/dynamic";

// A small map used to confirm a place *while it is being typed* — the listing
// form's "is this where you mean?" check.
//
// It reuses components/house-map.tsx (dark CARTO tiles, an approximate circle
// rather than an exact pin, scroll-zoom off), so the host sees their home the
// same way a guest will on the listing page — the same picture, in the same
// style, before and after publishing (Nielsen #2).
//
// Separate from HouseMapSection only because that one loads the 520px
// MapSkeleton, which is taller than this whole panel.
const HouseMap = dynamic(() => import("./house-map"), {
  ssr: false,
  loading: () => <div className="skeleton h-44 w-full rounded-2xl border border-border" />,
});

export function MiniMap({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  return <HouseMap lat={lat} lng={lng} label={label} className="h-44" />;
}
