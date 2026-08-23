"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import {
  AMENITIES,
  HOME_TYPES,
  type Amenity,
  type HomeType,
  type House,
} from "@/lib/house-types";
import { HouseCard } from "@/components/house-card";
import { MascotGlyph } from "@/components/brand";
import { CloseIcon, SlidersIcon } from "@/components/icons";
import { SearchFields } from "@/components/search-fields";
import { useHomeSearch, whenSummary } from "@/components/home-search-context";
import { buttonClass } from "@/components/button";
import { Select } from "@/components/select";
import { MapSkeleton } from "@/components/skeletons";
import { EXPLORE_QUERY_KEY } from "@/lib/explore-query";
import type { MapBounds } from "@/components/explore-map";

// Minimum length (days) a home's availability window must have to satisfy each
// duration preset. "flexible"/unknown impose no constraint. This is what makes
// the "When" bar actually filter now that homes carry a real availability range.
const STAY_MIN_DAYS: Record<string, number> = {
  weekend: 2,
  week: 7,
  "2weeks": 14,
  month: 28,
};
const DAY_MS = 86_400_000;

// The map only touches window/leaflet on the client; load it lazily and show a
// same-size skeleton while it mounts (Nielsen #3 visibility of system status).
const ExploreMap = dynamic(() => import("@/components/explore-map"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

type SortKey = "featured" | "price-asc" | "price-desc" | "rating";
type Pill = "type" | "rating" | "more";

// Where/When/Who come from the reused search bar (the shared home-search
// context); everything here is the extra Explore-only filter state.
export type ExploreInitial = {
  maxPrice?: number;
  sort?: SortKey;
  types?: HomeType[];
  amenities?: Amenity[];
  minRating?: number;
  verifiedOnly?: boolean;
  view?: "list" | "map";
};

// One list, read by the desktop <Select> and by the phone sheet's radio rows,
// so the two can never drift into different wording for the same order.
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Recommended" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
];

const RATING_OPTIONS = [
  { v: 0, label: "Any rating" },
  { v: 4.0, label: "4.0+" },
  { v: 4.5, label: "4.5+" },
  { v: 4.8, label: "4.8+" },
];

// Everything the filter controls need. Shared by the on-page controls and the
// copy the nav renders in its docked drop-down (see <FilterControls>).
type ControlsProps = {
  types: Set<HomeType>;
  toggleType: (t: HomeType) => void;
  setTypes: Dispatch<SetStateAction<Set<HomeType>>>;
  amenities: Set<Amenity>;
  toggleAmenity: (a: Amenity) => void;
  setAmenities: Dispatch<SetStateAction<Set<Amenity>>>;
  minRating: number;
  setMinRating: Dispatch<SetStateAction<number>>;
  ratingLabel: string;
  verifiedOnly: boolean;
  setVerifiedOnly: Dispatch<SetStateAction<boolean>>;
  maxPrice: number;
  setMaxPrice: Dispatch<SetStateAction<number>>;
  priceBounds: { min: number; max: number };
  priceActive: boolean;
  budgetPct: number;
  sort: SortKey;
  setSort: Dispatch<SetStateAction<SortKey>>;
  view: "list" | "map";
  setView: Dispatch<SetStateAction<"list" | "map">>;
  /** Resets every filter but leaves the Where/When/Who bar alone — the phone
   *  sheet is labelled "Filters", so it must not silently drop the destination
   *  the user typed (Nielsen #2: a control does what its label says). */
  clearFilters: () => void;
};

export function ExploreView({
  houses,
  initial,
}: {
  houses: House[];
  initial: ExploreInitial;
}) {
  // The Where/When/Who bar (reused from the home page) lives in this context.
  // `setCollapsed` docks the nav pill; `setDock` hands our filters to the nav's
  // drop-down (shown when the docked pill is expanded).
  const { values, setValues, clear: clearBar, setCollapsed, setDock } = useHomeSearch();

  // Price bounds come from the data so the slider always fits the catalogue.
  const priceBounds = useMemo(() => {
    const prices = houses.map((h) => h.pricePerNight);
    const min = Math.floor(Math.min(...prices) / 50) * 50;
    const max = Math.ceil(Math.max(...prices) / 50) * 50;
    return { min, max };
  }, [houses]);

  const [maxPrice, setMaxPrice] = useState(
    Math.min(initial.maxPrice ?? priceBounds.max, priceBounds.max)
  );
  const [sort, setSort] = useState<SortKey>(initial.sort ?? "featured");
  const [types, setTypes] = useState<Set<HomeType>>(new Set(initial.types ?? []));
  const [amenities, setAmenities] = useState<Set<Amenity>>(new Set(initial.amenities ?? []));
  const [minRating, setMinRating] = useState(initial.minRating ?? 0);
  const [verifiedOnly, setVerifiedOnly] = useState(initial.verifiedOnly ?? false);
  const [view, setView] = useState<"list" | "map">(initial.view ?? "list");
  // Hover-sync between the list and the map (split view), and the optional
  // "search this area" spatial filter driven by the map's visible bounds.
  const [activeId, setActiveId] = useState<number | null>(null);
  const [areaBounds, setAreaBounds] = useState<MapBounds | null>(null);

  // Live values from the search bar. Homes now carry a real availability window
  // (`date`..`availableTo`), so both modes of "When" filter: an exact `when`
  // date must fall inside the window, and a duration preset (`stay`) requires
  // the window to be at least that long. "flexible" imposes no constraint.
  const q = values.where.trim();
  const guests = Number(values.who) || 0;
  const when = values.when;
  const checkout = values.checkout;
  const stay = values.stay;
  const stayMinDays = STAY_MIN_DAYS[stay] ?? 0;

  const priceActive = maxPrice < priceBounds.max;
  const whenActive = when !== "" || stay !== "";
  const anyFilter =
    q !== "" ||
    guests > 0 ||
    whenActive ||
    priceActive ||
    types.size > 0 ||
    amenities.size > 0 ||
    minRating > 0 ||
    verifiedOnly ||
    areaBounds !== null ||
    sort !== "featured";

  // Dock the nav pill once the on-page search+filters scroll up under the nav —
  // exactly the home Hero's mechanism (a 1px sentinel + IntersectionObserver).
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setCollapsed(!entry.isIntersecting),
      { rootMargin: "-72px 0px 0px 0px", threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [setCollapsed]);

  // Reflect all filters into the URL (shareable/bookmarkable) without a server
  // round-trip — visibility of system status + user control.
  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (guests > 0) params.set("guests", String(guests));
    if (when) params.set("date", when);
    if (checkout) params.set("checkout", checkout);
    if (stay) params.set("stay", stay);
    if (priceActive) params.set("maxPrice", String(maxPrice));
    if (sort !== "featured") params.set("sort", sort);
    if (types.size) params.set("types", [...types].join(","));
    if (amenities.size) params.set("amenities", [...amenities].join(","));
    if (minRating > 0) params.set("rating", String(minRating));
    if (verifiedOnly) params.set("verified", "1");
    if (view !== "list") params.set("view", view);
    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
    // Remember the search for this session so a listing page's "Back to your
    // results" can restore it instead of dumping the user on an unfiltered grid.
    sessionStorage.setItem(EXPLORE_QUERY_KEY, query);
  }, [q, guests, when, checkout, stay, maxPrice, priceActive, sort, types, amenities, minRating, verifiedOnly, view]);

  const results = useMemo(() => {
    const needle = q.toLowerCase();
    const filtered = houses.filter((h) => {
      if (needle && !`${h.name} ${h.location} ${h.country}`.toLowerCase().includes(needle))
        return false;
      if (guests > 0 && h.maxGuests < guests) return false;
      if (priceActive && h.pricePerNight > maxPrice) return false;
      // Dates: the home's availability window (`h.date`..`h.availableTo`) must
      // cover the requested stay. A range needs the whole [check-in, check-out]
      // to fit; a lone check-in just needs to fall inside the window.
      if (when) {
        const to = h.availableTo ?? h.date;
        if (checkout) {
          if (when < h.date || checkout > to) return false;
        } else if (when < h.date || when > to) {
          return false;
        }
      }
      // Duration preset: the availability window must be at least this long.
      if (stayMinDays > 0) {
        const from = new Date(h.date).getTime();
        const to = new Date(h.availableTo ?? h.date).getTime();
        if (!Number.isNaN(from) && !Number.isNaN(to) && (to - from) / DAY_MS < stayMinDays)
          return false;
      }
      if (types.size > 0 && (!h.type || !types.has(h.type))) return false;
      if (minRating > 0 && h.rating < minRating) return false;
      if (verifiedOnly && !h.verified) return false;
      if (amenities.size > 0) {
        const have = new Set(h.amenities ?? []);
        for (const a of amenities) if (!have.has(a)) return false;
      }
      // "Search this area": keep only homes inside the map's committed bounds.
      if (areaBounds) {
        if (
          typeof h.lat !== "number" ||
          typeof h.lng !== "number" ||
          h.lat < areaBounds.south ||
          h.lat > areaBounds.north ||
          h.lng < areaBounds.west ||
          h.lng > areaBounds.east
        )
          return false;
      }
      return true;
    });

    const sorted = [...filtered];
    switch (sort) {
      case "price-asc":
        sorted.sort((a, b) => a.pricePerNight - b.pricePerNight);
        break;
      case "price-desc":
        sorted.sort((a, b) => b.pricePerNight - a.pricePerNight);
        break;
      case "rating":
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      default:
        // "Recommended": verified hosts first, then highest-rated. JS sort is
        // stable, so homes that tie keep their original (source) order.
        sorted.sort((a, b) => {
          if (!!a.verified !== !!b.verified) return a.verified ? -1 : 1;
          return b.rating - a.rating;
        });
        break;
    }
    return sorted;
  }, [houses, q, guests, when, checkout, stayMinDays, maxPrice, priceActive, types, minRating, verifiedOnly, amenities, sort, areaBounds]);

  // Signature of the *non-spatial* filters. The map re-fits its view only when
  // this changes (a real filter changed), so panning or a "search this area"
  // (which narrows `results` but not this key) never yanks the map around.
  const mapFitKey = useMemo(
    () =>
      JSON.stringify([
        q,
        guests,
        when,
        checkout,
        stay,
        priceActive ? maxPrice : null,
        [...types].sort(),
        [...amenities].sort(),
        minRating,
        verifiedOnly,
      ]),
    [q, guests, when, checkout, stay, maxPrice, priceActive, types, amenities, minRating, verifiedOnly]
  );

  const toggleType = useCallback((t: HomeType) => {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }, []);
  const toggleAmenity = useCallback((a: Amenity) => {
    setAmenities((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else next.add(a);
      return next;
    });
  }, []);

  // Filters only — what the phone sheet's "Clear all" resets. `clearAll` below
  // is the page-level one and also empties the search bar.
  const clearFilters = useCallback(() => {
    setMaxPrice(priceBounds.max);
    setSort("featured");
    setTypes(new Set());
    setAmenities(new Set());
    setMinRating(0);
    setVerifiedOnly(false);
    setAreaBounds(null);
  }, [priceBounds.max]);

  function clearAll() {
    clearBar();
    setMaxPrice(priceBounds.max);
    setSort("featured");
    setTypes(new Set());
    setAmenities(new Set());
    setMinRating(0);
    setVerifiedOnly(false);
    setAreaBounds(null);
  }

  const ratingLabel = RATING_OPTIONS.find((r) => r.v === minRating)?.label ?? "Rating";

  // Percentage of the budget slider that's "filled" (blue), for the WebKit
  // gradient track. Firefox uses ::-moz-range-progress instead (see globals.css).
  const budgetPct =
    priceBounds.max > priceBounds.min
      ? ((maxPrice - priceBounds.min) / (priceBounds.max - priceBounds.min)) * 100
      : 100;

  // Active filters as individually-removable chips, so a selection stays visible
  // after its pill panel closes (recognition rather than recall, Nielsen #7) and
  // each can be undone on its own (user control & freedom, #4). Sort is ordering,
  // not a filter, so it isn't chipped.
  const activeChips: { key: string; label: string; onRemove: () => void }[] = [];
  if (q) activeChips.push({ key: "where", label: q, onRemove: () => setValues({ where: "" }) });
  if (whenActive)
    activeChips.push({
      key: "when",
      label: whenSummary({ when, checkout, stay }),
      onRemove: () => setValues({ when: "", checkout: "", stay: "" }),
    });
  if (guests > 0)
    activeChips.push({
      key: "who",
      label: `${guests} guest${guests > 1 ? "s" : ""}`,
      onRemove: () => setValues({ who: "" }),
    });
  if (priceActive)
    activeChips.push({
      key: "price",
      label: `Up to $${maxPrice.toLocaleString()}`,
      onRemove: () => setMaxPrice(priceBounds.max),
    });
  for (const t of types)
    activeChips.push({ key: `type-${t}`, label: t, onRemove: () => toggleType(t) });
  if (minRating > 0)
    activeChips.push({ key: "rating", label: ratingLabel, onRemove: () => setMinRating(0) });
  if (verifiedOnly)
    activeChips.push({ key: "verified", label: "Verified hosts", onRemove: () => setVerifiedOnly(false) });
  for (const a of amenities)
    activeChips.push({ key: `amenity-${a}`, label: a, onRemove: () => toggleAmenity(a) });
  if (areaBounds)
    activeChips.push({ key: "area", label: "Map area", onRemove: () => setAreaBounds(null) });

  // How many *filters* are active (search terms live in the pill summary, sort
  // is ordering) — drives the nav's "Filters (N)" badge.
  const activeFilterCount =
    types.size +
    amenities.size +
    (minRating > 0 ? 1 : 0) +
    (verifiedOnly ? 1 : 0) +
    (priceActive ? 1 : 0);

  // One props bundle, reused on the page and handed to the nav. Memoised so the
  // registration effect below only re-fires when a filter actually changes.
  const controls = useMemo<ControlsProps>(
    () => ({
      types,
      toggleType,
      setTypes,
      amenities,
      toggleAmenity,
      setAmenities,
      minRating,
      setMinRating,
      ratingLabel,
      verifiedOnly,
      setVerifiedOnly,
      maxPrice,
      setMaxPrice,
      priceBounds,
      priceActive,
      budgetPct,
      sort,
      setSort,
      view,
      setView,
      clearFilters,
    }),
    [
      clearFilters,
      types,
      toggleType,
      amenities,
      toggleAmenity,
      minRating,
      ratingLabel,
      verifiedOnly,
      maxPrice,
      priceBounds,
      priceActive,
      budgetPct,
      sort,
      view,
    ]
  );

  // Register the filter controls + active count with the nav, so its docked
  // drop-down shows the *same* controls (Nielsen #2 consistency). Cleared on
  // unmount so other routes' nav stays clean.
  useEffect(() => {
    setDock(<FilterControls {...controls} resultCount={results.length} />, activeFilterCount);
    return () => setDock(null, 0);
  }, [setDock, controls, activeFilterCount, results.length]);

  return (
    <div>
      {/* PRIMARY on-page controls. The nav renders a second copy when docked. */}
      <SearchFields variant="compact" />
      <div className="mt-3 sm:mt-5">
        <FilterControls {...controls} resultCount={results.length} />
      </div>
      {/* 1px sentinel — when it scrolls under the nav, the pill docks. */}
      <div ref={sentinelRef} aria-hidden className="h-px w-full" />

      {/* ACTIVE FILTER CHIPS — every applied filter stays visible and removable
          on its own (recognition rather than recall, #7; user control, #4). */}
      {activeChips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {activeChips.map((c) => (
            <FilterChip key={c.key} label={c.label} onRemove={c.onRemove} />
          ))}
        </div>
      )}

      {/* RESULT COUNT + CLEAR */}
      <div className="flex items-center justify-between gap-4 mt-6 mb-6">
        <p className="text-muted text-sm" aria-live="polite">
          Showing <span className="text-fg font-semibold">{results.length}</span> of{" "}
          {houses.length} homes
        </p>
        {anyFilter && (
          <button
            type="button"
            onClick={clearAll}
            className="text-sm text-accent hover:text-brand transition font-medium"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* RESULTS — full-width list, or a desktop split (list + sticky map). */}
      {view === "map" ? (
        <div className="lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-6 lg:items-start">
          {/* List — hidden on mobile (the map is full-width there); on desktop
              it hover-syncs with the map. */}
          <div className="hidden lg:block">
            {results.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {results.map((house, i) => (
                  <div
                    key={house.id}
                    onMouseEnter={() => setActiveId(house.id)}
                    onMouseLeave={() => setActiveId(null)}
                    className={`rounded-2xl transition ${
                      activeId === house.id ? "ring-2 ring-brand ring-offset-2 ring-offset-bg" : ""
                    }`}
                  >
                    <HouseCard house={house} priority={i < 4} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState onReset={clearAll} />
            )}
          </div>

          {/* Map — full-width on mobile, sticky right column on desktop. */}
          <div className="lg:sticky lg:top-20">
            <ExploreMap
              houses={results}
              className="h-[70vh] lg:h-[calc(100vh-7rem)]"
              activeId={activeId}
              onHoverHouse={setActiveId}
              onSearchArea={setAreaBounds}
              fitKey={mapFitKey}
            />
          </div>
        </div>
      ) : results.length > 0 ? (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((house, i) => (
            <HouseCard key={house.id} house={house} priority={i < 3} />
          ))}
        </div>
      ) : (
        <EmptyState onReset={clearAll} />
      )}
    </div>
  );
}

