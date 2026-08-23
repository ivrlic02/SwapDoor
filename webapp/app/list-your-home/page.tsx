import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { ListingForm } from "@/components/listing-form";
import { getHouses, topDestinations } from "@/lib/houses";

// Private page — the proxy (middleware) redirects signed-out users to /sign-in
// with ?next=/list-your-home, so they land back here after signing in.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "List your home · SwapDoor",
};

export default async function ListYourHomePage() {
  // Real destinations (with their live "N homes" counts) lead the City field's
  // quick-pick list; the rest comes from lib/places.ts.
  const destinations = topDestinations(await getHouses(), 6);

  return (
    <main className="bg-bg min-h-screen text-fg">
      <Navigation />

      {/* max-w-7xl, not 6xl: the nav, Explore, My listings and the dashboard
          all sit on that container, so a narrower one here started the page 64px
          to the right of the logo above it — the content simply did not line up
          with the site it was part of (CRAP alignment, Lecture 5; Nielsen #4).
          It is also the room the form needs, since it runs beside a live preview
          of the card it is building. */}
      <section className="max-w-7xl mx-auto px-4 pt-8 pb-14 sm:px-6 lg:pt-14 lg:pb-20">
        <header className="mb-8 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">List your home</h1>
          <p className="text-muted mt-3">
            Three short steps and a last look before it goes live. Your draft saves as you type, so
            you can stop and come back — and you can edit or unlist your home at any time from My
            listings.
          </p>
        </header>

        <ListingForm destinations={destinations} />
      </section>

      <Footer />
    </main>
  );
}
