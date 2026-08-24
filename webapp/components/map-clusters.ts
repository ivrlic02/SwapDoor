import L from "leaflet";
// The plugin extends the `L` imported above — both this and `leaflet` resolve to
// the same module instance, so `L.markerClusterGroup` exists after this line.
import "leaflet.markercluster";
// ONLY the layout/animation stylesheet. The plugin also ships
// MarkerCluster.Default.css, whose entire content is hardcoded green/yellow/
// orange cluster fills — the one thing this project has spent three passes
// removing from its maps (see the `.leaflet-container` and `.leaflet-bar` blocks
// in globals.css). The look lives in `.swapdoor-cluster` instead, on tokens, so
// it follows the theme like everything else.
import "leaflet.markercluster/dist/MarkerCluster.css";

// The one place the site decides what happens when several homes sit on the
// same spot — the sibling of components/map-basemap.ts, and there for the same
// reason: the home map and the Explore map must answer that question
// identically or the same pin means two different things on two screens
// (Nielsen #2).
//
// WHY THIS EXISTS AT ALL. Both maps drew one `L.marker` per house into a plain
// `L.layerGroup`. Leaflet has no notion of two markers occupying one point: it
// stacks them, so N homes in one city rendered as one visible pin and every
// click opened the topmost home's popup. The other N-1 were on the map and
// unreachable — a Gulf of Evaluation gap where the map said "one home here"
// and the truth was three.
//
// And it is not a near-miss that a bit of zoom would fix. A listing that picks
// its city from the Country → City picker inherits that CITY's coordinates
// (components/listing-form.tsx), so two homes in Split are not 300 m apart —
// they are at the *same* latitude and longitude, to seven decimals. No zoom
// level separates those. Only spiderfying does.
const ACTIVE_CLASS = "swapdoor-cluster--active";

/**
 * The cluster mark: a circle carrying the number of homes inside it.
 *
 * The count is the signifier, not the colour — the same rule the pin follows
 * (Lecture 6 #4, never colour alone). Size steps with the count as a second,
 * redundant channel, so the difference between "a couple" and "a lot" survives
 * a grayscale check.
 */
function clusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount();
  const size = count < 10 ? 36 : count < 25 ? 42 : 48;
  return L.divIcon({
    className: `swapdoor-cluster${count < 10 ? "" : count < 25 ? " swapdoor-cluster--md" : " swapdoor-cluster--lg"}`,
    // The disc is an INNER element, and the marker element is left alone. Same
    // reason the pin draws itself on an inner <svg> (see the note above
    // pinIcon in both maps): Leaflet owns the marker element — it writes
    // `display:block` from its own stylesheet, which is injected after
    // globals.css and so wins any tie, and it writes `transform:translate3d(…)`
    // inline, which nothing in a stylesheet can beat. A disc drawn on the
    // marker itself loses its centring to the first and its hover scale to the
    // second.
    //
    // `aria-hidden` on the digits + an sr-only sentence, because "3" read out
    // on its own says nothing about what pressing it does.
    html: `<span class="swapdoor-cluster__disc" aria-hidden="true">${count}</span><span class="sr-only">${count} homes here — open</span>`,
    iconSize: [size, size],
    // Centred, unlike the teardrop pin, which is anchored at its tip: a circle
    // marks an area, a pin marks a point.
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  });
}

