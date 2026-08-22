import type { Metadata } from "next";

// One page's share metadata, built in one place — the same discipline
// `buttonClass` applies to buttons and `globals.css` applies to colour.
//
// It exists because of a Next.js merge rule that is very easy to get wrong, and
// which this project had got wrong on every route: **the `openGraph` and
// `twitter` blocks are replaced wholesale, not merged field by field.** Three
// consequences, all of which were live and all of which are measured in the
// dated Handoff section for this change:
//
//   1. A route that sets a top-level `description` but no `openGraph` keeps the
//      ROOT's `og:description`. `/blog/[slug]` did exactly this, so every post
//      previewed with the homepage's blurb.
//   2. A route that sets `openGraph` but no `twitter` keeps the ROOT's twitter
//      card. `/explore/[id]` did exactly this, so the same listing showed the
//      villa on Facebook and the generic SwapDoor logo on X.
//   3. A route that sets `openGraph` loses the root's `og:type`, `og:site_name`
//      and `og:url` unless it restates them — `/explore/[id]` was shipping none
//      of the three.
//
// So the two blocks must always travel together, fully populated. Making that a
// function rather than a convention is what stops the next page from quietly
// sharing the homepage.
type ShareImage = {
  url: string;
  /** Describes the picture, for readers whose client shows alt text. */
  alt: string;
};

type ShareInput = {
  /** The browser tab title. Passed through exactly as given. */
  title: string;
  /**
   * Title for the share card. Defaults to `title`. Worth setting when the tab
   * title carries a " · SwapDoor" suffix: the card prints `og:site_name`
   * beside it already, so repeating the brand there spends the card's widest
   * line saying the name twice.
   */
  shareTitle?: string;
  description: string;
  /** Route path, e.g. `/explore/12`. Resolved against `metadataBase`. */
  path: string;
  /**
   * Picture for the card. Omit to fall back to the site card, which is the
   * right default for a page with no picture of its own.
   */
  image?: ShareImage;
  /** Blog-post facts. Sets `og:type=article` and its dated tags. */
  article?: { publishedTime: string; authors: string[] };
};

// The site card, stated explicitly rather than inherited.
//
// `app/opengraph-image.png` normally cascades to every nested route by file
// convention — but only for routes that declare no `openGraph` of their own.
// The moment a page declares one (which every page here now does, so its title
// and description are its own), the block is replaced and the inherited image
// goes with it: measured, `/blog` went from carrying the SwapDoor card to
// emitting no `og:image` at all, which several platforms render as a bare text
// link. So a page without its own picture names the site card by hand.
//
// The path is the unhashed one Next also serves the file at (verified: 200,
// image/png). No `?…` cache-buster, because that hash changes whenever the
// asset is rebuilt and nothing here could keep up with it.
const SITE_CARD: ShareImage = {
  url: "/opengraph-image.png",
  alt: "SwapDoor — swap homes, travel better",
};

export function pageMetadata({
  title,
  shareTitle,
  description,
  path,
  image,
  article,
}: ShareInput): Metadata {
  const cardTitle = shareTitle ?? title;
  // Deliberately no width/height: these are photographs of unknown aspect, and
  // a declared size that turns out to be wrong renders worse than none at all.
  const card = image ?? SITE_CARD;
  const images = [{ url: card.url, alt: card.alt }];

  return {
    title,
    description,
    // `og:url` is what several scrapers treat as the canonical for dedup. The
    // root sets it to "/", so before this every shared SwapDoor link claimed to
    // be the homepage.
    alternates: { canonical: path },
    openGraph: {
      title: cardTitle,
      description,
      siteName: "SwapDoor",
      url: path,
      ...(article
        ? { type: "article" as const, ...article }
        : { type: "website" as const }),
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: cardTitle,
      description,
      images,
    },
  };
}
