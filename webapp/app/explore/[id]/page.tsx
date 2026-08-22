import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Avatar } from "@/components/avatar";
import { Gallery } from "@/components/gallery";
import { AmenityList } from "@/components/amenity-list";
import { BackToResults } from "@/components/back-to-results";
import { HouseCard } from "@/components/house-card";
import { HouseMapSection } from "@/components/house-map-section";
import { ReviewsSection, Stars } from "@/components/reviews-section";
import { SaveButton } from "@/components/save-button";
import { SwapDockSentinel, SwapPanel } from "@/components/swap-panel";
import { SwapDockProvider } from "@/components/swap-dock-context";
import { PublishedBanner } from "@/components/published-banner";
import { getHouseById, getHouses, getReviews } from "@/lib/houses";
import { pageMetadata } from "@/lib/seo";
import type { House } from "@/lib/houses";

// Hosts can now edit a published listing, so a page frozen at build time would
// keep serving the old copy. Still prerendered (instant), just re-generated at
// most once a minute once the underlying row changes.
export const revalidate = 60;

// Pre-render every house detail page at build time so opening one (e.g. from a
// map pin) is instant instead of a per-request fetch. New ids still render on
// demand (dynamicParams defaults to true).
export async function generateStaticParams() {
  const houses = await getHouses();
  return houses.map((h) => ({ id: String(h.id) }));
}

// Every listing used to share the site-wide title, so ten open tabs were ten
// identical "SwapDoor" labels and a shared link previewed as the generic site.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const house = await getHouseById(Number(id));
  // A dead listing link is still a link someone pasted somewhere. Returning
  // only a title leaves the root's openGraph block in place, so an unlisted
  // home previewed as the homepage — the preview promised the front door and
  // the click delivered a 404 (Nielsen #1).
  if (!house)
    return pageMetadata({
      title: "Home not found · SwapDoor",
      shareTitle: "This home is no longer listed",
      description:
        "The home behind this link isn't hosted on SwapDoor any more. Browse the homes that are.",
      path: `/explore/${id}`,
    });

  // Some listings carry a region or a country in `location` rather than a city
  // — the seeded Costa Rica home is literally "Costa Rica, Costa Rica" — and a
  // share card that stutters reads as generated, which is the opposite of what
  // a trust-driven preview is for.
  const place = [house.location, house.country]
    .filter((p, i, all) => p && all.indexOf(p) === i)
    .join(", ");
  const title = `${house.name} — ${place}`;
  return pageMetadata({
    title: `${title} · SwapDoor`,
    shareTitle: title,
    description: house.description,
    path: `/explore/${house.id}`,
    image: {
      url: house.image,
      alt: `${house.name} — a home to swap in ${place}`,
    },
  });
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

// Three homes to look at next, so the page doesn't dead-end after the reviews:
// same country first (you're already picturing that trip), then anything of the
// same type, highest-rated first. The heading follows the actual picks — a
// "More homes in Greece" strip has to contain homes in Greece, or it's a label
// that lies about its content (Nielsen #1).
function similarHomes(all: House[], current: House): { homes: House[]; sameCountry: boolean } {
  const others = all.filter((h) => h.id !== current.id);
  const byRating = (a: House, b: House) => b.rating - a.rating;

  const sameCountry = others.filter((h) => h.country === current.country).sort(byRating);
  if (sameCountry.length >= 3) return { homes: sameCountry.slice(0, 3), sameCountry: true };

  const sameType = others
    .filter((h) => h.country !== current.country && h.type === current.type)
    .sort(byRating);
  return {
    homes: [...sameCountry, ...sameType].slice(0, 3),
    sameCountry: sameCountry.length > 0 && sameType.length === 0,
  };
}