/**
 * A cluster group configured the way both maps want it.
 *
 * Drop-in for the `L.layerGroup()` each map used to create: it is a
 * `FeatureGroup`, so `clearLayers()` and `marker.addTo(group)` keep working.
 *
 * Notes on the options that are NOT defaults, and on one that is but matters
 * too much to leave implicit:
 *
 * • `spiderfyOnMaxZoom` is the whole point (and is the default — stated here so
 *   nobody "tidies it away"). When a cluster's children cannot be separated by
 *   zooming — which is exactly the identical-coordinates case above — clicking
 *   it fans them out on legs instead. One click, every home reachable.
 *
 * • `disableClusteringAtZoom` is deliberately NOT set. It is the obvious knob to
 *   reach for ("show real pins once we're close enough") and it would silently
 *   undo the fix: past that zoom the group stops clustering, and two homes at
 *   one coordinate go back to being one stacked pin with no way to spiderfy.
 *
 * • `maxClusterRadius` is 55 px rather than the default 80. The pin is 30 px
 *   wide, so ~35 px between two of them is already enough to stop them
 *   overlapping; 55 keeps a margin without merging genuinely distinct
 *   neighbourhoods into one mark earlier than it has to.
 *
 * • `polygonOptions` themes the hull Leaflet draws while hovering a cluster.
 *   Left alone it is Leaflet's `#3388ff` — the same bright default this project
 *   already chased out of the tile layer and the zoom control. Kept rather than
 *   switched off because it is real feedforward (Lecture 2): it shows the area
 *   a click is about to take you to, before you take it.
 *
 * CSS custom properties work in both of those because Leaflet paths are SVG and
 * `stroke`/`fill` accept `var()` — the same trick components/house-map.tsx uses
 * for its radius circle, and it is what makes the legs and the hull follow the
 * theme with no listener.
 */
export function createClusterGroup(): L.MarkerClusterGroup {
  return L.markerClusterGroup({
    iconCreateFunction: clusterIcon,
    maxClusterRadius: 55,
    spiderfyOnMaxZoom: true,
    zoomToBoundsOnClick: true,
    showCoverageOnHover: true,
    polygonOptions: {
      color: "var(--color-brand)",
      weight: 1.5,
      opacity: 0.6,
      fillColor: "var(--color-brand)",
      fillOpacity: 0.1,
    },
    spiderLegPolylineOptions: { weight: 1.5, color: "var(--color-brand)", opacity: 0.7 },
  });
}

/**
 * Opens a marker's popup, but only if that marker is actually on the map.
 *
 * A marker inside a collapsed cluster is not: Leaflet has removed it, and
 * `openPopup()` on it is a silent no-op. The plugin does offer
 * `zoomToShowLayer()`, which would zoom or spiderfy until the marker appears —
 * and that is exactly what must NOT happen here. Both maps re-run their
 * highlight effect whenever the result set changes, so a selection left over
 * from before a filter change would move the map out from under the user
 * (Nielsen #4: the map is theirs to frame, not ours).
 *
 * The cluster is highlighted instead, by markActiveClusters below, so the
 * selection is still visible — it just says "in here" rather than "here".
 */
export function openMarkerPopup(group: L.MarkerClusterGroup, marker: L.Marker): void {
  if (group.getVisibleParent(marker) !== marker) return;
  marker.openPopup();
}

/**
 * Carries the pin highlight up to the cluster that is hiding it.
 *
 * Both maps highlight by swapping a marker's icon. That is invisible for a
 * marker inside a collapsed cluster, which would have quietly broken the
 * bidirectional hover-sync on Explore: hovering a card in the list would ring
 * the card and change nothing on the map, for exactly the homes the map had
 * decided to group. So the class goes on the cluster instead.
 *
 * `container` is the map's own element; it is where the stale marks are found.
 * Reading them back out of the DOM rather than remembering them avoids keeping
 * a second copy of state that the cluster group rebuilds on every zoom anyway.
 */
export function markActiveClusters(
  container: HTMLElement,
  group: L.MarkerClusterGroup,
  markers: Map<number, L.Marker>,
  isActive: (id: number) => boolean
): void {
  const active = new Set<Element>();
  markers.forEach((marker, id) => {
    if (!isActive(id)) return;
    const parent = group.getVisibleParent(marker);
    // null while the group is not yet on a map; the marker itself when it is
    // not clustered — in which case its own icon already carries the highlight.
    if (!parent || parent === marker) return;
    const el = parent.getElement();
    if (el) active.add(el);
  });

  container.querySelectorAll(`.${ACTIVE_CLASS}`).forEach((el) => {
    if (!active.has(el)) el.classList.remove(ACTIVE_CLASS);
  });
  active.forEach((el) => el.classList.add(ACTIVE_CLASS));
}
