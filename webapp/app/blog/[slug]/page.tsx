import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Avatar } from "@/components/avatar";
import { PostBody } from "@/components/post-body";
import { ArrowRightIcon } from "@/components/icons";
import { getPosts, getPostBySlug, getRelatedPosts } from "@/lib/cms";
import { categoryLabel } from "@/lib/cms-types";
import { BLUR_DATA_URL } from "@/lib/images";
import { pageMetadata } from "@/lib/seo";

// Prerender the posts that exist at build time; anything published afterwards
// is rendered on first request and then cached (dynamicParams defaults to true).
// Without the revalidate below, a post edited in /admin would keep serving the
// build-time HTML forever.
export const revalidate = 60;

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post not found – SwapDoor" };

  return pageMetadata({
    title: `${post.title} – SwapDoor Blog`,
    shareTitle: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    image: { url: post.cover, alt: post.title },
    article: { publishedTime: post.date, authors: [post.author.name] },
  });
}

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const related = await getRelatedPosts(post);

  return (
    <main className="min-h-screen bg-bg text-fg">
      <Navigation />

      <article className="mx-auto max-w-3xl px-4 pt-8 pb-12 sm:px-6 lg:pt-12 lg:pb-16">
        <Link
          href={`/blog?category=${post.category}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-accent"
        >
          <span aria-hidden>←</span>
          {/* Returns to the category the reader most likely came from, not to
              the unfiltered list — the exit leads back to where they were
              (Nielsen #4, user control and freedom). */}
          All {categoryLabel(post.category)} posts
        </Link>

        <header className="mt-6 mb-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent">
            {categoryLabel(post.category)}
          </p>
          <h1 className="text-[1.75rem] font-bold leading-[1.15] sm:text-3xl md:text-5xl">{post.title}</h1>
          <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted sm:mt-5 sm:text-lg">{post.excerpt}</p>

          <div className="mt-7 flex items-center gap-3 border-t border-border pt-5">
            <Avatar name={post.author.name} src={post.author.avatarUrl} size={40} />
            <div className="text-sm">
              <p className="font-semibold">{post.author.name}</p>
              <p className="text-muted">
                {formatDate(post.date)}
                <span className="mx-1.5 text-muted/50">·</span>
                {post.readMinutes} min read
              </p>
            </div>
          </div>
        </header>

        {post.cover && (
          <div className="relative mb-12 aspect-[16/9] w-full overflow-hidden rounded-2xl">
            <Image
              src={post.cover}
              alt=""
              fill
              preload
              fetchPriority="high"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
        )}

        <PostBody blocks={post.content} />

        {/* The author, after the piece rather than before it — the reader now
            has a reason to care who wrote it. */}
        {post.author.bio && (
          <aside className="mx-auto mt-12 max-w-[66ch] rounded-2xl border border-border bg-surface p-5 sm:p-6 lg:mt-16">
            <div className="flex items-start gap-4">
              <Avatar name={post.author.name} src={post.author.avatarUrl} size={52} />
              <div>
                <p className="font-semibold">{post.author.name}</p>
                {post.author.location && (
                  <p className="text-sm text-muted">{post.author.location}</p>
                )}
                <p className="mt-2 text-sm leading-relaxed text-muted">{post.author.bio}</p>
              </div>
            </div>
          </aside>
        )}
      </article>

      {/* The old page ended on a single "Browse homes" button — a dead end for
          anyone who wanted to keep reading. Three posts first, then the CTA. */}
      {related.length > 0 && (
        <section className="border-t border-border bg-surface-2 px-4 py-12 sm:px-6 lg:py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-8 text-2xl font-bold">Keep reading</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-brand"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    <Image
                      src={r.cover}
                      alt=""
                      fill
                      loading="lazy"
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                      sizes="(max-width: 640px) 100vw, 360px"
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                      {categoryLabel(r.category)}
                    </span>
                    <h3 className="font-semibold leading-snug transition group-hover:text-accent">
                      {r.title}
                    </h3>
                    <p className="mt-auto pt-2 text-xs text-muted">{r.readMinutes} min read</p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-4 border-t border-border pt-8">
              <p className="text-muted">Ready to find somewhere to stay?</p>
              <Link
                href="/explore"
                className="inline-flex items-center gap-1.5 font-semibold text-accent transition hover:text-brand"
              >
                Browse homes to swap
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}
