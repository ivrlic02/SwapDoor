import { Suspense } from "react";
import { Navigation } from "@/components/navigation";
import { AuthForm } from "@/components/auth-form";
import { MascotGlyph } from "@/components/brand";

export default function SignInPage() {
  return (
    <main className="bg-bg min-h-screen text-fg">
      {/* NAVIGATION */}
      <Navigation />

      {/* CONTENT */}
      <section className="max-w-md mx-auto px-6 py-24">
        {/* The page that asks for a password should say whose password it is.
            Two of the three personas commit on trust rather than price, and an
            unbranded credential form is exactly what they have been taught to
            distrust. The mascot alone, not the full lockup — the heading right
            below already says the name, and printing it twice is noise. */}
        <MascotGlyph className="mx-auto mb-6 h-20 w-auto" />
        <h1 className="text-4xl md:text-5xl font-bold mb-3 text-center">
          Welcome to SwapDoor
        </h1>
        <p className="text-muted text-center">
          Sign in or create an account to start swapping homes.
        </p>

        {/* AuthForm reads ?next= via useSearchParams, which opts the subtree
            into client-side rendering; the boundary keeps the rest of the page
            statically prerendered. */}
        <Suspense fallback={<div className="mt-10 h-96" />}>
          <AuthForm />
        </Suspense>
      </section>
    </main>
  );
}
