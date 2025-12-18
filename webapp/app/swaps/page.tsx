import Link from "next/link";
import { Navigation } from "@/components/navigation";

type House = {
  id: number;
  name: string;
  location: string;
  country: string;
  date: string;
  maxGuests: number;
  pricePerNight: number;
  rating: number;
  image: string;
  description: string;
};

type HousesResponse = {
  houses: House[];
  totalHouses: number;
  limit: number;
  skip: number;
};

async function fetchHouses(): Promise<HousesResponse> {
  const res = await fetch(
    "https://mocki.io/v1/13d0cd32-ea90-46a2-81fd-16e78d5707fe",
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("Failed to fetch houses");
  return res.json();
}

export default async function SwapsPage() {
  const data = await fetchHouses();
  const houses = data.houses;

  return (
    <main className="flex min-h-screen flex-col items-center p-10">
      <Navigation />

      <h1 className="text-6xl font-extrabold tracking-tight mb-10">Swaps</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-7xl">
        {houses.map((house) => (
          <Link
            key={house.id}
            href={`/swaps/${house.id}`}
            className="border rounded-xl overflow-hidden hover:shadow-lg transition"
          >
            <img
              src={house.image}
              alt={house.name}
              className="h-48 w-full object-cover"
            />
            <div className="p-4">
              <h2 className="text-xl font-semibold">{house.name}</h2>
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                {house.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
