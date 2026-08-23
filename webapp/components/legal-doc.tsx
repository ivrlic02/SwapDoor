import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";

// The shared shape of /privacy and /terms.
//
// Two pages with the same skeleton get one component, for the same reason
// buttonClass and lib/seo.ts exist: the alternative is two documents that drift
// apart in type scale and spacing until the site looks like it was assembled by
// two people (CRAP *Repetition*).
//
// A legal page is a page people *scan*, not read, so the layout is built for
// scanning: a `max-w-3xl` measure, numbered section headings that are much
// larger than the body (Contrast), and generous space between sections so the
// grouping is done by proximity rather than by rules (Proximity).
//
// `updated` is a plain string rather than a Date, deliberately: it is the date
// the text was last written, not the date the page was rendered. A legal page
// that quietly re-dates itself on every deploy is telling the reader something
// untrue about when its terms last changed.

export type LegalSection = {
  heading: string;
  /** Paragraphs. Rendered in order, before any list. */
  body?: string[];
  /** Bullets, for the sections that enumerate (what we store, what you agree to). */
  bullets?: string[];
};

export function LegalDoc({
  eyebrow,
  title,
  intro,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <main className="min-h-screen bg-bg text-fg">
      <Navigation />

      <article className="mx-auto max-w-3xl px-4 pb-14 pt-10 sm:px-6 lg:pb-20 lg:pt-16">
        <header>
          <p className="mb-2 font-semibold text-accent">{eyebrow}</p>
          <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl">{title}</h1>
          <p className="mt-5 text-lg text-muted">{intro}</p>
          <p className="mt-4 text-sm text-muted">Last updated: {updated}</p>
        </header>

        {/* The honesty note. It is the first thing on both pages on purpose:
            everything below is written for a university project, and a reader
            who assumes otherwise would be reading a commercial policy that does
            not exist (Nielsen #1 — the system should say where you actually
            are). */}
        <aside className="mt-8 rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
          <p>
            <strong className="text-fg">SwapDoor is a student project</strong>, built for the
            User Interfaces course at FESB, University of Split. It is not a commercial
            service: no money changes hands, no accommodation is actually booked, and the
            site may be reset or taken offline at any time.
          </p>
        </aside>

        <div className="mt-12 space-y-10">
          {sections.map((section, i) => (
            <section key={section.heading}>
              <h2 className="text-xl font-bold md:text-2xl">
                <span aria-hidden className="mr-3 text-accent">
                  {i + 1}.
                </span>
                {section.heading}
              </h2>
              {section.body?.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-muted">
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-3 space-y-2 text-muted">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {/* Every page needs a way onward, not just a way back — a document that
            ends in nothing is a dead end (the same fault the swaps 404 was
            built to fix). */}
        <nav className="mt-14 flex flex-wrap gap-x-6 gap-y-3 border-t border-border pt-8 text-sm">
          <Link href="/privacy" className="text-accent underline-offset-4 transition hover:underline">
            Privacy
          </Link>
          <Link href="/terms" className="text-accent underline-offset-4 transition hover:underline">
            Terms
          </Link>
          <Link href="/how-it-works" className="text-accent underline-offset-4 transition hover:underline">
            How it works
          </Link>
          {/* "Explore", not "Browse homes" — the navbar's name for this page is
              the name it gets everywhere (Nielsen #4). */}
          <Link href="/explore" className="text-accent underline-offset-4 transition hover:underline">
            Explore homes →
          </Link>
        </nav>
      </article>

      <Footer />
    </main>
  );
}
