import Link from "next/link";
import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { CTA } from "@/components/cta";
import { Footer } from "@/components/footer";
import { HowItWorksSteps } from "@/components/hiw-steps";
import { StepPanelView } from "@/components/hiw-panels";
import { TrustIcon, ArrowRightIcon } from "@/components/icons";
import { getHowItWorks } from "@/lib/cms";
import { getHouses } from "@/lib/houses";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "How it works – SwapDoor",
  shareTitle: "How home swapping works",
  description:
    "Four steps from browsing homes to swapping keys — plus what the ✓ Verified badge means, how reviews are earned, and answers to what a swap actually costs.",
  path: "/how-it-works",
});

// The page is now content out of the CMS (`site_content`), so it revalidates
// like the blog does. It still prerenders — an editor's change appears within a
// minute without the page ever being rendered per request.
export const revalidate = 60;

export default async function HowItWorksPage() {
  const [content, houses] = await Promise.all([getHowItWorks(), getHouses()]);

  // The step panels are rendered here, on the server, and handed to the client
  // rail as props: the "listings" panel shows real homes, which means a
  // database read the Client Component cannot do itself. Verified homes first,
  // so the panel that talks about trust is not illustrated by a home without it.
  const showcase = [...houses]
    .filter((h) => h.reviewCount && h.reviewCount > 0)
    .sort((a, b) => Number(b.verified ?? false) - Number(a.verified ?? false))
    .slice(0, 2);

  const panels = content.steps.map((step) => (
    <StepPanelView key={step.key} kind={step.panel} houses={showcase} />
  ));

  // FAQ answers are grouped in the data; the page derives the group order from
  // the content rather than hardcoding it, so an editor can add a group in
  // /admin without a code change.
  const faqGroups = content.faq.reduce<Record<string, typeof content.faq>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-bg text-fg">
      <Navigation />

      {/* Intro. Left-aligned rather than centred: it is a paragraph, and the
          rest of the page is a left-aligned column, so centring it here would
          have started the page on an alignment the page then abandons
          (Lecture 5 — find a strong alignment and stick to it). */}
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-10 sm:px-6 lg:pt-16 lg:pb-14">
        <div className="max-w-2xl">
          <p className="mb-2 font-semibold text-accent">{content.intro.eyebrow}</p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">{content.intro.title}</h1>
          <p className="mt-4 text-base leading-relaxed text-muted sm:mt-5 sm:text-lg">{content.intro.subtitle}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
            >
              Browse homes
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <a
              href="#faq"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-fg transition hover:bg-surface"
            >
              Read the questions first
            </a>
          </div>
        </div>
      </section>

      {/* The four steps, each beside the part of the product it describes. */}
      <section className="pb-16 lg:pb-24">
        <HowItWorksSteps steps={content.steps} panels={panels} />
      </section>

      {/* Trust */}
      <section className="border-y border-border bg-surface-2 px-4 py-14 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-7 max-w-2xl lg:mb-12">
            <p className="mb-2 font-semibold text-accent">Built on trust</p>
            <h2 className="text-2xl font-bold sm:text-3xl">What actually protects you</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
            {content.trust.map((t) => (
              <div key={t.title} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand/15 text-accent sm:mb-4 sm:h-12 sm:w-12">
                  <TrustIcon name={t.icon} className="h-6 w-6" />
                </span>
                <h3 className="mb-2 text-lg font-semibold">{t.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ, grouped. Eight questions in one flat list would be a wall; four
          named groups let someone jump straight to the one worry they arrived
          with (Hick's law, Lecture 3 — and progressive disclosure, since every
          answer ships closed). */}
      <section id="faq" className="scroll-mt-24 px-4 py-14 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-7 max-w-2xl lg:mb-12">
            <p className="mb-2 font-semibold text-accent">Before you commit</p>
            <h2 className="text-2xl font-bold sm:text-3xl">Questions people actually ask</h2>
          </div>

          <div className="grid gap-x-12 gap-y-8 md:grid-cols-2 lg:gap-y-10">
            {Object.entries(faqGroups).map(([group, items]) => (
              <div key={group}>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-accent">
                  {group}
                </h3>
                <div className="space-y-3">
                  {items.map((item) => (
                    <details
                      key={item.q}
                      className="group rounded-xl border border-border bg-surface p-4 [&_summary]:cursor-pointer sm:p-5"
                    >
                      <summary className="flex items-start justify-between gap-4 font-semibold marker:content-none">
                        {item.q}
                        <span
                          aria-hidden
                          className="mt-0.5 shrink-0 text-lg leading-none text-accent transition group-open:rotate-45"
                        >
                          +
                        </span>
                      </summary>
                      <p className="mt-3 leading-relaxed text-muted">{item.a}</p>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-muted lg:mt-12">
            Still unsure?{" "}
            <Link href="/explore" className="text-accent transition hover:text-brand">
              Look at a few homes
            </Link>{" "}
            — you can read a listing, its reviews and its host without an account.
          </p>
        </div>
      </section>

      <CTA />
      <Footer />
    </main>
  );
}
