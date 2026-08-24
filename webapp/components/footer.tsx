import Link from "next/link";
import { Lockup, MascotGlyph } from "@/components/brand";
import { FooterAccount } from "@/components/footer-account";
import { footerLinkClass } from "@/components/footer-link";
import { ThemeToggle } from "@/components/theme-toggle";

// The site footer.
//
// It used to be four equal columns — Brand / Explore / Account / Legal — on the
// page's own background, and it had five faults that a pass against the course
// material turns up immediately:
//
//  1. **The Legal column was dead.** Privacy and Terms were `<span>`s reading
//     "(soon)". A quarter of the footer's width, promising two documents that
//     did not exist (Nielsen #1: say where you actually are; #4: a control must
//     do what its label promises). They are real pages now — /privacy, /terms —
//     and being real, they belong in the bottom bar rather than in a column of
//     their own.
//  2. **`text-muted/50` fell below AA.** ~2.6:1 on this background. The
//     copyright line had already been fixed for exactly this — "de-emphasised
//     by size, not by fading the ink" — and Legal was the copy of the mistake
//     that survived. Nothing in here fades the ink any more.
//  3. **Column headings looked like the links under them.** Same `text-sm`,
//     differing only in weight and colour. CRAP *Contrast*: if two things are
//     not the same, make them **very** different — so a heading is now a small
//     tracked accent eyebrow, the same eyebrow the page sections use.
//  4. **The footer did not read as its own region.** It shared `bg` with the
//     page and rested on a hairline. It sits on `surface-2` now — the token
//     already used for alternating sections, so this introduces no new colour.
//  5. **The brand had no weight.** The logo was one column of four, the same
//     width as a list of three links, on a site whose whole identity is that
//     mascot. It leads now: five columns of twelve, the lockup at the top, and
//     the mascot behind it as a watermark.
//
// The heading level was wrong too: pages run h1 → h2, and this jumped to h4.
// There is now an sr-only h2 naming the landmark, and the columns are h3.
//
// Still a Server Component. The only client-side piece is <FooterAccount>, the
// one column that has to know whether anybody is signed in.

