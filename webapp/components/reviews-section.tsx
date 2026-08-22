"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { buttonClass } from "@/components/button";
import { ReviewForm } from "@/components/review-form";
import { Stars } from "@/components/stars";
import type { Review } from "@/lib/house-types";

// Re-exported so existing callers (the listing page imports both from here)
// keep working now that Stars lives in its own hook-free module.
export { Stars };

const PREVIEW = 4;

// Reviews are the #1 trust driver for the two cautious personas, so this does
// more than list them:
//  • a summary first — average, count, and a bar per star level, so the shape of
//    the reputation is readable at a glance instead of by reading every card
//    (Lecture 5: contrast organises information);
//  • only the first four are rendered, the rest behind one button (progressive
//    disclosure, Hick's law) with the count stated up front so the button is a
//    known quantity, never a mystery.
export function ReviewsSection({
  reviews,
  rating,
  houseId,
  hostId,
}: {
  reviews: Review[];
  rating: number;
  houseId: number;
  /** The home's owner — the one person who cannot review it. */
  hostId?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  // The server-rendered list is the starting point, not the whole truth: this
  // page is prerendered, so a review written just now would not appear until
  // the next revalidation. Keeping the list in state lets a save show up at
  // once (Nielsen #1) instead of looking like it failed.
  const [live, setLive] = useState<Review[]>(reviews);

  function handleSaved(saved: Review, wasEdit: boolean) {
    setLive((prev) =>
      wasEdit
        ? prev.map((r) => (r.id === saved.id ? saved : r))
        : [saved, ...prev]
    );
  }

  function handleRemoved(id: number) {
    setLive((prev) => prev.filter((r) => r.id !== id));
  }

  // The average has to follow the live list too, or the heading would keep
  // quoting a figure the reviews below it no longer add up to.
  const liveRating =
    live.length > 0 ? live.reduce((sum, r) => sum + r.rating, 0) / live.length : rating;

  const shown = showAll ? live : live.slice(0, PREVIEW);

  if (live.length === 0) {
    return (
      <div>
        <SectionHeading rating={liveRating} count={0} />
        <p className="mt-4 text-muted">No reviews yet — be the first after your swap.</p>
        <ReviewForm
          houseId={houseId}
          hostId={hostId}
          onSaved={handleSaved}
          onRemoved={handleRemoved}
        />
      </div>
    );
  }

  // How many reviews sit at each star level, 5 down to 1.
  const buckets = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: live.filter((r) => Math.round(r.rating) === star).length,
  }));

  return (
    <div>
      <SectionHeading rating={liveRating} count={live.length} />

      <div className="mt-5 grid gap-6 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-[auto_1fr] sm:gap-8">
        <div className="sm:border-r sm:border-border sm:pr-8">
          <p className="text-4xl font-bold leading-none">{liveRating.toFixed(1)}</p>
          <Stars value={liveRating} className="mt-2" />
          <p className="mt-1.5 text-sm text-muted">
            {live.length} review{live.length === 1 ? "" : "s"}
          </p>
        </div>

        <ul className="space-y-1.5">
          {buckets.map(({ star, count }) => (
            <li key={star} className="flex items-center gap-3 text-sm">
              <span className="w-3 text-right tabular-nums text-muted">{star}</span>
              <span aria-hidden className="text-accent">
                ★
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: `${(count / live.length) * 100}%` }}
                />
              </span>
              <span className="w-4 text-right tabular-nums text-muted">{count}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {shown.map((r) => (
          <ReviewCard key={r.id} review={r} />
        ))}
      </div>

      {live.length > PREVIEW && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className={buttonClass("secondary", "md", "mt-5")}
        >
          {showAll ? "Show fewer reviews" : `Show all ${live.length} reviews`}
        </button>
      )}

      <ReviewForm
        houseId={houseId}
        hostId={hostId}
        onSaved={handleSaved}
        onRemoved={handleRemoved}
      />
    </div>
  );
}

function SectionHeading({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h2 className="text-2xl font-semibold">Reviews</h2>
      {count > 0 && (
        <span className="text-muted">
          <span aria-hidden className="text-accent">
            ★
          </span>{" "}
          <span className="font-semibold text-fg">{rating.toFixed(1)}</span> · {count} review
          {count === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const name = review.author?.name ?? "SwapDoor guest";
  const when = new Date(review.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  });
  const meta = [review.author?.location, when].filter(Boolean).join(" · ");

  return (
    <article className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center gap-3">
        <Avatar name={name} src={review.author?.avatarUrl} size={40} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-fg">{name}</p>
          {meta && <p className="text-xs text-muted">{meta}</p>}
        </div>
      </div>
      <Stars value={review.rating} className="mt-3" />
      <p className="mt-2 text-sm leading-relaxed text-muted">{review.body}</p>
    </article>
  );
}
