"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { buttonClass } from "@/components/button";

// "Your account exists, and you are already in it" — the missing half of
// signing up, and the exact twin of <PublishedBanner> one level up the site.
//
// Sign-up used to end on the form itself, printing "Check your email to confirm
// your account, then sign in." That sentence described a state that was not
// true: this project's Supabase has email auto-confirm ON, so `signUp()` hands
// back a live session and the member is signed in before the message is even
// painted. They were told to go and wait for mail that never arrives, and left
// standing on the form they had just completed. That is the Gulf of Evaluation
// (Lecture 3) on the very first thing anyone does here, plus Nielsen #1: the
// system's report of its own state has to be the state it is actually in.
//
// Rendered from the root layout rather than from one page, because sign-up
// honours `?next=` — a guest sent here by the wishlist heart, the swap panel or
// "List your home" lands back on that page, not on the homepage, so there is no
// single destination to hang this off. It costs nothing on the routes that
// never see the flag: without `?welcome=1` it renders null.
//
// Three details kept from <PublishedBanner>, for the same reasons:
//  • The flag is stripped from the URL as soon as it is read, so a refresh or a
//    pasted link does not greet the next person as a new member. Visibility
//    lives in a latch, so stripping it does not dismiss the message.
//  • ✓ and words, never the green alone — meaning must survive a colour-blind
//    reader and a grayscale print (Lecture 6).
//  • Two ways onward instead of a dead end (Nielsen #3): finish the profile,
//    which is what decides whether a host says yes, or go and look at homes.
export function WelcomeBanner() {
  const params = useSearchParams();
  const [dismissed, setDismissed] = useState(false);

  // Read on EVERY render — deliberately not `useState(() => params.get(...))`.
  // Living in the root layout means this component is already mounted on
  // /sign-in by the time sign-up pushes the new route, and a lazy state
  // initialiser runs exactly once, at mount: it would read the query string of
  // the page the member was leaving, find no flag, and never look again. That
  // is not a theory — driving a real sign-up through headless Chrome landed the
  // browser on `/list-your-home?welcome=1` with no banner anywhere on it.
  const flagged = params.get("welcome") === "1";

  // Latching the flag into state, adjusted during render rather than from an
  // effect (https://react.dev/learn/you-might-not-need-an-effect). Two reasons
  // it has to be latched at all: the effect below strips `?welcome=1` from the
  // URL, so `flagged` reads false again on the very next render — without a
  // latch the banner would paint and vanish in the same breath — and a member
  // who dismissed it must not have it come back when something else re-renders.
  // React re-runs this component immediately on the set, before anything is
  // committed to the DOM, so there is no extra paint.
  const [shown, setShown] = useState(flagged);
  if (flagged && !shown) setShown(true);

  // Strip the flag once, after painting — an effect, not a render-phase call:
  // Next patches history.replaceState to drive its own router, so doing this
  // during render would update the Router while this component renders, which
  // React warns about.
  useEffect(() => {
    if (!shown) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("welcome")) return;
    url.searchParams.delete("welcome");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, [shown]);

  if (!shown || dismissed) return null;

  return (
    // Full-bleed strip above the sticky nav: the destination is not known in
    // advance, so the banner cannot assume a page's container — it brings its
    // own, at the same max-width every page uses, so the text still lines up
    // with the content below it (CRAP: alignment).
    <div role="status" className="border-b border-success/40 bg-success/10">
      <div className="mx-auto flex max-w-7xl flex-wrap items-start gap-4 px-4 py-4 sm:px-6">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-success/20 text-lg text-success"
        >
          ✓
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-fg">
            Your account is ready — you&rsquo;re signed in
          </h2>
          <p className="mt-1 text-sm text-muted">
            Nothing to confirm by email. Add a photo and a line about yourself
            next — that is what a host reads before agreeing to swap.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {/* "Complete profile", not "Complete your profile": at 390px the
                longer label pushed "Browse homes" onto its own line and the
                banner grew to two thirds of the screen before the page below
                it had said anything. */}
            <Link href="/profile" className={buttonClass("secondary", "sm")}>
              Complete profile
            </Link>
            <Link href="/explore" className={buttonClass("ghost", "sm")}>
              Browse homes
            </Link>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface hover:text-fg"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
