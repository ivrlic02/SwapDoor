import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { HouseCard } from "@/components/house-card";
import { buttonClass } from "@/components/button";
import { MascotGlyph } from "@/components/brand";
import { getSavedHouses } from "@/lib/houses";

// Private page — the proxy (middleware) redirects signed-out users to /sign-in.
// Reads the session cookie, so it must render per-request, never at build time.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Saved homes · SwapDoor",
};

export default async function DashboardPage() {
  const saved = await getSavedHouses();

  return (
    <main className="bg-bg min-h-screen text-fg">
      <Navigation />

      <section className="max-w-7xl mx-auto px-6 pt-14 pb-20">
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold">Saved homes</h1>
          <p className="text-muted mt-2">
            {saved.length > 0
              ? `${saved.length} home${saved.length > 1 ? "s" : ""} you've saved to swap later.`
              : "Homes you save will collect here."}
          </p>
        </header>

        {saved.length > 0 ? (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((house, i) => (
              <HouseCard key={house.id} house={house} priority={i < 3} />
            ))}
          </div>
        ) : (
          <div className="border border-border rounded-2xl bg-surface/60 py-16 px-6 text-center">
            <MascotGlyph className="mx-auto mb-6 h-20 w-auto opacity-30" />
            <p className="text-lg font-semibold">No saved homes yet</p>
            <p className="text-muted mt-2">
              Tap the ♥ on any listing to keep it here for later.
            </p>
            <Link href="/explore" className={`mt-5 inline-block ${buttonClass("primary")}`}>
              Explore homes
            </Link>
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
