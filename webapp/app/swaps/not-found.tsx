import Link from "next/link";
import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { buttonClass } from "@/components/button";
import { MascotGlyph } from "@/components/brand";

export const metadata: Metadata = {
  title: "Swap not found – SwapDoor",
};

// The nearest not-found boundary for everything under /swaps, so a dead swap id
// stops landing on the site-wide 404 and its two exits ("Browse homes" / "Back
// to home") — neither of which is where someone who was reading their inbox
// wants to be put. Same shape as app/not-found.tsx on purpose (CRAP repetition,
// Nielsen #4): faded mascot, one plain sentence, then the doors that ARE open.
//
// The copy is careful about ONE thing: /swaps/[id] turns "not yours" and "does
// not exist" into the same 404 deliberately — RLS returns nothing either way,
// and a swap between two other people must not be probeable by id. So this page
// must not resolve that ambiguity either. It says the request isn't in *your*
// inbox and lists the reasons it might not be, without confirming that any
// request with that id exists.
export default function SwapNotFound() {
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
          That swap request isn&rsquo;t in your inbox — it may have been withdrawn,
          or the link may belong to a swap between two other members. Nothing you
          did is wrong.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/swaps" className={buttonClass("primary")}>
            All my swaps
          </Link>
          <Link href="/explore" className={buttonClass("secondary")}>
            Browse homes
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
