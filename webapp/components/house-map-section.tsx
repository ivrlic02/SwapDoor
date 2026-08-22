"use client";

import dynamic from "next/dynamic";
import { MapSkeleton } from "@/components/skeletons";

// Client wrapper so the server page can drop a map into the article: Leaflet
// touches `window`, so it can only be loaded with `ssr: false` — which is only
// allowed inside a Client Component.
const HouseMap = dynamic(() => import("./house-map"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export function HouseMapSection({
  lat,
  lng,
  label,
  className,
}: {
  lat: number;
  lng: number;
  label: string;
  className?: string;
}) {
  return <HouseMap lat={lat} lng={lng} label={label} className={className} />;
}
