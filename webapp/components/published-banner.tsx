"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { buttonClass } from "@/components/button";

// "It worked" — the missing half of publishing a home.
//
// The listing form has always redirected to `/explore/<id>?published=1`, but
// nothing ever read that parameter: you pressed Publish, waited, and landed on
// an ordinary listing page with no confirmation that the thing you'd spent ten
// minutes on had actually been created. That is the Gulf of Evaluation on the
// site's second-most important action (Lecture 3), and Nielsen #3 in one line:
// the system must say what just happened.
//
// Three details worth keeping:
//  • The parameter is stripped from the URL as soon as it's read, so a refresh
//    or a shared link doesn't congratulate the next person to open the page.
//    The banner's own visibility lives in state, so stripping it doesn't
//    dismiss the message.
//  • It offers the two things a host actually wants next — see it among the
//    other homes, or manage it — plus the link to send someone, since sharing
//    is why most people publish (Nielsen #4: a clear way onward, not a dead end).
//  • It is rendered inside <Suspense> by the page, so reading the query string
//    doesn't force the statically prerendered listing pages to become dynamic.
export function PublishedBanner() {
  const params = useSearchParams();
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  // Two arrivals land here: a brand-new listing, and a saved edit. Same shape,
  // different sentence — "your home is live" would be wrong for the second.
  const [mode] = useState<"published" | "updated" | null>(() =>
    params.get("published") === "1"
      ? "published"
      : params.get("updated") === "1"
        ? "updated"
        : null
  );
  const shown = mode !== null;

  // Strip the flag once, after painting. It has to be an effect, not a
  // render-phase call: Next patches history.replaceState to drive its own
  // router, so doing it during render updates the Router while this component
  // is rendering — React warns, and the re-render remounts this banner with
  // `published` already gone, making the message flash and disappear.
  useEffect(() => {
    if (!shown) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("published") && !url.searchParams.has("updated")) return;
    url.searchParams.delete("published");
    url.searchParams.delete("updated");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, [shown]);

  if (!shown || dismissed) return null;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // Clipboard blocked (insecure context or denied permission) — say so
      // rather than silently doing nothing.
      setCopied(false);
    }
  }

  return (
    <div
      role="status"
      className="mb-6 rounded-2xl border border-success/40 bg-success/10 p-5"
    >
      <div className="flex flex-wrap items-start gap-4">
        {/* Icon + wording together: the meaning never rides on the green alone
            (Lecture 6). */}
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-success/20 text-lg text-success"
        >
          ✓
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-fg">
            {mode === "updated" ? "Your changes are live" : "Your home is live"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {mode === "updated"
              ? "Everyone browsing Explore sees the updated listing from now on. Its reviews and saves are untouched."
              : "It's on Explore now, and members can send you swap requests. You can edit or unlist it at any time from My listings."}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link href="/explore" className={buttonClass("secondary", "sm")}>
              See it on Explore
            </Link>
            <Link href="/my-listings" className={buttonClass("secondary", "sm")}>
              My listings
            </Link>
            <button type="button" onClick={copyLink} className={buttonClass("ghost", "sm")}>
              {copied ? "✓ Link copied" : "Copy link"}
            </button>
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
