"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { House } from "@/lib/houses";

export type MapBounds = { south: number; west: number; north: number; east: number };

// Presentational map for the Explore results. It plots whatever list it's handed
// (filtering happens in <ExploreView>) and supports:
//  • hover-sync — `activeId` highlights a pin; hovering a pin calls `onHoverHouse`.
//  • "Search this area" — after the user pans/zooms, a button offers to filter to
//    the visible bounds (manual, so results never change out from under them).
//  • fit control — it only re-fits to the results when `fitKey` changes (a filter
//    changed), never when the user is panning or when an area search narrows them.
function pinIcon(active: boolean) {
  const size = active ? 38 : 30;
  return L.divIcon({
    className: `swapdoor-pin${active ? " swapdoor-pin--selected" : ""}`,
    html: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" stroke="#f8fafc" stroke-width="1.2" aria-hidden="true">
      <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z"/>
      <circle cx="12" cy="9" r="2.6" fill="#0b0f1a"/>
    </svg>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -(size - 2)],
  });
}

export default function ExploreMap({
  houses,
  className = "h-[520px]",
  activeId = null,
  onHoverHouse,
  onSearchArea,
  fitKey,
}: {
  houses: House[];
  className?: string;
  activeId?: number | null;
  onHoverHouse?: (id: number | null) => void;
  onSearchArea?: (bounds: MapBounds) => void;
  fitKey?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const markersById = useRef<Map<number, L.Marker>>(new Map());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [userMoved, setUserMoved] = useState(false);
  // True while WE move the map (fitBounds/setView), so the moveend handler can
  // tell a programmatic move from a real user pan/zoom.
  const programmatic = useRef(false);
  const lastFitKey = useRef<string | undefined>(undefined);

  // Latest hover callback in a ref, so re-renders don't re-init the map.
  const onHoverRef = useRef(onHoverHouse);
  useEffect(() => {
    onHoverRef.current = onHoverHouse;
  }, [onHoverHouse]);

  const mappable = useMemo(
    () => houses.filter((h) => typeof h.lat === "number" && typeof h.lng === "number"),
    [houses]
  );

  // Initialize the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [30, 10],
      zoom: 2,
      scrollWheelZoom: true,
      worldCopyJump: true,
    });
    map.on("click", () => setSelectedId(null));
    map.on("moveend", () => {
      if (programmatic.current) {
        // Our own fitBounds/setView (e.g. after a filter change) — clear any
        // stale "search this area" prompt instead of treating it as user intent.
        programmatic.current = false;
        setUserMoved(false);
        return;
      }
      setUserMoved(true);
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 120);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  // Redraw markers when the result set changes; re-fit only when `fitKey` changes
  // (i.e. a filter changed) — never on an area search or a user pan.
  useEffect(() => {
    const map = mapRef.current;
    const group = markersRef.current;
    if (!map || !group) return;

    group.clearLayers();
    markersById.current.clear();

    const points: [number, number][] = [];
    mappable.forEach((h) => {
      const marker = L.marker([h.lat!, h.lng!], { icon: pinIcon(false), title: h.name });
      marker.bindPopup(
        `<div style="min-width:170px;line-height:1.5">
           <strong>${h.name}</strong><br/>
           <span style="color:#555">${h.location}, ${h.country}</span><br/>
           <span>Est. $${h.pricePerNight}/night &middot; ★ ${h.rating}</span><br/>
           <a href="/explore/${h.id}" style="color:#2f6fe0;font-weight:600">View home →</a>
         </div>`
      );
      marker.on("click", () => setSelectedId(h.id));
      marker.on("mouseover", () => onHoverRef.current?.(h.id));
      marker.on("mouseout", () => onHoverRef.current?.(null));
      marker.addTo(group);
      markersById.current.set(h.id, marker);
      points.push([h.lat!, h.lng!]);
    });

    if (fitKey !== lastFitKey.current) {
      lastFitKey.current = fitKey;
      if (points.length === 1) {
        programmatic.current = true;
        map.setView(points[0], 6, { animate: true });
      } else if (points.length > 1) {
        programmatic.current = true;
        map.fitBounds(points, { padding: [48, 48] });
      }
    }
  }, [mappable, fitKey]);

  // Highlight the active (hovered) / selected pin — a cheap setIcon, no redraw.
  // Depends on `mappable` too so the icons re-apply after a redraw.
  useEffect(() => {
    markersById.current.forEach((marker, id) =>
      marker.setIcon(pinIcon(id === activeId || id === selectedId))
    );
    if (selectedId != null) markersById.current.get(selectedId)?.openPopup();
  }, [activeId, selectedId, mappable]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={`w-full rounded-2xl overflow-hidden border border-border z-0 ${className}`}
      />

      {/* Search-this-area — appears only after a real user pan/zoom. */}
      {onSearchArea && userMoved && (
        <button
          type="button"
          onClick={() => {
            const map = mapRef.current;
            if (!map) return;
            const b = map.getBounds();
            onSearchArea({
              south: b.getSouth(),
              west: b.getWest(),
              north: b.getNorth(),
              east: b.getEast(),
            });
            setUserMoved(false);
          }}
          className="absolute left-1/2 top-4 z-[1000] -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-fg shadow-lg shadow-black/30 transition hover:border-brand"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M20 11a8 8 0 1 0-2.3 5.6M20 4v5h-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Search this area
        </button>
      )}

      {mappable.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-surface/95 border border-border rounded-lg px-6 py-4 text-center">
            <p className="font-semibold">No homes match your filters.</p>
            <p className="text-muted text-sm mt-1">Try widening your search, price, or dates.</p>
          </div>
        </div>
      )}
    </div>
  );
}