// Shared empty state for both the list and the split view.
//
// The mascot is faded to 30%: an empty result is a moment of doubt ("is the
// site broken, or did I over-filter?"), and a piece of the brand answering it
// says the page rendered fine — while staying quiet enough that the sentence
// and the reset button are still what the eye lands on first.
function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="border border-border rounded-2xl bg-surface/60 py-16 px-6 text-center">
      <MascotGlyph className="mx-auto mb-6 h-20 w-auto opacity-30" />
      <p className="text-lg font-semibold">No homes match your filters</p>
      <p className="text-muted mt-2">Try widening your dates, price, or guest count.</p>
      <button type="button" onClick={onReset} className={`mt-5 ${buttonClass("primary")}`}>
        Reset filters
      </button>
    </div>
  );
}

// ── Reusable filter controls ─────────────────────────────────────────────────
// The filter pills + sort + view toggle + budget slider (NOT the search bar —
// that's rendered separately above the controls, and by the nav drop-down). Used
// both on the page and inside the docked nav drop-down. Values/handlers come from
// props (shared state in <ExploreView>); the ephemeral "which panel is open" is
// local, so the two instances don't fight over it. Pop-out panels portal to
// <body> so they escape the nav drop-down's clip-path/overflow.
function FilterControls({
  types,
  toggleType,
  setTypes,
  amenities,
  toggleAmenity,
  setAmenities,
  minRating,
  setMinRating,
  ratingLabel,
  verifiedOnly,
  setVerifiedOnly,
  maxPrice,
  setMaxPrice,
  priceBounds,
  priceActive,
  budgetPct,
  sort,
  setSort,
  view,
  setView,
  clearFilters,
  resultCount,
}: ControlsProps & { resultCount: number }) {
  const [openPill, setOpenPill] = useState<Pill | null>(null);
  // The phone sheet. See <FilterSheet> at the bottom of this file for why the
  // pills do not simply wrap onto more rows below `sm`.
  const [sheetOpen, setSheetOpen] = useState(false);
  const activeCount =
    types.size +
    amenities.size +
    (minRating > 0 ? 1 : 0) +
    (verifiedOnly ? 1 : 0) +
    (priceActive ? 1 : 0);
  const pillsRef = useRef<HTMLDivElement>(null);
  const typeAnchor = useRef<HTMLDivElement>(null);
  const ratingAnchor = useRef<HTMLDivElement>(null);
  const moreAnchor = useRef<HTMLDivElement>(null);
  const uid = useId();
  const budgetId = `${uid}-budget`;
  const sortId = `${uid}-sort`;

  // Close the open pill panel on outside click / Escape (user control & freedom).
  // Clicks inside a portaled panel count as "inside" (they carry data-pill-popover).
  useEffect(() => {
    if (!openPill) return;
    function onDown(e: PointerEvent) {
      const t = e.target as HTMLElement;
      if (pillsRef.current?.contains(t)) return;
      if (t.closest("[data-pill-popover]")) return;
      setOpenPill(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenPill(null);
    }
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [openPill]);

  return (
    <div>
      {/* PHONE (below `sm`) — one button and the view toggle.
          Measured before this change: on a 390×844 screen the title, the search
          bar, three wrapped filter pills, the sort control on its own line and
          the budget card filled ~620px, so a visitor arriving at the page whose
          entire purpose is to show homes saw no home at all without scrolling.
          Every one of those controls is a choice competing with the results
          (Hick's law; Nielsen #9 "every extra unit of information diminishes
          the visibility of the relevant ones"), and the sort control sitting on
          `ml-auto` in its own row broke the left edge everything else shares
          (CRAP alignment). Progressive disclosure is the lecture's own answer:
          one control that says how many choices are behind it, and the results
          immediately underneath. */}
      <div className="flex items-center gap-2 sm:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-expanded={sheetOpen}
          className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium transition ${
            activeCount > 0
              ? "border-brand bg-brand/10 text-brand"
              : "border-border bg-surface text-fg"
          }`}
        >
          <SlidersIcon className="size-4" />
          Filters
          {activeCount > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-brand text-xs font-semibold text-white">
              {activeCount}
            </span>
          )}
        </button>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {sheetOpen && (
        <FilterSheet
          onClose={() => setSheetOpen(false)}
          resultCount={resultCount}
          types={types}
          toggleType={toggleType}
          amenities={amenities}
          toggleAmenity={toggleAmenity}
          minRating={minRating}
          setMinRating={setMinRating}
          verifiedOnly={verifiedOnly}
          setVerifiedOnly={setVerifiedOnly}
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
          priceBounds={priceBounds}
          priceActive={priceActive}
          budgetPct={budgetPct}
          sort={sort}
          setSort={setSort}
          activeCount={activeCount}
          clearFilters={clearFilters}
        />
      )}

      {/* FILTER PILLS + CONTROLS — `sm` and up, exactly as before. */}
      <div ref={pillsRef} className="hidden flex-wrap items-center gap-2 sm:flex">
        {/* Type */}
        <div ref={typeAnchor} className="relative">
          <PillButton
            label="Home type"
            active={types.size > 0}
            badge={types.size || undefined}
            open={openPill === "type"}
            onClick={() => setOpenPill((p) => (p === "type" ? null : "type"))}
          />
          {openPill === "type" && (
            <PillPopover anchorRef={typeAnchor}>
              <div className="grid gap-1">
                {HOME_TYPES.map((t) => (
                  <CheckRow
                    key={t}
                    label={t}
                    checked={types.has(t)}
                    onChange={() => toggleType(t)}
                  />
                ))}
              </div>
              {types.size > 0 && <PanelClear onClick={() => setTypes(new Set())} />}
            </PillPopover>
          )}
        </div>

        {/* Rating */}
        <div ref={ratingAnchor} className="relative">
          <PillButton
            label={minRating > 0 ? ratingLabel : "Rating"}
            active={minRating > 0}
            open={openPill === "rating"}
            onClick={() => setOpenPill((p) => (p === "rating" ? null : "rating"))}
          />
          {openPill === "rating" && (
            <PillPopover anchorRef={ratingAnchor}>
              <div className="grid gap-1">
                {RATING_OPTIONS.map((r) => (
                  <RadioRow
                    key={r.v}
                    label={r.label}
                    checked={minRating === r.v}
                    onChange={() => {
                      setMinRating(r.v);
                      setOpenPill(null);
                    }}
                  />
                ))}
              </div>
            </PillPopover>
          )}
        </div>

        {/* More filters — trust + amenities drawer (progressive disclosure, Hick's law) */}
        <div ref={moreAnchor} className="relative">
          <PillButton
            label="More filters"
            active={amenities.size > 0 || verifiedOnly}
            badge={(amenities.size + (verifiedOnly ? 1 : 0)) || undefined}
            open={openPill === "more"}
            onClick={() => setOpenPill((p) => (p === "more" ? null : "more"))}
          />
          {openPill === "more" && (
            <PillPopover anchorRef={moreAnchor} width={280}>
              <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Trust
              </p>
              <CheckRow
                label="Verified hosts only"
                checked={verifiedOnly}
                onChange={() => setVerifiedOnly((v) => !v)}
              />

              <p className="mt-3 px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Amenities
              </p>
              <div className="grid grid-cols-1 gap-1">
                {AMENITIES.map((a) => (
                  <CheckRow
                    key={a}
                    label={a}
                    checked={amenities.has(a)}
                    onChange={() => toggleAmenity(a)}
                  />
                ))}
              </div>
              {(amenities.size > 0 || verifiedOnly) && (
                <PanelClear
                  onClick={() => {
                    setAmenities(new Set());
                    setVerifiedOnly(false);
                  }}
                />
              )}
            </PillPopover>
          )}
        </div>

        {/* Right side: sort + list/map toggle. Sort used to be a native
            <select> dressed up to match the idle pills — but only its closed
            state could be styled, so opening it dropped a white OS menu next to
            the app's own dark filter panels. It now uses the shared <Select>,
            which is the same panel, the same rows and the same tick as the
            pills beside it (Nielsen #2; CRAP repetition). */}
        <div className="ml-auto flex items-center gap-2">
          <label className="sr-only" htmlFor={sortId}>
            Sort by
          </label>
          <Select
            id={sortId}
            value={sort}
            onChange={setSort}
            ariaLabel="Sort by"
            title="Recommended: verified hosts and top-rated homes first"
            variant="pill"
            panelWidth={220}
            options={SORT_OPTIONS}
          />

          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      {/* BUDGET BAR — persistent because cost is the #1 driver for every persona.
          On a phone it is persistent inside the sheet instead: it is the first
          thing in there, so it is still the first filter a reader meets. */}
      <div className="mt-4 hidden rounded-2xl border border-border bg-surface px-4 py-3 sm:block md:px-5">
        <label
          htmlFor={budgetId}
          className="flex items-center justify-between text-sm text-muted mb-1.5"
        >
          <span className="font-medium text-fg">Value / night</span>
          <span className="font-semibold text-fg">
            {priceActive ? `Up to $${maxPrice.toLocaleString()}` : "Any"}
          </span>
        </label>
        <input
          id={budgetId}
          type="range"
          min={priceBounds.min}
          max={priceBounds.max}
          step={50}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="range-brand w-full cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--color-brand) ${budgetPct}%, var(--color-border) ${budgetPct}%)`,
          }}
        />
        <div className="flex justify-between text-xs text-muted mt-1">
          <span>${priceBounds.min.toLocaleString()}</span>
          <span>${priceBounds.max.toLocaleString()}+</span>
        </div>
      </div>
    </div>
  );
}

