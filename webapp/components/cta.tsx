"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonClass } from "@/components/button";
import { useProfile } from "@/components/profile-context";

// The closing block on `/` and `/how-it-works`. It used to be one fixed pitch —
// "Join the global community · Create a free account" with *Get started free*
// pointing at /sign-in — which is the right ask for exactly one visitor: a
// signed-out one. A signed-in member met a page inviting them to create the
// account they already have, and a button whose only outcome was the sign-in
// screen they had already been through (Nielsen #1: the system should say where
// you actually are; #4: a control must do what its label promises).
//
// So the section now asks for the next thing that is actually true of the
// reader. Three states, because "signed in" is not one situation:
//
//   signed out           → make an account
//   signed in, no home   → list one (it is what makes a swap possible at all)
//   signed in, hosting   → go find a swap
//
// Read from `useProfile()` rather than from the server, deliberately: `/` and
// `/how-it-works` are statically prerendered, and reading the session on the
// server would turn both into per-request renders to personalise one block at
// the bottom of the page. The trade is that the prerendered HTML carries the
// signed-out pitch and a signed-in member sees it swap once the profile lands —
// the same behaviour the navbar has always had with "Sign In" → avatar, so it
// is one pattern on the page rather than two.
export function CTA() {
  const { ready, profile, listingCount } = useProfile();
  const pathname = usePathname();

  const state: "guest" | "no-home" | "hosting" = !ready || !profile
    ? "guest"
    : listingCount > 0
      ? "hosting"
      : "no-home";

  // "Learn more" pointed at /how-it-works from the copy of this section that
  // sits ON /how-it-works — a button that reloads the page you are reading.
  // Send those readers to the homes instead; they have just read the how.
  const onHowItWorks = pathname === "/how-it-works";

  const copy = {
    guest: {
      title: "Join the global community",
      body: "Create a free account, list your home, and start swapping with verified travelers around the world.",
      primary: { href: "/sign-in?mode=sign-up", label: "Get started free" },
      secondary: onHowItWorks
        ? { href: "/explore", label: "Browse homes" }
        : { href: "/how-it-works", label: "Learn more" },
    },
    "no-home": {
      title: "You're in. Now open your door.",
      body: "Listing your own home is what lets you swap into someone else's. It takes three short steps.",
      primary: { href: "/list-your-home", label: "List your home" },
      secondary: { href: "/explore", label: "Browse homes" },
    },
    hosting: {
      title: "Your door is open. Where to next?",
      body: "Find a home you like, propose your dates, and settle the details with the host — no nightly rate, no booking fees.",
      primary: { href: "/explore", label: "Browse homes" },
      secondary: { href: "/swaps", label: "My swaps" },
    },
  }[state];

  return (
    <section className="px-4 py-16 bg-surface-2 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-bold sm:text-3xl md:text-4xl">{copy.title}</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted">{copy.body}</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:mt-8 sm:flex-row sm:gap-4">
          <Link href={copy.primary.href} className={buttonClass("primary", "lg")}>
            {copy.primary.label}
          </Link>
          <Link href={copy.secondary.href} className={buttonClass("secondary", "lg")}>
            {copy.secondary.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
