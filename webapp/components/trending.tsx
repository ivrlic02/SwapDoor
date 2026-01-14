import Link from "next/link";

type House = {
  id: number;
  name: string;
  image: string;
  location: string;
  country: string;
};

async function fetchHouses(): Promise<House[]> {
  const res = await fetch(
    "https://mocki.io/v1/13d0cd32-ea90-46a2-81fd-16e78d5707fe",
    { cache: "no-store" }
  );
  const data = await res.json();
  return data.houses.slice(0, 3);
}

export async function Trending() {
  const houses = await fetchHouses();

  return (
    <section className="px-6 py-20">
      <h2 className="text-center text-3xl font-bold mb-10">
        Trending Now
      </h2>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-3 max-w-6xl mx-auto">
        {houses.map((house) => (
          <Link
            key={house.id}
            href={`/explore/${house.id}`}
            className="bg-[#1a1d23] rounded-xl overflow-hidden"
          >
            <img src={house.image} className="h-48 w-full object-cover" />
            <div className="p-4">
              <h3>{house.name}</h3>
              <p className="text-sm text-gray-400">
                {house.location}, {house.country}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="text-center mt-10">
        <Link href="/explore" className="text-blue-500">
          View All Homes →
        </Link>
      </div>
    </section>
  );
}
