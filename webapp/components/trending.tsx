import Link from "next/link";
import type { House } from "@/lib/houses";
import { HouseCard } from "@/components/house-card";

export function Trending({ houses }: { houses: House[] }) {
  const top = houses.slice(0, 3);

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 font-semibold text-accent">Popular right now</p>
            <h2 className="text-3xl font-bold">Trending homes</h2>
          </div>
          <Link
            href="/explore"
            className="hidden shrink-0 text-accent transition hover:text-fg sm:inline"
          >
            View all homes →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {top.map((house, i) => (
            <HouseCard key={house.id} house={house} priority={i === 0} />
          ))}
        </div>

        <div className="mt-10 text-center sm:hidden">
          <Link href="/explore" className="text-accent transition hover:text-fg">
            View all homes →
          </Link>
        </div>
      </div>
    </section>
  );
}
