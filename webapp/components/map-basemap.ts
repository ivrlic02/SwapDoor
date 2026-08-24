import L from "leaflet";
import { THEME_EVENT } from "@/lib/theme";

// The one place the site decides what a map is made of.
//
// All three Leaflet maps — the home map, the Explore map and the listing
// page's "Where you'll be" — used to repeat the same CARTO `dark_all` URL and
// the same attribution string. That was already three copies of one decision;
// with a second theme it would have been six, and the failure mode is silent:
// darkening (or lightening) two of the three leaves the site with maps that
// disagree about what page they are on, which is exactly the inconsistency the
// 2026-08-16 pass fixed when it found the maps still serving *light* Positron
// tiles on a dark site (Nielsen #2).
//
// CARTO publishes the pair as a matched set — Dark Matter and Positron are the
// same cartography at two lightnesses — so the swap is a URL and nothing else:
// same zoom levels, same labels, same attribution, no second provider to
// explain in the report.
const TILES: Record<"dark" | "light", string> = {
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
};

const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function tileUrl(): string {
  const light =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme") === "light";
  return TILES[light ? "light" : "dark"];
}

/**
 * Adds the basemap to a map and keeps it on the current theme.
 *
 * Returns a teardown that must be called from the effect's cleanup — it removes
 * the theme listener. (The tile layer itself goes with `map.remove()`, so this
 * does not touch it.)
 *
 * The listener calls `setUrl`, which swaps the template on the existing layer
 * and redraws in place, rather than removing and re-adding a layer: a fresh
 * layer would drop the tile cache, re-request everything, and flash the
 * container's background through while it did.
 */
export function addBasemap(map: L.Map): () => void {
  const layer = L.tileLayer(tileUrl(), { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);

  const follow = () => layer.setUrl(tileUrl());
  window.addEventListener(THEME_EVENT, follow);

  return () => window.removeEventListener(THEME_EVENT, follow);
}
