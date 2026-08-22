"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { House } from "@/lib/houses";
import { buttonClass } from "@/components/button";

// Leaflet renders tiles as plain <img> DOM elements (no WebGL), so it displays
// in every browser/preview — unlike a GL map, which needs WebGL. Tiles are
// CARTO's "Dark Matter" basemap so the map sits on our dark theme instead of
// being a bright island (consistent with the Explore map, Nielsen #2).
// Pin is an inline SVG divIcon; fill + selected bounce are driven by CSS (see
// globals.css) so we can theme with tokens. A selected/searched pin is larger,
// a different colour, and springs.
function pinIcon(selected: boolean) {
  const size = selected ? 36 : 30;
  return L.divIcon({
    className: `swapdoor-pin${selected ? " swapdoor-pin--selected" : ""}`,
    html: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" stroke="#f8fafc" stroke-width="1.2" aria-hidden="true">
      <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z"/>
      <circle cx="12" cy="9" r="2.6" fill="#0b0f1a"/>
    </svg>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -(size - 2)],
  });
}

export default function HomeMap({
  houses,
  // Driven by the hero search above — the map has no search box of its own.
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
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const meRef = useRef<L.CircleMarker | null>(null);
  const markersById = useRef<Map<number, L.Marker>>(new Map());

  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  // A pin the user clicked (persisted highlight). Search matches also highlight.
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Only homes that actually have coordinates can be mapped.
  const mappable = useMemo(
    () => houses.filter((h) => typeof h.lat === "number" && typeof h.lng === "number"),
    [houses]
  );

  // The search actually drives the map: destination text *and* guest capacity.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mappable.filter((h) => {
      const matchesText = !q || `${h.name} ${h.location} ${h.country}`.toLowerCase().includes(q);
      const fitsGuests = guests <= 0 || h.maxGuests >= guests;
      return matchesText && fitsGuests;
    });
  }, [mappable, query, guests]);

  // Everything the user committed, so the map makes the active search visible.
  const criteria = [
    query.trim(),
    whenLabel,
    guests > 0 ? `${guests} guest${guests > 1 ? "s" : ""}` : "",
  ].filter(Boolean);

  // Initialize the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [30, 10],
      zoom: 2,
      scrollWheelZoom: true,
      worldCopyJump: true,
    });

    // Clicking empty map (not a pin) clears the selection.
    map.on("click", () => setSelectedId(null));

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Leaflet needs a nudge when its container starts hidden/animating.
    setTimeout(() => map.invalidateSize(), 120);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
      meRef.current = null;
    };
  }, []);

  // Redraw markers whenever the filtered set changes.
  useEffect(() => {
    const map = mapRef.current;
    const group = markersRef.current;
    if (!map || !group) return;

    group.clearLayers();
    markersById.current.clear();

    const points: [number, number][] = [];
    filtered.forEach((h) => {
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
      marker.addTo(group);
      markersById.current.set(h.id, marker);
      points.push([h.lat!, h.lng!]);
    });

    if (points.length === 1) {
      map.setView(points[0], 6, { animate: true });
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [48, 48] });
    }
  }, [filtered]);

  // Highlight the selected pin (clicked) and any active search matches: swaps
  // the icon (→ different colour + larger), which replays the bounce, and opens
  // the popup for a clicked pin. Runs on selection/search change — no re-fit.
  useEffect(() => {
    const queryActive = query.trim() !== "";
    markersById.current.forEach((marker, id) => {
      marker.setIcon(pinIcon(id === selectedId || queryActive));
    });
    if (selectedId != null) markersById.current.get(selectedId)?.openPopup();
  }, [filtered, selectedId, query]);

  function locateMe() {
    if (!("geolocation" in navigator)) {
      setGeoError("Geolocation isn't supported by your browser.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const map = mapRef.current;
        if (!map) return;
        const { latitude, longitude } = pos.coords;
        meRef.current?.remove();
        meRef.current = L.circleMarker([latitude, longitude], {
          radius: 8,
          color: "#2f6fe0",
          fillColor: "#63b3ed",
          fillOpacity: 0.9,
          weight: 2,
        })
          .addTo(map)
          .bindPopup("You are here")
          .openPopup();
        map.setView([latitude, longitude], 5, { animate: true });
      },
      () => {
        setLocating(false);
        setGeoError("Couldn't get your location — check your browser permissions.");
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  return (
    <div>
      {/* Controls — the map is driven by the hero search, so there's no search
          box here. Left: live status (+ the active term and a clear); right:
          jump to the full list, or center on the user's GPS location. */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted" aria-live="polite">
            Showing <span className="text-fg font-semibold">{filtered.length}</span> of{" "}
            {mappable.length} homes
            {criteria.length > 0 && (
              <>
                {" "}
                for <span className="text-fg font-medium">{criteria.join(" · ")}</span>
              </>
            )}
          </span>
          {criteria.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onClear();
                setSelectedId(null);
              }}
              className={buttonClass("ghost", "sm")}
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={locateMe}
            disabled={locating}
            className={buttonClass("secondary")}
          >
            {locating ? "Locating…" : "📍 Use my location"}
          </button>
          <Link href={exploreHref} className={buttonClass("primary")}>
            See all as a list →
          </Link>
        </div>
      </div>

      {geoError && (
        <p className="mb-3 text-sm text-danger" role="alert">
          {geoError}
        </p>
      )}

      {/* Map */}
      <div className="relative">
        <div
          ref={containerRef}
          className="h-[520px] w-full rounded-xl overflow-hidden border border-border z-0"
        />
        {filtered.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-surface/95 border border-border rounded-lg px-6 py-4 text-center">
              <p className="font-semibold">No homes match your search.</p>
              <p className="text-muted text-sm mt-1">Try a different place or fewer guests.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
