"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { House } from "@/lib/houses";
import { isPlaceSet, placeMatches, type PlaceFilter } from "@/lib/place-filter";
import { buttonClass } from "@/components/button";
import { LocateIcon } from "@/components/icons";
import { addBasemap } from "@/components/map-basemap";
import { createClusterGroup, markActiveClusters, openMarkerPopup } from "@/components/map-clusters";

// Leaflet renders tiles as plain <img> DOM elements (no WebGL), so it displays
// in every browser/preview — unlike a GL map, which needs WebGL. Tiles are
// CARTO's basemap, in whichever of its two lightnesses the current theme calls
// for, so the map sits on the theme instead of being a bright (or, in light
// mode, a black) island. The choice and the theme listener live once in
// components/map-basemap.ts, shared with the Explore and listing maps
// (Nielsen #2).
// Homes sharing a spot are grouped into one numbered mark rather than stacked
// invisibly on top of each other; that decision, and why zooming alone could
// never fix it, live once in components/map-clusters.ts — shared with Explore
// for the same consistency reason as the basemap.
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
  place,
  guests,
  whenLabel,
  onClear,
  exploreHref,
}: {
  houses: House[];
  place: PlaceFilter;
  guests: number;
  whenLabel: string;
  onClear: () => void;
  exploreHref: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.MarkerClusterGroup | null>(null);
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

  // The search actually drives the map: destination *and* guest capacity. The
  // destination goes through the same matcher Explore uses (lib/place-filter),
  // so a picked city means the same thing on both screens — it used to be an
  // `includes()` over `${name} ${location} ${country}` here and an identical
  // copy over there, two places to keep in step and one of them always about
  // to be forgotten (Nielsen #2).
  const filtered = useMemo(
    () =>
      mappable.filter(
        (h) => placeMatches(h, place, "exact") && (guests <= 0 || h.maxGuests >= guests)
      ),
    // The four strings, not the object: `place` is rebuilt on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mappable, place.text, place.city, place.country, place.countryCode, guests]
  );

  // Derived out here rather than inside the highlight effect below: the effect
  // needs the boolean, not the object, and depending on a `place` rebuilt every
  // render would re-run it every render.
  const searchActive = isPlaceSet(place);

  // Everything the user committed, so the map makes the active search visible.
  const criteria = [
    place.text.trim(),
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

    const unfollowTheme = addBasemap(map);

    markersRef.current = createClusterGroup().addTo(map);
    mapRef.current = map;

    // Leaflet needs a nudge when its container starts hidden/animating.
    setTimeout(() => map.invalidateSize(), 120);

    return () => {
      unfollowTheme();
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
    // One batched `addLayers` rather than N inserts — a cluster group re-buckets
    // on each one, which is why the plugin documents the bulk call as the path
    // to use.
    const batch: L.Marker[] = [];
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
      batch.push(marker);
      markersById.current.set(h.id, marker);
      points.push([h.lat!, h.lng!]);
    });
    group.addLayers(batch);

    if (points.length === 1) {
      map.setView(points[0], 6, { animate: true });
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [48, 48] });
    }
  }, [filtered]);

  // Highlight the selected pin (clicked) and any active search matches: swaps
  // the icon (→ different colour + larger), which replays the bounce, and opens
  // the popup for a clicked pin. Runs on selection/search change — no re-fit.
  //
  // Clusters carry the same mark, so a search whose matches got grouped still
  // reads as "these are your results" instead of leaving the highlight on
  // whichever homes happened not to be clustered.
  useEffect(() => {
    const group = markersRef.current;
    const container = containerRef.current;
    const isActive = (id: number) => id === selectedId || searchActive;

    markersById.current.forEach((marker, id) => marker.setIcon(pinIcon(isActive(id))));
    if (group && container) markActiveClusters(container, group, markersById.current, isActive);
    if (selectedId != null) {
      const marker = markersById.current.get(selectedId);
      if (group && marker) openMarkerPopup(group, marker);
    }
  }, [filtered, selectedId, searchActive]);

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

        {/* Two equal halves on a phone rather than two shrink-wrapped buttons
            pushed to one edge: it puts both on the same alignment as the map
            below them (CRAP alignment) and makes each a half-width target
            instead of a 40px-tall pill (Fitts). Unchanged from `lg` up. */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={locateMe}
            disabled={locating}
            className={buttonClass("secondary", "md", "flex-1 py-3 sm:flex-none sm:py-2.5")}
          >
            {locating ? (
              "Locating…"
            ) : (
              <>
                {/* Was a raw 📍. Same defect the icon set was written to fix:
                    an OS-drawn glyph as the most prominent mark on a control,
                    beside a page that is otherwise all traced vector. */}
                <LocateIcon aria-hidden className="mr-1.5 inline size-4 align-[-2px]" />
                Use my location
              </>
            )}
          </button>
          <Link href={exploreHref} className={buttonClass("primary", "md", "flex-1 py-3 sm:flex-none sm:py-2.5")}>
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
          // 520px is right for a landscape screen where the fitted world is
          // taller than the box. On a portrait phone the same 520 leaves the
          // world floating in the middle of a mostly empty container, so the
          // height steps down with the viewport instead (the leftover is also
          // no longer light grey — see the mobile block in globals.css).
          className="h-[320px] w-full rounded-xl overflow-hidden border border-border z-0 sm:h-[420px] lg:h-[520px]"
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
