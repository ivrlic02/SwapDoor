"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { EXPLORE_QUERY_KEY } from "@/lib/explore-query";

// "Back to explore" used to be a bare link to /explore, which threw away every
// filter the user had set: destination, dates, guests, price, amenities, the
// lot. Set up a search, open a home, come back — and start over. That is the
// Pottery Barn effect in miniature (Lecture 4, Nielsen #4): if stepping into a
// listing costs you your work, you stop stepping into listings.
//
// Explore stores its current query string as it syncs the URL; this reads it
// back and returns the user to the results exactly as they left them. Rendered
// as a real <Link> (not history.back()) so it still works on a shared link,
// after a refresh, or in a new tab.
// sessionStorage is an external store, so it's read through
// useSyncExternalStore rather than an effect + setState: the server renders the
// plain "/explore" link and the client swaps in the remembered query on hydration,
// with no cascading render.
const subscribe = () => () => {};
const getSnapshot = () => sessionStorage.getItem(EXPLORE_QUERY_KEY) ?? "";
const getServerSnapshot = () => "";

export function BackToResults() {
  const query = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hasFilters = query.length > 0;
  const href = hasFilters ? `/explore?${query}` : "/explore";

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-fg"
    >
      <span aria-hidden>←</span>
      {hasFilters ? "Back to your results" : "Back to explore"}
    </Link>
  );
}
