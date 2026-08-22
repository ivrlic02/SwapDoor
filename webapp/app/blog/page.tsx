import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Avatar } from "@/components/avatar";
import { ArrowRightIcon } from "@/components/icons";
import { getPosts, categoryCounts } from "@/lib/cms";
import { CATEGORIES, categoryLabel, type BlogPost } from "@/lib/cms-types";
import { BLUR_DATA_URL } from "@/lib/images";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Blog – SwapDoor",
  shareTitle: "The SwapDoor Blog",
  description:
    "Stories, tips and guides on home swapping, hosting, and traveling like a local.",
  path: "/blog",
});

// This page reads `searchParams` (the category filter), so it is server-rendered
// per request — the same shape `/explore` has, and for the same reason. Keeping
// the filter in the URL rather than in client state is what buys that: a
// filtered view is a link you can send, the back button steps through filters,
// and the list is real HTML that works with no JavaScript at all.
//
// The cost is one query per request instead of a cached page. At five posts
// that is the right trade, and it means a post published in /admin is on /blog
// the moment it is saved. `/blog/[slug]` is the one that is prerendered.

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** The byline, drawn identically on the featured card and in the grid so a
 *  post's author is always in the same place (CRAP: repetition). */
function Byline({ post, className = "" }: { post: BlogPost; className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Avatar name={post.author.name} src={post.author.avatarUrl} size={28} />
      <span className="text-sm text-muted">
        {post.author.name}
        <span className="mx-1.5 text-muted/50">·</span>
        {formatDate(post.date)}
        <span className="mx-1.5 text-muted/50">·</span>
        {post.readMinutes} min read
      </span>
    </div>
  );
}

/** Category chip. Shown on cards and used, in a bigger form, as the filter. */
function CategoryTag({ slug }: { slug: string }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-wider text-accent">
      {categoryLabel(slug)}
    </span>
  );
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const all = await getPosts();
  const counts = categoryCounts(all);

  // Filtering lives in the URL, not in client state — the same decision Explore
  // made. A filtered view is then a link someone can send, the back button
  // steps through filters, and the page needs no JavaScript to work at all.
  const active = CATEGORIES.some((c) => c.slug === category) ? category : undefined;
  const posts = active ? all.filter((p) => p.category === active) : all;

  // The big card is the newest post, and only on the unfiltered view: inside a
  // category the posts are peers, and promoting one of three would be a
  // hierarchy the content does not have.
  const featured = !active && posts.length > 0 ? posts[0] : null;
  const rest = featured ? posts.slice(1) : posts;

  return (
    <main className="min-h-screen bg-bg text-fg">
      <Navigation />

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-24">
        <header className="max-w-2xl">
          <p className="mb-2 font-semibold text-accent">The SwapDoor Blog</p>
          <h1 className="text-4xl font-bold md:text-5xl">
            Notes on swapping homes
          </h1>
          <p className="mt-4 text-lg text-muted">
            What we have learned from members about hosting well, travelling
            slowly, and trusting a stranger with your keys.
          </p>
        </header>

        {/* Filter row. Categories with no published posts are dropped rather
            than rendered as dead ends — a filter that always returns nothing is
            a promise the page cannot keep (Nielsen #1, match the real world). */}
        <nav aria-label="Filter posts by category" className="mt-10 flex flex-wrap gap-2">
          <FilterPill href="/blog" label="All" count={all.length} active={!active} />
          {CATEGORIES.filter((c) => counts[c.slug]).map((c) => (
            <FilterPill
              key={c.slug}
              href={`/blog?category=${c.slug}`}
              label={c.label}
              count={counts[c.slug]}
              active={active === c.slug}
            />
          ))}
        </nav>

        {posts.length === 0 ? (
          <p className="mt-16 text-muted">
            Nothing published here yet.{" "}
            <Link href="/blog" className="text-accent hover:text-brand">
              See all posts
            </Link>
          </p>
        ) : (
          <>
            {featured && (
              <Link
                href={`/blog/${featured.slug}`}
                className="group mt-10 block overflow-hidden rounded-3xl border border-border bg-surface transition hover:border-brand"
              >
                <div className="grid md:grid-cols-[1.15fr_1fr]">
                  <div className="relative h-64 min-h-[18rem] md:h-full">
                    <Image
                      src={featured.cover}
                      alt=""
                      fill
                      priority
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                      sizes="(max-width: 768px) 100vw, 55vw"
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                    {/* Scrim only at the bottom on mobile, where the text sits
                        under the photo rather than beside it. */}
                    <span className="absolute inset-0 bg-gradient-to-t from-surface/80 to-transparent md:hidden" />
                  </div>

                  <div className="flex flex-col justify-center gap-4 p-7 md:p-10">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-brand/15 px-2.5 py-1 text-xs font-semibold text-accent">
                        Latest
                      </span>
                      <CategoryTag slug={featured.category} />
                    </div>
                    <h2 className="text-2xl font-bold leading-tight transition group-hover:text-accent md:text-3xl">
                      {featured.title}
                    </h2>
                    <p className="text-muted">{featured.excerpt}</p>
                    <Byline post={featured} className="mt-1" />
                    <span className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-accent">
                      Read the post
                      <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {rest.length > 0 && (
              <div className="mt-10 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post, i) => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-brand"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden">
                      <Image
                        src={post.cover}
                        alt=""
                        fill
                        priority={!featured && i === 0}
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                        className="object-cover transition duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-5">
                      <CategoryTag slug={post.category} />
                      <h2 className="text-lg font-semibold leading-snug transition group-hover:text-accent">
                        {post.title}
                      </h2>
                      <p className="line-clamp-3 flex-1 text-sm text-muted">{post.excerpt}</p>
                      <Byline post={post} className="mt-1" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <Footer />
    </main>
  );
}

function FilterPill({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      // The active pill is filled AND carries the count — it never relies on
      // colour alone to say which filter is on (Lecture 6).
      aria-current={active ? "page" : undefined}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-brand bg-brand text-white"
          : "border-border text-muted hover:border-brand hover:text-fg"
      }`}
    >
      {label}
      <span className={`ml-2 text-xs ${active ? "text-white/70" : "text-muted/60"}`}>{count}</span>
    </Link>
  );
}
