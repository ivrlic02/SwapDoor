import Link from "next/link";
import { buttonClass } from "@/components/button";
import { getAllPostsForAdmin, isBlogSeeded } from "@/lib/cms";
import { categoryLabel } from "@/lib/cms-types";

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AdminPage() {
  const [posts, seeded] = await Promise.all([getAllPostsForAdmin(), isBlogSeeded()]);

  const published = posts.filter((p) => p.status === "published").length;
  const drafts = posts.length - published;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Blog posts</h1>
          <p className="mt-1 text-sm text-muted">
            {published} published · {drafts} {drafts === 1 ? "draft" : "drafts"}
          </p>
        </div>
        <Link href="/admin/posts/new" className={buttonClass("primary")}>
          New post
        </Link>
      </div>

      {/* The single most confusing state this system can be in is "I edited a
          post and the site did not change", and it has exactly one cause: the
          database has no posts yet, so /blog is still rendering the seed content
          from lib/cms-seed.json. Saying so here costs one query and saves the
          hour that would otherwise go into looking for the bug. */}
      {!seeded && (
        <div className="mb-8 rounded-xl border border-selected/40 bg-selected/10 p-5">
          <p className="font-semibold">The blog is running on seed content</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">blog_posts</code>{" "}
            has no rows, so <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">/blog</code>{" "}
            is falling back to the five posts committed in{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">
              lib/cms-seed.json
            </code>
            . Run <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">supabase/seed-cms.sql</code>{" "}
            to load them into the database — after that, this screen is what the
            site shows.
          </p>
        </div>
      )}

      {posts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-muted">
          No posts in the database yet.{" "}
          <Link href="/admin/posts/new" className="text-accent hover:text-brand">
            Write the first one
          </Link>
          .
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Title
                </th>
                <th scope="col" className="hidden px-5 py-3 font-semibold sm:table-cell">
                  Category
                </th>
                <th scope="col" className="hidden px-5 py-3 font-semibold md:table-cell">
                  Date
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/admin/posts/${post.id}`}
                      className="font-medium transition hover:text-accent"
                    >
                      {post.title}
                    </Link>
                    <p className="mt-0.5 font-mono text-xs text-muted">/blog/{post.slug}</p>
                  </td>
                  <td className="hidden px-5 py-3.5 text-muted sm:table-cell">
                    {categoryLabel(post.category)}
                  </td>
                  <td className="hidden px-5 py-3.5 text-muted md:table-cell">
                    {formatDate(post.date)}
                  </td>
                  <td className="px-5 py-3.5">
                    {/* Status reads as a word first and a colour second, so it
                        survives a greyscale check (Lecture 6). */}
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        post.status === "published"
                          ? "bg-success/15 text-success"
                          : "bg-selected/15 text-selected"
                      }`}
                    >
                      {post.status === "published" ? "Published" : "Draft"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-10 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Other editable content</h2>
        <p className="mt-1.5 text-sm text-muted">
          The How it Works page — its intro, the four steps, the trust cards and every FAQ answer —
          is content too, stored in{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">site_content</code>.
        </p>
        <Link
          href="/admin/how-it-works"
          className="mt-3 inline-block text-sm font-semibold text-accent transition hover:text-brand"
        >
          Edit How it Works →
        </Link>
      </div>
    </div>
  );
}
