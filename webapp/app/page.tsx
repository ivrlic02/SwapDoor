import { Navigation } from "@/components/navigation";
import { Hero } from "@/components/hero";
import { Trending } from "@/components/trending";
import { HowItWorks } from "@/components/how-it-works";
import { Stats } from "@/components/stats";
import { CTA } from "@/components/cta";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <main className="bg-[#0f1115] text-white">
      <Navigation />
      <Hero />
      <Trending />
      <HowItWorks />
      <Stats />
      <CTA />
      <Footer />
    </main>
  );
}
