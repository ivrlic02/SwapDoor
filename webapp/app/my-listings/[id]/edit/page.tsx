import Link from "next/link";
import { notFound } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { ListingForm, type ListingInitial } from "@/components/listing-form";
import { getHouseById, getHouses, topDestinations } from "@/lib/houses";
import { createClient } from "@/lib/supabase/server";
import type { Amenity, HomeType } from "@/lib/house-types";

// Editing a home you already listed — the same four-step form, opened on an
// existing row.
//
// Until now a published listing could only be unlisted and re-created, which
// meant losing its reviews and its id, and the form had to warn that publishing
// was final (Nielsen #4: no way back out of a state you're in). This route is
// under /my-listings, so the proxy already gates it; ownership is checked again
// here, and the owner-only UPDATE policy on `houses` is the last word.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Edit listing · SwapDoor",
};

type RawRow = {
  host_id: string | null;
  image: string | null;
  images: string[] | null;
  date: string | null;
  available_to: string | null;
  country_code: string | null;
  city_id: number | null;
  lat: number | string | null;
  lng: number | string | null;
};

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const houseId = Number(id);
  if (Number.isNaN(houseId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  // Two reads with different jobs: the raw row carries ownership and the values
  // that must be written back **exactly as stored** (enrichHouse rewrites photo
  // URLs for display and invents an availability window when the column is
  // empty — saving those derived values back would be silent data invention).
  // The enriched house supplies the display fields and sensible fallbacks.
  const [{ data }, house, allHouses] = await Promise.all([
    supabase
      .from("houses")
      .select("host_id, image, images, date, available_to, country_code, city_id, lat, lng")
      .eq("id", houseId)
      .maybeSingle(),
    getHouseById(houseId),
    getHouses(),
  ]);

  const row = data as RawRow | null;
  if (!row || !house || row.host_id !== user.id) notFound();

  const photos = (row.images && row.images.length > 0 ? row.images : [row.image]).filter(
    (p): p is string => Boolean(p)
  );

  const initial: ListingInitial = {
    name: house.name,
    type: (house.type ?? "Apartment") as HomeType,
    location: house.location,
    country: house.country,
    // From the raw row, like the photos and dates above: these are stored
    // values, not display ones, and an edit that never opens step 1 has to
    // write them back exactly as they were rather than null them out.
    countryCode: row.country_code,
    cityId: row.city_id === null ? null : Number(row.city_id),
    // Postgres numeric arrives as a string so no precision is lost on the wire.
    lat: row.lat === null ? null : Number(row.lat),
    lng: row.lng === null ? null : Number(row.lng),
    maxGuests: house.maxGuests,
    description: house.description,
    amenities: (house.amenities ?? []) as Amenity[],
    photos,
    from: row.date ?? "",
    to: row.available_to ?? "",
    value: house.pricePerNight ? String(house.pricePerNight) : "",
  };

  return (
    <main className="bg-bg min-h-screen text-fg">
      <Navigation />

      <section className="max-w-7xl mx-auto px-6 pt-14 pb-20">
        <header className="mb-8 max-w-2xl">
          <Link
            href="/my-listings"
            className="text-sm text-muted transition hover:text-fg"
          >
            ← My listings
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mt-4">Edit listing</h1>
          <p className="text-muted mt-3">
            Change anything about <span className="text-fg">{house.name}</span> and save — the
            listing updates for everyone straight away. Its reviews, saves and link stay exactly as
            they are.
          </p>
        </header>

        <ListingForm
          destinations={topDestinations(allHouses, 6)}
          initial={initial}
          houseId={houseId}
        />
      </section>

      <Footer />
    </main>
  );
}
