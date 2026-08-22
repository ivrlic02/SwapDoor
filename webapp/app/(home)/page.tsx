import { Navigation } from "@/components/navigation";
import { HomeHeroMap } from "@/components/home-hero-map";
import { HomeSearchProvider } from "@/components/home-search-context";
import { Trending } from "@/components/trending";
import { HowItWorks } from "@/components/how-it-works";
import { ReviewsMarquee } from "@/components/reviews-marquee";
import { Stats } from "@/components/stats";
import { CTA } from "@/components/cta";
import { Footer } from "@/components/footer";
import { getFeaturedReviews, getHouses, topDestinations } from "@/lib/houses";

export default async function Home() {
  const [houses, featured] = await Promise.all([getHouses(), getFeaturedReviews()]);
  const destinations = topDestinations(houses);

  return (
    <main className="bg-bg text-fg">
      {/* Provider wraps the nav + hero/map so the docked search pill in the nav
          shares state with the hero bar and the map. */}
      <HomeSearchProvider destinations={destinations}>
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
