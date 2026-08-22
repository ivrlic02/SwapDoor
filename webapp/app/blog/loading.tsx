import { Navigation } from "@/components/navigation";
import { BlogCardSkeleton } from "@/components/skeletons";

// Shown while navigating to /blog. It matters more than it used to: the post
// list now comes from Supabase rather than from a local array, so there is a
// real round trip behind this, and /blog is server-rendered per request because
// the category filter lives in the URL.
//
// The shape has to match what replaces it — the heading block, the filter row,
// the wide featured card and the three-up grid. A skeleton that settles into a
// different layout is worse than none: the reader starts reading a position
// that then moves (Nielsen #3 is about *honest* feedback, not merely fast
// feedback).
export default function BlogLoading() {
  return (
    <main className="min-h-screen bg-bg text-fg">
      <Navigation />

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-24">
        <div className="max-w-2xl">
          <p className="mb-2 font-semibold text-accent">The SwapDoor Blog</p>
          <h1 className="text-4xl font-bold md:text-5xl">Notes on swapping homes</h1>
          <p className="mt-4 text-lg text-muted">
            What we have learned from members about hosting well, travelling slowly, and trusting a
            stranger with your keys.
          </p>
        </div>

        {/* Filter pills */}
        <div className="mt-10 flex flex-wrap gap-2">
          {[64, 84, 96, 118, 88].map((w, i) => (
            <div key={i} className="skeleton h-10 rounded-full" style={{ width: w }} />
          ))}
        </div>

        {/* Featured card */}
        <div className="mt-10 grid overflow-hidden rounded-3xl border border-border bg-surface md:grid-cols-[1.15fr_1fr]">
          <div className="skeleton h-64 min-h-[18rem] md:h-full" />
          <div className="flex flex-col justify-center gap-4 p-7 md:p-10">
            <div className="skeleton h-5 w-24 rounded-full" />
            <div className="skeleton h-8 w-4/5 rounded-md" />
            <div className="skeleton h-4 w-full rounded-md" />
            <div className="skeleton h-4 w-5/6 rounded-md" />
            <div className="skeleton mt-1 h-7 w-1/2 rounded-md" />
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <BlogCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </main>
  );
}