// ── Filter sheet (phones) ───────────────────────────────────────────────────
// Everything the pills hold, in one panel, opened by one button.
//
// Why a sheet and not just narrower pills: the pill panels are anchored
// popovers, and an anchored popover on a phone is the bug the search bar had —
// it is `position: fixed`, so anything that falls past the bottom edge cannot
// be reached at all. The amenities panel is nine rows; it would have run off
// the screen from any pill sitting below the halfway line. Docking to the
// bottom edge is the same move, and the same `.swap-sheet` rise, that the
// listing page's date picker and now the search bar both use (CRAP repetition,
// Nielsen #2).
//
// The order inside is deliberate: value first, because cost is the stated
// primary driver for all three personas (Overview §3), then the choices that
// narrow a list, then the trust switch. The footer says what applying will
// produce — "Show 6 homes" rather than "Apply" — so the effect of a filter set
// is visible before it is committed to (Nielsen #3, visibility of status).
function FilterSheet({
  onClose,
  resultCount,
  types,
  toggleType,
  amenities,
  toggleAmenity,
  minRating,
  setMinRating,
  verifiedOnly,
  setVerifiedOnly,
  maxPrice,
  setMaxPrice,
  priceBounds,
  priceActive,
  budgetPct,
  sort,
  setSort,
  activeCount,
  clearFilters,
}: Pick<
  ControlsProps,
  | "types"
  | "toggleType"
  | "amenities"
  | "toggleAmenity"
  | "minRating"
  | "setMinRating"
  | "verifiedOnly"
  | "setVerifiedOnly"
  | "maxPrice"
  | "setMaxPrice"
  | "priceBounds"
  | "priceActive"
  | "budgetPct"
  | "sort"
  | "setSort"
  | "clearFilters"
> & { onClose: () => void; resultCount: number; activeCount: number }) {
  const uid = useId();
  const budgetId = `${uid}-sheet-budget`;

  // A modal owes an Escape and a page that stays put behind it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] sm:hidden">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className="swap-sheet absolute inset-x-0 bottom-0 flex max-h-[90vh] flex-col rounded-t-3xl border-t border-border bg-surface shadow-2xl shadow-black/50"
      >
        <div className="shrink-0 px-4 pt-3">
          <div aria-hidden className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" />
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-lg font-semibold">Filters</h2>
            <button
              type="button"
              aria-label="Close filters"
              onClick={onClose}
              className="-mr-2 grid size-11 place-items-center rounded-xl text-muted transition hover:text-fg"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <SheetSection title="Value / night">
            <label htmlFor={budgetId} className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted">Up to</span>
              <span className="font-semibold text-fg">
                {priceActive ? `$${maxPrice.toLocaleString()}` : "Any"}
              </span>
            </label>
            <input
              id={budgetId}
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              step={50}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="range-brand w-full cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--color-brand) ${budgetPct}%, var(--color-border) ${budgetPct}%)`,
              }}
            />
            <div className="mt-1 flex justify-between text-xs text-muted">
              <span>${priceBounds.min.toLocaleString()}</span>
              <span>${priceBounds.max.toLocaleString()}+</span>
            </div>
          </SheetSection>

          <SheetSection title="Sort by">
            {SORT_OPTIONS.map((o) => (
              <RadioRow
                key={o.value}
                label={o.label}
                checked={sort === o.value}
                onChange={() => setSort(o.value)}
              />
            ))}
          </SheetSection>

          <SheetSection title="Home type">
            {HOME_TYPES.map((t) => (
              <CheckRow key={t} label={t} checked={types.has(t)} onChange={() => toggleType(t)} />
            ))}
          </SheetSection>

          <SheetSection title="Rating">
            {RATING_OPTIONS.map((r) => (
              <RadioRow
                key={r.v}
                label={r.label}
                checked={minRating === r.v}
                onChange={() => setMinRating(r.v)}
              />
            ))}
          </SheetSection>

          <SheetSection title="Trust">
            <CheckRow
              label="Verified hosts only"
              checked={verifiedOnly}
              onChange={() => setVerifiedOnly((v) => !v)}
            />
          </SheetSection>

          <SheetSection title="Amenities" last>
            {AMENITIES.map((a) => (
              <CheckRow
                key={a}
                label={a}
                checked={amenities.has(a)}
                onChange={() => toggleAmenity(a)}
              />
            ))}
          </SheetSection>
        </div>

        <div
          className="shrink-0 border-t border-border px-4 pt-3"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={clearFilters}
              disabled={activeCount === 0}
              className={buttonClass("ghost", "md", "shrink-0")}
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={onClose}
              className={buttonClass("primary", "lg", "flex-1")}
            >
              Show {resultCount} {resultCount === 1 ? "home" : "homes"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function SheetSection({
  title,
  last = false,
  children,
}: {
  title: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={last ? "" : "mb-5 border-b border-border pb-5"}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  );
}

// ── Pill button ───────────────────────────────────────────────────────────
// Neutral when idle (outline). When it holds an active selection it uses a
// brand *outline* + brand text + a soft tint (not a solid fill), so several
// active filters don't flood the row with brand blue and blow the 10% accent
// budget (60-30-10, Lecture 6). A solid count badge keeps the state legible
// without relying on colour alone.
function PillButton({
  label,
  active,
  badge,
  open,
  onClick,
}: {
  label: string;
  active: boolean;
  badge?: number;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition",
        active
          ? "border-brand bg-brand/10 text-brand"
          : "border-border bg-surface text-fg hover:border-muted/60",
      ].join(" ")}
    >
      {label}
      {badge ? (
        <span className="grid size-5 place-items-center rounded-full bg-brand text-xs font-semibold text-white">
          {badge}
        </span>
      ) : null}
      <Chevron open={open} />
    </button>
  );
}

