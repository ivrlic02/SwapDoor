"use client";

import Link from "next/link";
import { useProfile } from "@/components/profile-context";
import { footerLinkClass } from "@/components/footer-link";

// The footer's "Account" column, split out as the one client-side piece so the
// rest of <Footer> stays a Server Component and every static page keeps
// shipping it as plain HTML.
//
// It had the same fault the closing CTA had: a signed-in member was offered
// "Sign in". And "List your home" pointed at `/sign-in` rather than at the
// listing flow — a label that names one destination and goes to another
// (Nielsen #4). It does not need to point at sign-in to be safe: the route is
// gated in proxy.ts, which sends a signed-out visitor to /sign-in with
// `?next=/list-your-home` and lands them back on the form afterwards. Linking
// it directly is therefore both honest and strictly better for a guest, who
// used to arrive on the homepage after signing in and have to find the flow
// again.
//
// Two rows in both states, so the footer's column heights don't shift when the
// profile lands.
export function FooterAccount() {
  const { profile } = useProfile();

  return (
    <ul className="space-y-2.5">
      <li>
        {profile ? (
          <Link href="/swaps" className={footerLinkClass}>
            My swaps
          </Link>
        ) : (
          <Link href="/sign-in" className={footerLinkClass}>
            Sign in
          </Link>
        )}
      </li>
      <li>
        <Link href="/list-your-home" className={footerLinkClass}>
          List your home
        </Link>
      </li>
    </ul>
  );
}
