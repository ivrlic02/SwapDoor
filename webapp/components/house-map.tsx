"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// "Where you'll be" — a single-listing map for the detail page.
//
// Two deliberate differences from the Explore map:
//  • Scroll-wheel zoom is OFF. This map sits mid-article, and a map that eats
//    the page scroll traps the reader (Nielsen #4). Zoom buttons + drag still
//    work, and a keyboard/pinch user is unaffected.
//  • The home is drawn as an approximate CIRCLE, not an exact pin. Real swap
//    platforms never publish a stranger's address, and Sarah / Mateo & Elena
//    weigh safety heavily — showing the neighbourhood answers "what's around
//    me?" without exposing the host.
export default function HouseMap({
  lat,
  lng,
  label,
  className = "h-[340px]",
}: {
  lat: number;
  lng: number;
  label: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 13,
      scrollWheelZoom: false,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    L.circle([lat, lng], {
      radius: 700,
      color: "var(--color-brand)",
      weight: 2,
      fillColor: "var(--color-brand)",
      fillOpacity: 0.18,
    })
      .addTo(map)
      .bindTooltip(label, { direction: "top" });

    mapRef.current = map;
    // Re-measure once the container has its final size. The timer MUST be
    // cleared on unmount: this map is now also the listing form's "is this the
    // right place?" preview, which disappears the moment you leave step 1 —
    // and invalidateSize() on a map that has already been removed throws
    // (`_leaflet_pos` of undefined) into the console.
    const measure = setTimeout(() => map.invalidateSize(), 120);

    return () => {
      clearTimeout(measure);
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, label]);

  return (
    <div
      ref={containerRef}
      className={`z-0 w-full overflow-hidden rounded-2xl border border-border ${className}`}
    />
  );
}
