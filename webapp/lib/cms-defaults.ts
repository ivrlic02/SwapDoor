// The CMS fallback — what /blog and /how-it-works render when Supabase is
// unconfigured, unreachable, or returns nothing.
//
// This mirrors the discipline `lib/houses.ts` already applies to listings (it
// falls back to the original gist): a content system that takes the site down
// when it is unavailable is worse than no content system. Every read in
// `lib/cms.ts` funnels through here on failure, so the pages are never blank
// and never throw.
//
// The content itself lives in `cms-seed.json` because that same file is what
// `scripts/build-cms-seed.mjs` turns into `supabase/seed-cms.sql`. One source,
// two consumers — so the fallback can never drift from what was seeded.

import seed from "./cms-seed.json";
import {
  estimateReadMinutes,
  type Block,
  type BlogPost,
  type CategorySlug,
  type HowItWorksContent,
  type PostStatus,
} from "./cms-types";

/** Unsplash serves whatever size the URL asks for. The seed stores bare photo
 *  URLs so the size decision lives in one place — here — rather than being
 *  baked into every row an editor might later copy. */
const UNSPLASH_QUERY = "auto=format&fit=crop&w=2000&q=80";

export function sizedImage(url: string): string {
  if (!url || !url.includes("images.unsplash.com")) return url;
  return `${url.split("?")[0]}?${UNSPLASH_QUERY}`;
}

/** Apply `sizedImage` to every image a block carries, so a hand-pasted bare
 *  Unsplash URL still arrives at next/image with a usable master size. */
export function sizeBlockImages(blocks: Block[]): Block[] {
  return blocks.map((b) => {
    if (b.type === "image") return { ...b, src: sizedImage(b.src) };
    if (b.type === "gallery") {
      return { ...b, images: b.images.map((i) => ({ ...i, src: sizedImage(i.src) })) };
    }
    return b;
  });
}

export const DEFAULT_POSTS: BlogPost[] = seed.posts.map((p, i) => {
  const content = sizeBlockImages(p.content as Block[]);
  return {
    // Negative ids: these rows do not exist in the database, and a negative id
    // can never collide with a real `blog_posts.id` if both ever appear in the
    // same list (they do not today, but the guarantee is free).
    id: -(i + 1),
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    cover: sizedImage(p.cover),
    category: p.category as CategorySlug,
    author: { name: p.author },
    date: p.date,
    status: p.status as PostStatus,
    readMinutes: estimateReadMinutes(content),
    content,
  };
});

export const DEFAULT_HOW_IT_WORKS = seed.howItWorks as HowItWorksContent;
