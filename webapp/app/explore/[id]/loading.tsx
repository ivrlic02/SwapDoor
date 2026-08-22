import { Navigation } from "@/components/navigation";

// Shown while a single house detail page loads — e.g. after clicking a map pin
// or a listing card. Mirrors the real layout (photo mosaic, article column,
// swap panel) so the page's shape appears instantly and nothing jumps when the
// content arrives (Nielsen #3).
export default function HouseDetailLoading() {
  return (
    <main className="min-h-screen bg-bg text-fg">
      <Navigation />

      <div className="mx-auto max-w-6xl px-6 pb-32 pt-8 lg:pb-20">
        <div className="skeleton h-4 w-32 rounded-md" />

        <header className="mt-4 mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="w-full max-w-md">
            <div className="skeleton h-10 w-3/4 rounded-md" />
            <div className="skeleton mt-3 h-4 w-2/3 rounded-md" />
          </div>
          <div className="skeleton h-9 w-20 rounded-lg" />
        </header>

        {/* Photo mosaic */}
        <div className="grid gap-2 md:h-[420px] md:grid-cols-3 md:grid-rows-3 lg:h-[480px]">
          <div className="skeleton aspect-[4/3] rounded-2xl md:col-span-2 md:row-span-3 md:aspect-auto md:h-full" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton hidden rounded-xl md:block" />
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-12">
          {/* Article column */}
          <div>
            <div className="flex gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-8 w-32 rounded-full" />
              ))}
            </div>

            <div className="mt-6 flex items-center gap-4 border-y border-border py-5">
              <div className="skeleton size-[52px] rounded-full" />
              <div className="flex-1">
                <div className="skeleton h-4 w-48 rounded-md" />
                <div className="skeleton mt-2 h-3 w-64 rounded-md" />
              </div>
            </div>

            <div className="mt-10">
              <div className="skeleton h-7 w-48 rounded-md" />
              <div className="skeleton mt-4 h-4 w-full rounded-md" />
              <div className="skeleton mt-2 h-4 w-2/3 rounded-md" />
            </div>

            <div className="mt-10 border-t border-border pt-8">
              <div className="skeleton h-7 w-56 rounded-md" />
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="skeleton h-5 rounded-md" />
                ))}
              </div>
            </div>

            <div className="mt-10 border-t border-border pt-8">
              <div className="skeleton h-7 w-44 rounded-md" />
              <div className="skeleton mt-4 h-[340px] rounded-2xl" />
            </div>
          </div>

          {/* Swap panel */}
          <aside className="h-fit rounded-2xl border border-border bg-surface p-6">
            <div className="skeleton h-6 w-40 rounded-md" />
            <div className="skeleton mt-4 h-24 w-full rounded-xl" />
            <div className="skeleton mt-4 h-12 w-full rounded-lg" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-3 w-full rounded-md" />
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
