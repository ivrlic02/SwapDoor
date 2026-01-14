import Link from "next/link";
import { Navigation } from "@/components/navigation";

type House = {
  id: number;
  name: string;
  location: string;
  country: string;
  image: string;
  description: string;
};

type HousesResponse = {
  houses: House[];
};

async function fetchHouses(): Promise<HousesResponse> {
  const res = await fetch(
    "https://mocki.io/v1/13d0cd32-ea90-46a2-81fd-16e78d5707fe",
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch houses");
  }

  return res.json();
}

export default async function ExplorePage() {
  const { houses } = await fetchHouses();

  return (
    <main className="bg-[#0f1115] min-h-screen text-white">
      {/* NAVIGATION — FULL WIDTH */}
      <Navigation />

      {/* PAGE CONTENT */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h1 className="text-4xl md:text-6xl font-bold mb-12">
          Explore Homes
        </h1>

        <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {houses.map((house) => (
            <Link
              key={house.id}
              href={`/explore/${house.id}`}
              className="bg-[#1a1d23] rounded-xl overflow-hidden hover:scale-[1.02] transition"
            >
              <img
                src={house.image}
                alt={house.name}
                className="h-48 w-full object-cover"
              />
              <div className="p-5">
                <h2 className="text-xl font-semibold">
                  {house.name}
                </h2>
                <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                  {house.description}
                </p>
                <p className="text-sm text-gray-500 mt-3">
                  {house.location}, {house.country}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