export default async function SwapDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (Number.isNaN(numericId)) notFound();

  const [house, reviews, allHouses] = await Promise.all([
    getHouseById(numericId),
    getReviews(numericId),
    getHouses(),
  ]);
  if (!house) notFound();

  const availableFrom = fmtDate(house.date);
  const availableTo = house.availableTo ? fmtDate(house.availableTo) : null;
  const availability = availableTo ? `${availableFrom} – ${availableTo}` : availableFrom;
  const { homes: similar, sameCountry } = similarHomes(allHouses, house);
  const hostName = house.host?.name ?? "Your host";

  return (
    // The provider wraps <Navigation> as well as the panel: the nav is what
    // renders the docked pill, so it has to be able to see this page's dock
    // state. Same arrangement Explore uses for HomeSearchProvider.
    <SwapDockProvider>
    <main className="min-h-screen bg-bg text-fg">
      <Navigation />

      {/* Bottom padding leaves room for the mobile action bar to sit over the
          page without covering the footer's last row. */}
      <div className="mx-auto max-w-6xl px-6 pb-32 pt-8 lg:pb-20">
        {/* "Your home is live", shown only when we arrive straight from
            publishing. Inside <Suspense> because it reads the query string —
            without the boundary that would opt every listing page out of static
            prerendering just to greet one visitor. */}
        <Suspense fallback={null}>
          <PublishedBanner />
        </Suspense>

        <BackToResults />

        {/* One identity block: name, then a single meta line carrying rating,
            reviews, trust and place. They belong together, so they sit together
            (CRAP: proximity) instead of scattering across the header. */}
        <header className="mt-4 mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">{house.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              {/* A home nobody has stayed in yet has no rating to show. Stars
                  filled to 0.0 would read as a bad score rather than an absent
                  one, so a new listing says so in words instead. */}
              {reviews.length > 0 ? (
                <>
                  <span className="flex items-center gap-1.5">
                    <Stars value={house.rating} />
                    <span className="font-semibold text-fg">{house.rating.toFixed(1)}</span>
                  </span>
                  <Dot />
                  <span>
                    {reviews.length} review{reviews.length === 1 ? "" : "s"}
                  </span>
                </>
              ) : (
                <span className="font-semibold text-fg">New listing</span>
              )}
              {house.verified && (
                <>
                  <Dot />
                  <span className="flex items-center gap-1 font-semibold text-success">
                    <span aria-hidden>✓</span> Verified
                  </span>
                </>
              )}
              <Dot />
              <span className="flex items-center gap-1.5">
                <PinIcon />
                {house.location}, {house.country}
              </span>
            </div>
          </div>

          <SaveButton houseId={house.id} variant="inline" />
        </header>

        <Gallery
          images={house.images ?? [house.image]}
          alt={`${house.name} in ${house.location}, ${house.country}`}
        />

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-12">
          {/* Main content */}
          <div>
            {/* The facts you scan before reading anything — one row, no cards,
                so they read as a summary rather than four competing boxes. */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              {house.type && <Fact>{house.type}</Fact>}
              <Fact>Sleeps {house.maxGuests}</Fact>
              <Fact>Available {availability}</Fact>
            </div>

            {/* Only a top rule on the host block: the next section draws its
                own, and two hairlines 40px apart read as a mistake, not as
                structure. */}
            {house.host && (
              <section className="mt-6 flex flex-wrap items-center gap-4 border-t border-border pt-5">
                <Avatar name={house.host.name} src={house.host.avatarUrl} size={52} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-fg">
                    Hosted by {house.host.name}
                    {house.verified && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                        <span aria-hidden>✓</span> Verified
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted">
                    {[
                      house.host.location,
                      house.host.memberSince ? `Member since ${house.host.memberSince}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {house.host.bio && (
                  <p className="w-full text-sm leading-relaxed text-muted">{house.host.bio}</p>
                )}
              </section>
            )}

            <Section title="About this home">
              <p className="text-lg leading-relaxed text-muted">{house.description}</p>
            </Section>

            {/* Amenities finally appear on the page you land on after filtering
                by them — see the note in <AmenityList>. */}
            {house.amenities && house.amenities.length > 0 && (
              <Section title="What this home offers">
                <AmenityList amenities={house.amenities} />
              </Section>
            )}

          </div>

          {/* Swap sidebar — the page's single action, kept in view while the
              left column scrolls. */}
          <aside className="lg:sticky lg:top-24 h-fit">
            <SwapPanel
              houseId={house.id}
              houseName={house.name}
              hostId={house.hostId}
              hostName={hostName}
              hostAvatarUrl={house.host?.avatarUrl}
              pricePerNight={house.pricePerNight}
              maxGuests={house.maxGuests}
              availableFrom={house.date}
              availableTo={house.availableTo ?? null}
              verified={Boolean(house.verified)}
            />
          </aside>
        </div>

        {/* Once this 1px line passes under the nav, the sticky panel has gone
            with the two-column section and the page's only action is off
            screen — so the nav docks a compact swap pill. It sits HERE, not
            inside the sidebar: a sentinel inside a sticky element never leaves
            the viewport, so it would never fire. */}
        <SwapDockSentinel />

        {/* The map and the reviews run the FULL width, below the two columns.
            Inside the 1.6fr article column the map was a small box with a dead
            third of the page beside it; out here it gets the room a location
            actually needs, and the reviews grid stops being cramped. */}
        {typeof house.lat === "number" && typeof house.lng === "number" && (
          <Section title="Where you'll be">
            <p className="mb-4 text-muted">
              {house.location}, {house.country}
            </p>
            <HouseMapSection
              lat={house.lat}
              lng={house.lng}
              label={`${house.name} — approximate area`}
              className="h-[360px] lg:h-[440px]"
            />
            <p className="mt-3 text-xs text-muted">
              The circle shows the neighbourhood. The exact address is shared once a swap is
              confirmed by both sides.
            </p>
          </Section>
        )}

        <Section title={null}>
          {/* houseId + hostId let the section offer a review form. Both are
              already loaded here, and the form itself is client-side, so this
              page keeps its prerender — asking the server "has this viewer
              reviewed it?" would have made every visit dynamic. */}
          <ReviewsSection
            reviews={reviews}
            rating={house.rating}
            houseId={house.id}
            hostId={house.hostId}
          />
        </Section>

        {similar.length > 0 && (
          <section className="mt-16 border-t border-border pt-10">
            <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-2xl font-semibold">
                {sameCountry ? `More homes in ${house.country}` : "Similar homes you might like"}
              </h2>
              <Link href="/explore" className="text-sm font-semibold text-accent hover:underline">
                Browse all homes →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((h) => (
                <HouseCard key={h.id} house={h} />
              ))}
            </div>
          </section>
        )}
      </div>

      <Footer />
      {/* Clearance so the fixed mobile bar never sits on top of the footer's
          last row. */}
      <div aria-hidden className="h-20 lg:hidden" />
    </main>
    </SwapDockProvider>
  );
}

function Section({ title, children }: { title: string | null; children: React.ReactNode }) {
  return (
    <section className="mt-10 border-t border-border pt-8 first:border-t-0">
      {title && <h2 className="mb-4 text-2xl font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

function Fact({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-muted">
      {children}
    </span>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-muted/50">
      ·
    </span>
  );
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
