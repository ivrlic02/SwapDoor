import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { HouseCard } from "@/components/house-card";
import { UnlistButton } from "@/components/unlist-button";
import { buttonClass } from "@/components/button";
import { MascotGlyph } from "@/components/brand";
import { getMyListings } from "@/lib/houses";

// Private page — the proxy (middleware) redirects signed-out users to /sign-in.
// Reads the session cookie, so it must render per-request, never at build time.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "My listings · SwapDoor",
};

export default async function MyListingsPage() {
  const listings = await getMyListings();

  return (
    <main className="bg-bg min-h-screen text-fg">
      <Navigation />

      <section className="max-w-7xl mx-auto px-4 pt-8 pb-14 sm:px-6 lg:pt-14 lg:pb-20">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">My listings</h1>
            <p className="text-muted mt-2">
              {listings.length > 0
                ? `${listings.length} home${listings.length > 1 ? "s" : ""} you're offering to swap.`
                : "Homes you offer for swapping will appear here."}
            </p>
          </div>
          {listings.length > 0 && (
            <Link href="/list-your-home" className={buttonClass("primary")}>
              List another home
            </Link>
          )}
        </header>

        {listings.length > 0 ? (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((house, i) => (
              // The card is exactly what everyone else sees on Explore — you
              // manage the listing by looking at it, not at a different
              // representation of it (Nielsen #2). The owner-only controls sit
              // under it rather than on it, so the card stays unmodified.
              <div key={house.id} className="flex flex-col gap-3">
                <HouseCard house={house} priority={i < 3} />
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Editing is the common case — a price or a date changes
                        far more often than a home stops being offered — so it
                        gets a real button and Unlist stays a quiet one. */}
                    <Link
                      href={`/my-listings/${house.id}/edit`}
                      className={buttonClass("secondary", "sm")}
                    >
                      Edit listing
                    </Link>
                    <Link
                      href={`/explore/${house.id}`}
                      className="text-sm text-muted transition hover:text-fg"
                    >
                      View as a guest →
                    </Link>
                  </div>
                  <UnlistButton
                    houseId={house.id}
                    houseName={house.name}
                    photos={house.images ?? []}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-border rounded-2xl bg-surface/60 py-16 px-6 text-center">
            <MascotGlyph className="mx-auto mb-6 h-20 w-auto opacity-30" />
            <p className="text-lg font-semibold">You haven&apos;t listed a home yet</p>
            <p className="text-muted mt-2 mx-auto max-w-md">
              Listing your own home is what lets you swap into someone else&apos;s.
              It takes three short steps.
            </p>
            <Link href="/list-your-home" className={`mt-5 inline-block ${buttonClass("primary")}`}>
              List your home
            </Link>
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
