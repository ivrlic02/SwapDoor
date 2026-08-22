import { Navigation } from "@/components/navigation";
import { HouseCardSkeleton, MapSkeleton } from "@/components/skeletons";

// Home loading state (in its own route group so it doesn't leak onto sibling
// routes like /how-it-works). Mirrors the hero, the map section, and the
// Trending row as shimmer placeholders while the listings load.
export default function HomeLoading() {
  return (
    <main className="bg-bg text-fg">
      <Navigation />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-10 text-center">
        <div className="skeleton mx-auto h-12 w-3/4 max-w-2xl rounded-lg" />
        <div className="skeleton mx-auto mt-4 h-5 w-1/2 max-w-md rounded-md" />
        <div className="skeleton mx-auto mt-8 h-16 w-full max-w-3xl rounded-full" />
      </section>

      {/* Map section */}
      <section className="px-6 py-20 bg-surface-2">
        <div className="max-w-6xl mx-auto">
          <div className="skeleton mx-auto h-8 w-64 rounded-md" />
          <div className="skeleton mx-auto mt-3 mb-10 h-4 w-96 max-w-full rounded-md" />
          <MapSkeleton />
        </div>
      </section>

      {/* Trending */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="skeleton h-8 w-48 rounded-md mb-10" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <HouseCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
