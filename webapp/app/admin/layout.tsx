import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { isAdmin } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Content – SwapDoor",
  // The admin is not content anybody should find in a search result, and a
  // crawler following a link from a signed-in session would otherwise index it.
  robots: { index: false, follow: false },
};

// Reading the session makes every /admin route per-request. That is correct
// here — an editor's view of a draft must never be a cached copy of someone
// else's — and it is the reason this sits in its own layout rather than being
// bolted onto the site layout.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Two gates, on purpose:
  //   1. proxy.ts redirects a signed-OUT visitor to /sign-in?next=/admin.
  //   2. this one refuses a signed-IN member who is not an admin.
  //
  // It answers 404 rather than 403, because "this exists and you may not have
  // it" is itself information about the site, and there is nothing an ordinary
  // member could do with it. RLS refuses their writes regardless — this only
  // stops them reaching a screen that would then fail on every button.
  if (!(await isAdmin())) notFound();

  return (
    <div className="min-h-screen bg-bg text-fg">
      <Navigation />

      <div className="border-b border-border bg-surface-2">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4">
          <Link href="/admin" className="text-sm font-semibold">
            Content
          </Link>
          <span aria-hidden className="text-border">
            /
          </span>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link href="/admin" className="text-muted transition hover:text-fg">
              Blog posts
            </Link>
            <Link href="/admin/how-it-works" className="text-muted transition hover:text-fg">
              How it Works
            </Link>
          </nav>
          <Link
            href="/blog"
            className="ml-auto text-sm text-accent transition hover:text-brand"
          >
            View the site →
          </Link>
        </div>
      </div>

      {children}
    </div>
  );
}
