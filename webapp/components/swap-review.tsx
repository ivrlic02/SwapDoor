"use client";

import Link from "next/link";
import { ReviewForm } from "@/components/review-form";
import type { SwapHome } from "@/lib/swap-types";

// The review prompt on an accepted swap.
//
// This is the moment someone is most able and most willing to write a review —
// the stay just happened and they are already on this page reading the thread.
// Sending them off to find the listing and scroll to the bottom of it loses
// most of them, so the form itself is here, behind one button.
//
// It is the same <ReviewForm> the listing page renders, not a second copy: one
// component, two places it can be reached from, so the validation, the
// one-per-home rule and the edit/delete path cannot drift apart (Nielsen #4).
export function SwapReview({
  house,
  ownerId,
}: {
  /** The home the viewer stayed in — never their own. */
  house: SwapHome;
  /** Whoever hosts that home, so the form can rule out self-reviews. */
  ownerId: string;
}) {
  return (
    <section className="mt-4 rounded-xl border border-border bg-surface/60 px-4 py-4">
      <h3 className="text-sm font-semibold">
        How was{" "}
        <Link
          href={`/explore/${house.id}`}
          className="text-accent transition hover:text-brand"
        >
          {house.name}
        </Link>
        ?
      </h3>
      <p className="mt-1 text-sm text-muted">
        Your review is public on the listing, and it&apos;s what earns a host
        their ✓ Verified badge.
      </p>

      {/* Nothing on this page lists reviews, so there is no local list to keep
          in step — the form's own button flipping to "Edit your review" is the
          confirmation that it saved. */}
      <ReviewForm
        houseId={house.id}
        hostId={ownerId}
        onSaved={() => {}}
        onRemoved={() => {}}
      />
    </section>
  );
}
