import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { ExploreView, type ExploreInitial } from "@/components/explore-view";
import { HomeSearchProvider } from "@/components/home-search-context";
import {
  getHouses,
  topDestinations,
  HOME_TYPES,
  AMENITIES,
  type Amenity,
  type HomeType,
} from "@/lib/houses";
import { pageMetadata } from "@/lib/seo";

// This page had no metadata at all, so a shared /explore link arrived carrying
// the homepage's title and blurb — the reader could not tell from the preview
// that they had been sent to the search rather than to the front door.
//
// The filters live in the query string and a shared link restores them, but the
// card stays the same for every permutation on purpose: describing one person's
// filter set is not what the next reader needs, and `searchParams` here would
// make this route dynamic for a line of text.
export const metadata: Metadata = pageMetadata({
  title: "Browse homes – SwapDoor",
  shareTitle: "Browse homes to swap",
  description:
    "Search verified homes to swap by destination, dates, guests and amenities — on a map or as a list. No nightly rate, no booking fees.",
  path: "/explore",
});

const SORTS = ["featured", "price-asc", "price-desc", "rating"] as const;
type SortKey = (typeof SORTS)[number];

const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (v: string | string[] | undefined) => {
  const n = Number(str(v));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

// Where/When/Who seed the reused search bar (via the provider); everything else
// is Explore-only filter state.
function parseSearchValues(sp: Record<string, string | string[] | undefined>) {
  const guests = num(sp.guests);
  return {
    where: str(sp.q) || "",
    when: str(sp.date) || "",
    checkout: str(sp.checkout) || "",
    stay: str(sp.stay) || "",
    who: guests ? String(guests) : "",
  };
}

function parseInitial(sp: Record<string, string | string[] | undefined>): ExploreInitial {
  const sortRaw = str(sp.sort);
  const sort: SortKey | undefined = SORTS.includes(sortRaw as SortKey)
    ? (sortRaw as SortKey)
    : undefined;

  const csv = (v: string | string[] | undefined) =>
    (str(v) || "").split(",").map((s) => s.trim()).filter(Boolean);
  const types = csv(sp.types).filter((t): t is HomeType => (HOME_TYPES as string[]).includes(t));
  const amenities = csv(sp.amenities).filter((a): a is Amenity => (AMENITIES as readonly string[]).includes(a));
  const viewRaw = str(sp.view);

  return {
    maxPrice: num(sp.maxPrice),
    sort,
    types: types.length ? types : undefined,
    amenities: amenities.length ? amenities : undefined,
    minRating: num(sp.rating),
    verifiedOnly: str(sp.verified) === "1" ? true : undefined,
    view: viewRaw === "map" ? "map" : undefined,
  };
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [houses, sp] = await Promise.all([getHouses(), searchParams]);
  const initial = parseInitial(sp);
  const initialValues = parseSearchValues(sp);
  const destinations = topDestinations(houses);

  return (
    <main className="bg-bg min-h-screen text-fg">
      {/* Nav sits *inside* the provider (like the home page) so it can dock the
          search+filters pill in its own centre slot when the controls scroll
          away. `live` keeps the pill in sync with the as-you-type filtering. */}
      <HomeSearchProvider destinations={destinations} initialValues={initialValues} live>
        <Navigation />

        <section className="max-w-7xl mx-auto px-4 pt-8 pb-14 sm:px-6 lg:pt-14 lg:pb-20">
          {/* The page title is 40px of "Explore homes" above a screen whose job
              is to show homes. On a phone it and its margin cost ~100px before
              the search bar even starts, so it steps down a size and loses half
              its air below `lg` (Nielsen #9). Unchanged on desktop. */}
          <header className="mb-5 lg:mb-8">
            <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl">Explore homes</h1>
          </header>

          <ExploreView houses={houses} initial={initial} />
        </section>
      </HomeSearchProvider>

      <Footer />
    </main>
  );
}
