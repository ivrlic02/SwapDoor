import Link from "next/link";
import { SearchIcon, MessageIcon, KeyIcon, GlobeIcon, ArrowRightIcon } from "@/components/icons";

// The How-it-Works *summary* on the homepage.
//
// This component used to be rendered on BOTH `/` and `/how-it-works`, which
// meant the nav link "How it Works" delivered the identical block the visitor
// had just scrolled past — a promise the destination did not keep (Nielsen #1).
// `/how-it-works` is now its own page, built from CMS content with a sticky step
// rail and a live product panel per step, and this stayed behind as what it
// always should have been: a four-line teaser on the homepage that ends in a
// link to the real thing.
//
// It is deliberately NOT read from the CMS. `/` is statically prerendered with
// no per-request work, and this is chrome rather than content — four words per
// step that summarise a page rather than duplicating it. The page itself is
// where an editor changes the wording.

const STEPS = [
  {
    icon: SearchIcon,
    title: "Browse",
    body: "Search real homes worldwide by destination, dates and guests.",
  },
  {
    icon: MessageIcon,
    title: "Connect",
    body: "Ask questions in a private thread before anyone commits.",
  },
  {
    icon: KeyIcon,
    title: "Exchange",
    body: "Both sides confirm the dates and swap keys. No fees, no nightly rate.",
  },
  {
    icon: GlobeIcon,
    title: "Experience",
    body: "Live like a local, then leave a review that builds your record.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-surface-2 px-4 py-14 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 text-center lg:mb-12">
          <p className="mb-2 font-semibold text-accent">Simple by design</p>
          <h2 className="text-2xl font-bold sm:text-3xl">How it works</h2>
        </div>

        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
          {STEPS.map((step, i) => {
            const Glyph = step.icon;
            return (
              <li
                key={step.title}
                // Four centred cards is four screenfuls of mostly padding on
                // a phone: each is ~220px tall to hold an icon and two short
                // lines, so the section costs ~900px of scrolling to say four
                // words. Below `sm` the same card lies down — icon at the left,
                // text beside it — which is the shape a step in a list actually
                // has, and puts the icon next to the words it belongs to rather
                // than above them (CRAP proximity). `sm:block` + `sm:contents`
                // hands the desktop layout back untouched.
                className="relative flex gap-4 rounded-2xl border border-border bg-surface p-4 text-left sm:block sm:p-6 sm:text-center"
              >
                {/* Drawn icons, not emoji. An emoji is a font glyph the OS
                    chooses, so 🔍 💬 🔑 🌏 rendered as an Apple cartoon here, a
                    flat Windows two-tone there — the most prominent element in
                    each card was the one element that looked different on every
                    machine, against a brand that is otherwise all traced vector
                    (CRAP repetition, Nielsen #2 consistency). */}
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand/15 text-accent sm:mx-auto sm:mb-4 sm:h-14 sm:w-14">
                  <Glyph className="h-6 w-6 sm:h-7 sm:w-7" />
                </span>
                <div className="min-w-0 sm:contents">
                  <div className="mb-1 text-sm font-semibold tabular-nums text-accent">
                    Step 0{i + 1}
                  </div>
                  <h3 className="mb-1.5 text-lg font-semibold sm:mb-2">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{step.body}</p>
                </div>

                {/* Connector arrow between steps on wide screens */}
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute right-[-28px] top-1/2 hidden -translate-y-1/2 text-border lg:block"
                  >
                    <ArrowRightIcon className="h-6 w-6" />
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        <p className="mt-8 text-center lg:mt-12">
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-1.5 font-semibold text-accent transition hover:text-brand"
          >
            See each step in the app
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </p>
      </div>
    </section>
  );
}
