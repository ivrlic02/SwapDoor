import { Navigation } from "@/components/navigation";

export default function HowItWorksPage() {
  return (
    <main className="bg-[#0f1115] min-h-screen text-white">
      {/* NAVIGATION */}
      <Navigation />

      {/* CONTENT */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <h1 className="text-4xl md:text-5xl font-bold mb-10">
          How it Works
        </h1>

        <div className="space-y-8 text-gray-300 text-lg">
          <p>
            Our platform enables travelers to exchange homes safely and easily,
            creating authentic travel experiences without accommodation costs.
          </p>

          <p>
            Users browse verified homes, connect with hosts, arrange mutual stays,
            and enjoy living like locals in destinations worldwide.
          </p>

          <p className="text-gray-400">
            This section will be expanded with detailed explanations, visuals,
            and user guidance in future development phases.
          </p>
        </div>
      </section>
    </main>
  );
}
