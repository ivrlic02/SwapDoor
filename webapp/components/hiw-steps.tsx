"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { HowItWorksStep } from "@/lib/cms-types";
import { ArrowRightIcon } from "@/components/icons";

// The sticky step rail on /how-it-works.
//
// The problem it solves is not decoration. `<HowItWorks />` — the four-card
// grid — was rendered *identically* on the homepage and on /how-it-works, so
// clicking "How it Works" in the nav delivered the exact block the visitor had
// just scrolled past on the homepage. The nav link promised a page and gave
// back a repeat, which is a failure of Nielsen #1 (match between system and the
// real world): the label set an expectation the destination did not meet.
//
// The rail also carries a second heuristic. On a long explainer, "where am I
// and how much is left" is visibility of system status (#3) — the same reason
// Explore prints "Showing N of M". The rail answers it continuously: the dot
// for the section crossing the middle of the viewport is filled, the ones
// behind it are marked done, and every entry is a link, so the page is
// navigable rather than merely scrollable (#7, recognition over recall).
//
// `panels` arrives as already-rendered Server Component output — the listing
// panel reads real homes out of Supabase, which a Client Component cannot do.
// Passing them as a prop keeps that work on the server.

export function HowItWorksSteps({
  steps,
  panels,
}: {
  steps: HowItWorksStep[];
  panels: ReactNode[];
}) {
  const [active, setActive] = useState(0);
  const sections = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const nodes = sections.current.filter(Boolean) as HTMLElement[];
    if (nodes.length === 0) return;

    // The band is the middle slice of the viewport: a section counts as "the
    // one being read" while it crosses the centre, so the rail changes at the
    // moment the reader's eye is on the new section rather than the moment its
    // top edge appears.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = nodes.indexOf(entry.target as HTMLElement);
          if (index >= 0) setActive(index);
        }
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [steps.length]);

  return (
    <div className="mx-auto max-w-6xl px-6">
      <div className="gap-14 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)]">
        {/* The rail. Hidden below lg, where there is no room for a second
            column and the numbered heading on each section does the same job. */}
        <nav aria-label="Steps" className="hidden lg:block">
          <ol className="sticky top-28 border-l border-border">
            {steps.map((step, i) => {
              const state = i === active ? "current" : i < active ? "done" : "upcoming";
              return (
                <li key={step.key} className="relative">
                  <a
                    href={`#step-${step.key}`}
                    aria-current={state === "current" ? "step" : undefined}
                    className="group flex items-start gap-3 py-3 pl-5 pr-2 transition"
                  >
                    {/* Marker sits ON the rail line. Filled = here, ring = done,
                        hollow = ahead — three states told by shape as well as by
                        colour, so the rail still reads in greyscale (L6). */}
                    <span
                      aria-hidden
                      className={`absolute -left-[5px] top-[1.15rem] h-2.5 w-2.5 rounded-full border-2 transition ${
                        state === "current"
                          ? "scale-125 border-accent bg-accent"
                          : state === "done"
                            ? "border-accent bg-bg"
                            : "border-border bg-bg"
                      }`}
                    />
                    <span className="min-w-0">
                      <span
                        className={`block text-xs font-semibold tabular-nums transition ${
                          state === "upcoming" ? "text-muted/70" : "text-accent"
                        }`}
                      >
                        Step {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`block text-sm leading-snug transition ${
                          state === "current"
                            ? "font-semibold text-fg"
                            : "text-muted group-hover:text-fg"
                        }`}
                      >
                        {step.title}
                      </span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="space-y-20 lg:space-y-28">
          {steps.map((step, i) => (
            <section
              key={step.key}
              id={`step-${step.key}`}
              ref={(el) => {
                sections.current[i] = el;
              }}
              // Clears the fixed navigation when the rail jumps here.
              className="scroll-mt-28"
            >
              <p className="mb-2 text-sm font-semibold tabular-nums text-accent lg:hidden">
                Step {String(i + 1).padStart(2, "0")}
              </p>
              <h2 className="text-2xl font-bold leading-tight md:text-3xl">{step.title}</h2>
              {/* Left-aligned at a controlled measure. The old page centred
                  every paragraph on the page, which Lecture 5 calls out
                  specifically: centre alignment is poor for paragraphs of text,
                  because the ragged left edge gives the eye no fixed place to
                  start the next line. */}
              <p className="mt-4 max-w-[60ch] text-lg leading-relaxed text-muted">{step.body}</p>

              {step.ctaLabel && step.ctaHref && (
                <Link
                  href={step.ctaHref}
                  className="mt-5 inline-flex items-center gap-1.5 font-semibold text-accent transition hover:text-brand"
                >
                  {step.ctaLabel}
                  <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
              )}

              <div className="mt-8">{panels[i]}</div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
