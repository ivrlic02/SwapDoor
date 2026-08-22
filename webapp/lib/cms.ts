import { cache } from "react";
import { isSupabaseConfigured } from "./supabase/config";
import { createClient, createPublicClient } from "./supabase/server";
import { sizeBlockImages, sizedImage, DEFAULT_POSTS, DEFAULT_HOW_IT_WORKS } from "./cms-defaults";
import {
  estimateReadMinutes,
  SITE_KEYS,
  type Block,
  type BlogPost,
  type CategorySlug,
  type FaqItem,
  type HowItWorksContent,
  type HowItWorksIntro,
  type HowItWorksStep,
  type PostStatus,
  type TrustCard,
} from "./cms-types";

// The CMS data layer — the single place the app talks to `blog_posts` and
// `site_content`, exactly as `lib/houses.ts` is the single place it talks to
// `houses`. Pages never build a Supabase query themselves.
//
// Every public read degrades instead of failing: if Supabase is unconfigured,
// unreachable, or returns an empty set, the caller gets the seed content from
// `lib/cms-defaults.ts`. A CMS outage must not be able to blank a page.

export type { BlogPost } from "./cms-types";

// Columns for a post, including the author joined from `profiles`. One
// constant so the list query and the single-post query can never drift.
const POST_SELECT =
  "id, slug, title, excerpt, cover, category, author_name, status, published_at, read_minutes, content, " +
  "author:profiles!blog_posts_author_id_fkey(full_name, avatar_url, bio, location)";

type AuthorRow = {
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
} | null;

type PostRow = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  cover: string | null;
  category: string;
  author_name: string | null;
  status: string;
  published_at: string | null;
  read_minutes: number | null;
  content: unknown;
  // PostgREST types an embedded to-one relation as an array in some versions;
  // normalise both shapes rather than trusting one.
  author: AuthorRow | AuthorRow[];
};

function firstAuthor(author: PostRow["author"]): AuthorRow {
  return Array.isArray(author) ? (author[0] ?? null) : author;
}

function toPost(row: PostRow): BlogPost {
  const blocks = sizeBlockImages(Array.isArray(row.content) ? (row.content as Block[]) : []);
  const profile = firstAuthor(row.author);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? "",
    cover: sizedImage(row.cover ?? ""),
    category: row.category as CategorySlug,
    author: {
      // `author_name` wins when set, so a post can be bylined "The SwapDoor
      // Team" without inventing a member account for it; the joined profile is
      // used when the post belongs to a real host.
      name: row.author_name ?? profile?.full_name ?? "SwapDoor",
      avatarUrl: profile?.avatar_url ?? undefined,
      bio: profile?.bio ?? undefined,
      location: profile?.location ?? undefined,
    },
    date: (row.published_at ?? "").slice(0, 10),
    status: row.status as PostStatus,
    // Trust the stored value, but never print "0 min read" if a row was
    // written without one (e.g. straight from the Table Editor).
    readMinutes: row.read_minutes || estimateReadMinutes(blocks),
    content: blocks,
  };
}

function byDateDesc(a: BlogPost, b: BlogPost): number {
  return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
}

// ---------------------------------------------------------------------------
// Public reads
// ---------------------------------------------------------------------------

/** Every published post, newest first. Falls back to the seed content. */
export const getPosts = cache(async (): Promise<BlogPost[]> => {
  if (!isSupabaseConfigured) return [...DEFAULT_POSTS].sort(byDateDesc);

  try {
    // Cookieless: this also runs inside generateStaticParams at build time,
    // where cookies() throws. RLS already limits anon to published rows.
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select(POST_SELECT)
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return [...DEFAULT_POSTS].sort(byDateDesc);
    }
    return (data as unknown as PostRow[]).map(toPost);
  } catch {
    return [...DEFAULT_POSTS].sort(byDateDesc);
  }
});

/** One published post by slug, or null if there is no such post. */
export const getPostBySlug = cache(async (slug: string): Promise<BlogPost | null> => {
  if (!isSupabaseConfigured) {
    return DEFAULT_POSTS.find((p) => p.slug === slug) ?? null;
  }

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select(POST_SELECT)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error) return DEFAULT_POSTS.find((p) => p.slug === slug) ?? null;
    if (!data) {
      // No row is a real answer (the post was unpublished or never existed) —
      // but only once we know the table has content at all. On an empty table
      // the seed is still what the site is showing, so honour it.
      const posts = await getPosts();
      const seeded = posts.length > 0 && posts[0].id < 0;
      return seeded ? (DEFAULT_POSTS.find((p) => p.slug === slug) ?? null) : null;
    }
    return toPost(data as unknown as PostRow);
  } catch {
    return DEFAULT_POSTS.find((p) => p.slug === slug) ?? null;
  }
});

