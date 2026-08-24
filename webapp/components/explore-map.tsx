"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { House } from "@/lib/houses";
import { addBasemap } from "@/components/map-basemap";
import { createClusterGroup, markActiveClusters, openMarkerPopup } from "@/components/map-clusters";

export type MapBounds = { south: number; west: number; north: number; east: number };

// Presentational map for the Explore results. It plots whatever list it's handed
// (filtering happens in <ExploreView>) and supports:
//  • clustering — homes at (or near) one point become one numbered mark that
//    opens on click; see components/map-clusters.ts for why plain markers could
//    not stay.
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
  const markersRef = useRef<L.MarkerClusterGroup | null>(null);
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

    const unfollowTheme = addBasemap(map);

    const group = createClusterGroup();
    // Clicking a cluster zooms to its children (or spiderfies them). That is a
    // move we made, not a frame the user chose, so it must not raise "Search
    // this area" — they asked to see *those homes*, and filtering to the box
    // that resulted would only drop the ones just outside it.
    group.on("clusterclick", () => {
      programmatic.current = true;
    });
    // …except when the click spiderfied instead of zooming, which moves nothing
    // and so never reaches the `moveend` that clears the flag. Left set, it
    // would swallow the user's next real pan.
    group.on("spiderfied", () => {
      programmatic.current = false;
    });
    group.addTo(map);

    markersRef.current = group;
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 120);

    return () => {
      unfollowTheme();
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
    // Built as a batch and handed over in one `addLayers` call: a cluster group
    // re-buckets on every insert, so adding one at a time is the plugin's own
    // documented slow path.
    const batch: L.Marker[] = [];
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
      batch.push(marker);
      markersById.current.set(h.id, marker);
      points.push([h.lat!, h.lng!]);
    });
    group.addLayers(batch);

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
  //
  // `markActiveClusters` is the clustered half of the same job: a highlighted
  // pin that happens to be inside a collapsed cluster is not on the map, so the
  // mark goes on the cluster instead and hover-sync keeps working for every
  // home rather than only the ungrouped ones.
  useEffect(() => {
    const group = markersRef.current;
    const container = containerRef.current;
    const isActive = (id: number) => id === activeId || id === selectedId;

    markersById.current.forEach((marker, id) => marker.setIcon(pinIcon(isActive(id))));
    if (group && container) markActiveClusters(container, group, markersById.current, isActive);
    if (selectedId != null) {
      const marker = markersById.current.get(selectedId);
      if (group && marker) openMarkerPopup(group, marker);
    }
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
          className="absolute left-1/2 top-4 z-[1000] -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-fg shadow-lg shadow-shade/30 transition hover:border-brand"
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
