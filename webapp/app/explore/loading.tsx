import { Navigation } from "@/components/navigation";
import { HouseGridSkeleton } from "@/components/skeletons";

// Shown instantly while /explore fetches its listings, so navigating there
// paints the page structure (header, filter bar, a grid of card placeholders)
// rather than hanging on a blank screen.
export default function ExploreLoading() {
  return (
    <main className="bg-bg min-h-screen text-fg">
      <Navigation />

      <section className="max-w-7xl mx-auto px-6 pt-14 pb-20">
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold">Explore homes</h1>
        </header>

        {/* Filter panel placeholder */}
        <div className="bg-surface border border-border rounded-2xl p-4 md:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-[68px] rounded-lg" />
            ))}
          </div>
          <div className="skeleton h-8 rounded-lg mt-4" />
        </div>

        <div className="flex items-center justify-between gap-4 mt-6 mb-6">
          <div className="skeleton h-4 w-40 rounded-md" />
        </div>

        <HouseGridSkeleton count={6} />
      </section>
    </main>
  );
}