// ── Active-filter chip ──────────────────────────────────────────────────────
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface py-1 pl-3 pr-1 text-sm text-fg">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="grid size-5 place-items-center rounded-full text-muted transition hover:bg-bg hover:text-fg"
      >
        <RemoveGlyph />
      </button>
    </span>
  );
}

// Pop-out panel for a filter pill. Portaled to <body> and fixed-positioned under
// its anchor, so it escapes the nav drop-down's overflow/clip (same trick the
// search-bar popovers use). Repositions on scroll/resize.
function PillPopover({
  anchorRef,
  width = 240,
  children,
}: {
  anchorRef: RefObject<HTMLDivElement | null>;
  width?: number;
  children: ReactNode;
}) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    function place() {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const w = Math.min(width, window.innerWidth - 16);
      const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
      setPos({ top: r.bottom + 8, left, width: w });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [anchorRef, width]);

  if (typeof document === "undefined" || !pos) return null;

  return createPortal(
    <div
      data-pill-popover
      style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
      className="z-[60] max-h-[70vh] overflow-auto rounded-2xl border border-border bg-surface p-3 shadow-2xl shadow-black/50"
    >
      {children}
    </div>,
    document.body
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm text-fg transition hover:bg-bg">
      <span
        className={[
          "grid size-5 shrink-0 place-items-center rounded-md border transition",
          checked ? "border-brand bg-brand text-white" : "border-border",
        ].join(" ")}
      >
        {checked && <CheckGlyph />}
      </span>
      {label}
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
    </label>
  );
}

function RadioRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm text-fg transition hover:bg-bg">
      <span
        className={[
          "grid size-5 shrink-0 place-items-center rounded-full border transition",
          checked ? "border-brand" : "border-border",
        ].join(" ")}
      >
        {checked && <span className="size-2.5 rounded-full bg-brand" />}
      </span>
      {label}
      <input type="radio" checked={checked} onChange={onChange} className="sr-only" />
    </label>
  );
}

function PanelClear({ onClick }: { onClick: () => void }) {
  return (
    <div className="mt-2 border-t border-border pt-2">
      <button
        type="button"
        onClick={onClick}
        className="text-sm font-medium text-accent transition hover:text-brand"
      >
        Clear
      </button>
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: "list" | "map";
  onChange: (v: "list" | "map") => void;
}) {
  const item = (v: "list" | "map", label: string) => (
    <button
      type="button"
      onClick={() => onChange(v)}
      aria-pressed={view === v}
      className={[
        "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
        view === v ? "bg-brand text-white" : "text-muted hover:text-fg",
      ].join(" ")}
    >
      {label}
    </button>
  );
  return (
    <div className="flex items-center rounded-full border border-border bg-surface p-1">
      {item("list", "List")}
      {item("map", "Map")}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={`transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RemoveGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
