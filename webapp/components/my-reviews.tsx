"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { MascotGlyph } from "@/components/brand";
import { buttonClass } from "@/components/button";
import { useProfile } from "@/components/profile-context";
import { Stars } from "@/components/stars";
import type { FeaturedReview } from "@/lib/houses";

// "Reviews" — the My Reviews node from the card-sorting sitemap
// (Overview.md §4), which had never been built.
//
// Two directions of the same relationship, so they live in one section behind a
// toggle rather than as two stacked blocks: what guests said about the homes
// this member hosts, and what they said about other people's. Stacking both
// would have made an already long page longer for something most members will
// only glance at, and the counts are on the tabs so neither side is hidden
// (Hick's law, without burying anything).
//
// "Written by you" was deliberately left out on 2026-08-22, because writing a
// review was impossible and the list could only ever have been empty. It is
// real now that supabase/reviews.sql and the review form exist.

const PREVIEW = 4;

type Tab = "about" | "written";

export function MyReviews({
  aboutMyHomes,
  writtenByMe,
}: {
  aboutMyHomes: FeaturedReview[];
  writtenByMe: FeaturedReview[];
}) {
  const { listingCount } = useProfile();
  // Open on whichever side actually has something in it, so a member who hosts
  // nothing doesn't land on an empty tab and conclude the section is broken.
  const [tab, setTab] = useState<Tab>(
    aboutMyHomes.length === 0 && writtenByMe.length > 0 ? "written" : "about"
  );
  const [showAll, setShowAll] = useState(false);

  const list = tab === "about" ? aboutMyHomes : writtenByMe;
  const shown = showAll ? list : list.slice(0, PREVIEW);

  const average =
    aboutMyHomes.length > 0
      ? aboutMyHomes.reduce((sum, r) => sum + r.rating, 0) / aboutMyHomes.length
      : 0;

  function switchTo(next: Tab) {
    setTab(next);
    setShowAll(false);
  }

  return (
    <div id="reviews" className="mt-14 scroll-mt-24 border-t border-border pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div>
          <h2 className="text-2xl font-bold">Reviews</h2>
          <p className="mt-1 text-muted">
            {tab === "about"
              ? "What guests said about the homes you host."
              : "Reviews you've written about other people's homes."}
          </p>
        </div>

        {tab === "about" && aboutMyHomes.length > 0 && (
          <p className="text-muted">
            <span aria-hidden className="text-accent">
              ★
            </span>{" "}
            <span className="font-semibold text-fg">{average.toFixed(1)}</span> ·{" "}
            {aboutMyHomes.length} review{aboutMyHomes.length === 1 ? "" : "s"}
          </p>
        )}
      </div>

      {/* Counts on the tabs, so switching is a known quantity rather than a
          guess about what's on the other side (Nielsen #1). */}
      <div role="tablist" aria-label="Reviews" className="mt-5 flex flex-wrap gap-2">
        <TabButton
          active={tab === "about"}
          count={aboutMyHomes.length}
          onClick={() => switchTo("about")}
        >
          About your homes
        </TabButton>
        <TabButton
          active={tab === "written"}
          count={writtenByMe.length}
          onClick={() => switchTo("written")}
        >
          Written by you
        </TabButton>
      </div>

      {list.length === 0 ? (
        <EmptyState tab={tab} hosting={listingCount > 0} />
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {shown.map((r) => (
              <ReviewCard key={r.id} review={r} tab={tab} />
            ))}
          </div>

          {list.length > PREVIEW && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className={buttonClass("secondary", "md", "mt-5")}
            >
              {showAll ? "Show fewer" : `Show all ${list.length}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function TabButton({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
        active
          ? "border-brand bg-brand/10 font-semibold text-brand"
          : "border-border bg-surface font-medium text-fg hover:border-muted/60",
      ].join(" ")}
    >
      {children}
      <span
        className={`rounded-full px-1.5 text-xs tabular-nums ${
          active ? "bg-brand/15" : "bg-bg text-muted"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

/**
 * Four different nothings across two tabs, and they need different exits: a
 * member with no listing can act right now, one who is already hosting simply
 * has to wait, and someone who has written nothing should be pointed at homes
 * rather than at their own listings.
 *
 * Same shape as every other empty state on the site (Explore's no-results,
 * /dashboard, /my-listings, the /swaps tabs): the mascot at 30%, a title, a
 * line, one way onward.
 */
function EmptyState({ tab, hosting }: { tab: Tab; hosting: boolean }) {
  const copy =
    tab === "written"
      ? {
          title: "You haven't written a review yet",
          body: "Open a home you've stayed in and tell the next guest what it was like. It takes a minute.",
          href: "/explore",
          action: "Browse homes",
        }
      : hosting
        ? {
            title: "No reviews yet",
            body: "They arrive once someone has stayed in a home you host — a guest can write one after the swap is over.",
            href: "/my-listings",
            action: "See my listings",
          }
        : {
            title: "Nothing to review yet",
            body: "You're not hosting a home yet. Once you list one and a guest has stayed, their reviews land here.",
            href: "/list-your-home",
            action: "List your home",
          };

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface/60 px-6 py-16 text-center">
      <MascotGlyph className="mx-auto mb-6 h-20 w-auto opacity-30" />
      <p className="text-lg font-semibold">{copy.title}</p>
      <p className="mx-auto mt-2 max-w-md text-muted">{copy.body}</p>
      <Link href={copy.href} className={`mt-5 inline-block ${buttonClass("primary")}`}>
        {copy.action}
      </Link>
    </div>
  );
}

function ReviewCard({ review, tab }: { review: FeaturedReview; tab: Tab }) {
  const when = new Date(review.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  });

  // Whose face belongs on the card depends on which way you're reading it: on
  // "about your homes" it's the guest who wrote it; on "written by you" the
  // author is the member themself, so the home takes the top line instead.
  const name = review.author?.name ?? "SwapDoor guest";

  return (
    <article className="rounded-2xl border border-border bg-surface p-5">
      {tab === "about" ? (
        <div className="flex items-center gap-3">
          <Avatar name={name} src={review.author?.avatarUrl} size={40} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-fg">{name}</p>
            <p className="text-xs text-muted">{when}</p>
          </div>
        </div>
      ) : (
        <div className="min-w-0">
          <Link
            href={`/explore/${review.house.id}`}
            className="truncate font-semibold text-fg transition hover:text-accent"
          >
            {review.house.name}
          </Link>
          <p className="text-xs text-muted">
            {review.house.location}, {review.house.country} · {when}
          </p>
        </div>
      )}

      <Stars value={review.rating} className="mt-3" />
      <p className="mt-2 text-sm leading-relaxed text-muted">{review.body}</p>

      <p className="mt-3 border-t border-border pt-3 text-xs text-muted">
        {tab === "about" ? (
          <>
            on{" "}
            <Link
              href={`/explore/${review.house.id}`}
              className="font-medium text-accent transition hover:text-brand"
            >
              {review.house.name}
            </Link>{" "}
            · {review.house.location}, {review.house.country}
          </>
        ) : (
          /* Editing lives on the listing, next to the review as everyone else
             reads it, rather than in a second form here that would have to
             stay in step with the first. */
          <Link
            href={`/explore/${review.house.id}#reviews`}
            className="font-medium text-accent transition hover:text-brand"
          >
            Edit this review
          </Link>
        )}
      </p>
    </article>
  );
}
