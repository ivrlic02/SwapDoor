import { Navigation } from "@/components/navigation";

export default function SignInPage() {
  return (
    <main className="bg-[#0f1115] min-h-screen text-white">
      {/* NAVIGATION */}
      <Navigation />

      {/* CONTENT */}
      <section className="max-w-xl mx-auto px-6 py-24 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Sign In
        </h1>

        <p className="text-gray-400 text-lg">
          This page will be dedicated to user authentication and account access.
        </p>

        <div className="mt-12 border border-gray-700 rounded-xl p-8 text-gray-500">
          Authentication functionality will be implemented in a future phase.
        </div>
      </section>
    </main>
  );
}
