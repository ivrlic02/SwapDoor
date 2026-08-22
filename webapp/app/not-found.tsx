import Link from "next/link";
import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { buttonClass } from "@/components/button";
import { MascotGlyph } from "@/components/brand";

export const metadata: Metadata = {
  title: "Page not found – SwapDoor",
};

// A 404 is a dead end, and Nielsen #9 asks a dead end to do three things: say
// in plain language what happened, avoid blaming the person who typed the URL,
// and offer the way out. So this names the problem once, then spends the rest
// of the page on the two doors that ARE open — browsing homes, or going back to
// the start — as real buttons rather than a "go back" the browser already has.
//
// The mascot is here because a dead end is the one screen where a brand can
// afford to be charming, and because it makes the page unmistakably still
// SwapDoor rather than a server's default. Faded, so it stays decoration.
export default function NotFound() {
  return (
    <main className="bg-bg min-h-screen text-fg flex flex-col">
      <Navigation />

      <section className="flex-1 max-w-xl mx-auto px-6 py-24 text-center">
        <MascotGlyph className="mx-auto h-32 w-auto opacity-40" />

        <p className="mt-8 text-sm font-semibold tracking-[0.16em] uppercase text-accent">
          Error 404
        </p>
        <h1 className="mt-3 text-4xl md:text-5xl font-bold">This door doesn&rsquo;t open</h1>
        <p className="mt-4 text-muted">
          The page you asked for isn&rsquo;t here — it may have been moved, or the
          listing may no longer be hosted. Nothing you did is wrong.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/explore" className={buttonClass("primary")}>
            Browse homes
          </Link>
          <Link href="/" className={buttonClass("secondary")}>
            Back to home
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