// Both of these are real and public — the repository the project is built in,
// and the idea-pitch video from the first assignment. Nothing here is a
// placeholder social icon pointing at a profile that does not exist.
const REPO_URL = "https://github.com/ivrlic02/SwapDoor";
const PITCH_URL = "https://youtu.be/juhnkCSr0zo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface-2 text-sm text-muted">
      <h2 className="sr-only">Site footer</h2>

      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-12 sm:gap-10 lg:grid-cols-12 lg:gap-8 lg:py-16">
        {/* The brand block. Wider than the link columns on purpose: it is the
            footer's anchor, not a peer of "Explore". The lockup is also a link
            home now — it was a static picture before, which is a logo in the
            one place on a page where people reach for one. */}
        <div className="relative col-span-2 lg:col-span-5">
          <Link
            href="/"
            aria-label="SwapDoor — home"
            className="inline-block rounded-sm text-fg transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-2"
          >
            <Lockup />
          </Link>
          <p className="mt-4 max-w-xs text-base text-fg">Swap homes. Travel better.</p>
          <p className="mt-2 max-w-xs">
            A community of travelers exchanging homes instead of paying for hotels — no
            nightly rate, no booking fees.
          </p>

          {/* The mascot, very faintly, behind the block. Decoration only: it
              carries no information, is aria-hidden inside <MascotGlyph>, and
              is dropped below lg, where it would sit under the copy instead of
              beside it.
              Anchored to the bottom-right corner and allowed to run off it,
              rather than floated in the middle of the column: at 7% in the
              open it read as a second, accidental copy of the logo two inches
              below the real one. Bled off an edge at 5% it reads as what it is
              — a texture in the corner, not an element. */}
          {/* The clip lives on a wrapper rather than on the column itself: the
              column's first child is a focusable link, and `overflow-hidden`
              there would cut the top of its focus ring off. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block"
          >
            <MascotGlyph className="absolute bottom-0 right-2 h-36 w-auto opacity-[0.06]" />
          </span>
        </div>

        <nav aria-labelledby="footer-explore" className="lg:col-span-3 lg:col-start-7">
          {/* The link is "Explore", not "Browse homes", because the navbar
              calls that destination Explore — one page should not have two
              names on the same screen (Nielsen #4). "Browse homes" moves up to
              be the column's heading, where it names the group instead of
              competing with the nav for the page's label. */}
          <h3
            id="footer-explore"
            className="mb-4 text-xs font-semibold uppercase tracking-widest text-accent"
          >
            Browse homes
          </h3>
          <ul className="space-y-2.5">
            <li>
              <Link href="/explore" className={footerLinkClass}>Explore</Link>
            </li>
            <li>
              <Link href="/how-it-works" className={footerLinkClass}>How it works</Link>
            </li>
            <li>
              <Link href="/blog" className={footerLinkClass}>Blog</Link>
            </li>
          </ul>
        </nav>

        <nav aria-labelledby="footer-account" className="lg:col-span-3">
          <h3
            id="footer-account"
            className="mb-4 text-xs font-semibold uppercase tracking-widest text-accent"
          >
            Account
          </h3>
          <FooterAccount />
        </nav>
      </div>

      {/* The bottom bar: the four things that belong under a rule rather than
          in a column — who made it, the legal pages, the way back up, and the
          one preference the site has.

          The theme control is its own group at the far end rather than another
          item in the link row, because it is not a destination and grouping it
          with three of those would say it was (proximity, Lecture 5). This is
          also the footer's *primary* home, not a duplicate of the one in the
          account menu: the footer is on every route in both auth states, so a
          signed-out visitor — most of them — can still find it. */}
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} SwapDoor. A student project for the User Interfaces
            course, FESB.
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link href="/privacy" className={footerLinkClass}>Privacy</Link>
            <Link href="/terms" className={footerLinkClass}>Terms</Link>

            <span aria-hidden className="hidden h-4 w-px bg-border sm:block" />

            <SocialLink href={REPO_URL} label="Source code on GitHub">
              <path d="M12 .5a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.6-4.04-1.6-.55-1.4-1.34-1.77-1.34-1.77-1.09-.75.08-.73.08-.73 1.21.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.13-.3-.54-1.53.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.23 0 4.63-2.8 5.65-5.48 5.95.43.37.82 1.1.82 2.22v3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .5Z" />
            </SocialLink>
            <SocialLink href={PITCH_URL} label="Watch the idea pitch on YouTube">
              <path d="M23.5 6.2a3 3 0 0 0-2.12-2.13C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.52A3 3 0 0 0 .5 6.2C0 8.08 0 12 0 12s0 3.92.5 5.8a3 3 0 0 0 2.12 2.13c1.88.52 9.38.52 9.38.52s7.5 0 9.38-.52a3 3 0 0 0 2.12-2.13C24 15.92 24 12 24 12s0-3.92-.5-5.8ZM9.6 15.57V8.43L15.8 12l-6.2 3.57Z" />
            </SocialLink>

            {/* Back to top. A plain fragment link, so it works with JavaScript
                off and needs no client component: `#top` is the id on <body>.
                Smooth scrolling is opted into on <html> in app/layout.tsx —
                Next 16 stopped overriding `scroll-behavior` during route
                changes, so without `data-scroll-behavior="smooth"` there every
                navigation would animate its scroll to the top instead of
                jumping. It follows prefers-reduced-motion either way. */}
            <a href="#top" className={`${footerLinkClass} inline-flex items-center gap-1.5`}>
              <span aria-hidden>↑</span> Back to top
            </a>
          </div>

          <ThemeToggle label="Appearance" className="sm:shrink-0" />
        </div>
      </div>
    </footer>
  );
}

/** One external link drawn as its icon. The label is the accessible name, and
 *  it says the link leaves the site — a new tab that arrives unannounced is a
 *  loss of user control (Nielsen #3). */
function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} (opens in a new tab)`}
      className={`${footerLinkClass} inline-flex`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden focusable="false">
        {children}
      </svg>
    </a>
  );
}
