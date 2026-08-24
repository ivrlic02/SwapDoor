import { Navigation } from "@/components/navigation";
import { HomeHeroMap } from "@/components/home-hero-map";
import { HomeSearchProvider } from "@/components/home-search-context";
import { Trending } from "@/components/trending";
import { HowItWorks } from "@/components/how-it-works";
import { ReviewsMarquee } from "@/components/reviews-marquee";
import { Stats } from "@/components/stats";
import { CTA } from "@/components/cta";
import { Footer } from "@/components/footer";
import { getFeaturedReviews, getHouses, topCountries, topDestinations } from "@/lib/houses";

export default async function Home() {
  const [houses, featured] = await Promise.all([getHouses(), getFeaturedReviews()]);
  // No cap: the panel caps its own list, but "Near me" measures against
  // every destination — offering the 3rd-closest because the 1st did not make
  // a display limit would be a quietly wrong answer (Nielsen #1).
  const destinations = topDestinations(houses, Infinity);
  const countries = topCountries(houses);

  return (
    <main className="bg-bg text-fg">
      {/* Provider wraps the nav + hero/map so the docked search pill in the nav
          shares state with the hero bar and the map. */}
      <HomeSearchProvider destinations={destinations} countries={countries}>
        <Navigation />
        <HomeHeroMap houses={houses} />
      </HomeSearchProvider>
      <Trending houses={houses} />
      <HowItWorks />
      {/* Social proof sits between "here's how it works" and the sign-up ask:
          the last thing read before the CTA is other members saying it worked. */}
      <ReviewsMarquee reviews={featured} />
      <Stats />
      <CTA />
      <Footer />
    </main>
  );
}
