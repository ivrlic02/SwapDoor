import { notFound } from "next/navigation";
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
};

async function fetchHouseById(id: string): Promise<House> {
  const numericId = Number(id);
  if (isNaN(numericId)) notFound();

  const res = await fetch(
    "https://mocki.io/v1/13d0cd32-ea90-46a2-81fd-16e78d5707fe",
    { cache: "no-store" }
  );
  if (!res.ok) notFound();

  const data: HousesResponse = await res.json();
  const house = data.houses.find((h) => h.id === numericId);
  if (!house) notFound();

  return house;
}

export default async function SwapDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const house = await fetchHouseById(id);

  return (
    <main className="flex min-h-screen flex-col items-center p-10">
      <Navigation />

      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold mb-6">{house.name}</h1>

        <img
          src={house.image}
          alt={house.name}
          className="w-full h-96 object-cover rounded-xl mb-6"
        />

        <p className="text-lg text-gray-700 mb-8">{house.description}</p>

        <h2 className="text-2xl font-semibold mb-4">Details</h2>

        <ul className="list-disc ml-6 mb-6 text-gray-700">
          <li><strong>Location:</strong> {house.location}, {house.country}</li>
          <li><strong>Date Available:</strong> {house.date}</li>
          <li><strong>Max Guests:</strong> {house.maxGuests}</li>
          <li><strong>Price per Night:</strong> ${house.pricePerNight}</li>
          <li><strong>Rating:</strong> {house.rating}</li>
        </ul>
      </div>
    </main>
  );
}
