// Reusable skeleton placeholders that mirror the real components' dimensions
// (same aspect ratios, spacing, radii) so there's no layout shift when the real
// content swaps in. Used by the route-level loading.tsx files. See `.skeleton`
// in globals.css for the shimmer.

function Bar({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} />;
}

// Matches components/house-card.tsx
export function HouseCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="skeleton aspect-[4/3] w-full" />
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-3">
          <Bar className="h-4 w-1/2" />
          <Bar className="h-4 w-16" />
        </div>
        <Bar className="mt-3 h-3.5 w-3/4" />
        <Bar className="mt-2 h-3.5 w-2/5" />
      </div>
    </div>
  );
}

export function HouseGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <HouseCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Matches the smaller cards in app/blog/page.tsx
export function BlogCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden border border-border bg-surface flex flex-col">
      <div className="skeleton h-48 w-full" />
      <div className="p-5">
        <Bar className="h-5 w-3/4" />
        <Bar className="mt-3 h-3.5 w-full" />
        <Bar className="mt-2 h-3.5 w-5/6" />
        <Bar className="mt-4 h-3 w-1/3" />
      </div>
    </div>
  );
}

// A shimmering block sized like the Leaflet map, used while it loads.
export function MapSkeleton() {
  return (
    <div className="skeleton h-[520px] w-full rounded-xl border border-border" />
  );
}