/** Posts to offer at the end of a post: same category first, then the newest
 *  of anything else, so the rail is never short on a thin category. */
export async function getRelatedPosts(post: BlogPost, limit = 3): Promise<BlogPost[]> {
  const all = (await getPosts()).filter((p) => p.slug !== post.slug);
  const sameCategory = all.filter((p) => p.category === post.category);
  const rest = all.filter((p) => p.category !== post.category);
  return [...sameCategory, ...rest].slice(0, limit);
}

/** How many published posts sit in each category, for the /blog filter row.
 *  A filter that leads to an empty page is a dead end (Nielsen #1), so the
 *  counts are rendered beside the labels and empty categories are dropped. */
export function categoryCounts(posts: BlogPost[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of posts) counts[p.category] = (counts[p.category] ?? 0) + 1;
  return counts;
}

// ---------------------------------------------------------------------------
// Site content (How it Works)
// ---------------------------------------------------------------------------

/** The four editable sections of /how-it-works, merged over the seed.
 *
 *  Merged per *section*, not all-or-nothing: an admin who has only ever edited
 *  the FAQ still gets the seeded steps, and a single malformed row cannot take
 *  the page down with it. */
export const getHowItWorks = cache(async (): Promise<HowItWorksContent> => {
  if (!isSupabaseConfigured) return DEFAULT_HOW_IT_WORKS;

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("site_content")
      .select("key, value")
      .in("key", Object.values(SITE_KEYS));

    if (error || !data) return DEFAULT_HOW_IT_WORKS;

    const byKey = new Map(data.map((r) => [r.key as string, r.value]));
    const pick = <T,>(key: string, fallback: T, wantArray: boolean): T => {
      const value = byKey.get(key);
      if (value == null) return fallback;
      if (wantArray && (!Array.isArray(value) || value.length === 0)) return fallback;
      if (!wantArray && typeof value !== "object") return fallback;
      return value as T;
    };

    return {
      intro: pick<HowItWorksIntro>(SITE_KEYS.hiwIntro, DEFAULT_HOW_IT_WORKS.intro, false),
      steps: pick<HowItWorksStep[]>(SITE_KEYS.hiwSteps, DEFAULT_HOW_IT_WORKS.steps, true),
      trust: pick<TrustCard[]>(SITE_KEYS.hiwTrust, DEFAULT_HOW_IT_WORKS.trust, true),
      faq: pick<FaqItem[]>(SITE_KEYS.hiwFaq, DEFAULT_HOW_IT_WORKS.faq, true),
    };
  } catch {
    return DEFAULT_HOW_IT_WORKS;
  }
});

// ---------------------------------------------------------------------------
// Admin reads (session-bound — these DO need cookies)
// ---------------------------------------------------------------------------

/** Whether the signed-in user may write CMS content. Asks the database rather
 *  than reading a claim off the session, so the answer is the same one RLS will
 *  give when the write actually happens. */
export const isAdmin = cache(async (): Promise<boolean> => {
  if (!isSupabaseConfigured) return false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("is_admin");
    return !error && data === true;
  } catch {
    return false;
  }
});

/** Every post including drafts. Returns [] for non-admins — RLS enforces it
 *  too, this just avoids a pointless round trip. */
export async function getAllPostsForAdmin(): Promise<BlogPost[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select(POST_SELECT)
      .order("published_at", { ascending: false, nullsFirst: true })
      .order("id", { ascending: false });

    if (error || !data) return [];
    return (data as unknown as PostRow[]).map(toPost);
  } catch {
    return [];
  }
}

/** One post by id for the editor, draft or not. */
export async function getPostForAdmin(id: number): Promise<BlogPost | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select(POST_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    return toPost(data as unknown as PostRow);
  } catch {
    return null;
  }
}

/** Raw section values for the How-it-Works editor, defaulted from the seed so
 *  the form is populated on a database that has never been written to. */
export async function getHowItWorksForAdmin(): Promise<HowItWorksContent> {
  return getHowItWorks();
}

/** Whether the blog is currently being served from the database or from the
 *  seed fallback. The admin dashboard says which, because "I edited a post and
 *  nothing changed" is otherwise a mystery worth hours. */
export async function isBlogSeeded(): Promise<boolean> {
  const posts = await getPosts();
  return posts.length > 0 && posts[0].id > 0;
}
