"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { useProfile } from "@/components/profile-context";
import { useSaved } from "@/components/saved-context";
import { useSwaps } from "@/components/swaps-context";
import { accountSections, SignOutGlyph } from "@/components/user-menu";
import { buttonClass } from "@/components/button";
import { createClient } from "@/lib/supabase/client";

// The account block inside the mobile drawer. A dropdown inside a drawer would
// be a menu inside a menu, so the same rows from accountSections() render
// inline instead — identical destinations and order as the desktop menu, just
// laid out for a full-width panel. Rows are 48px tall for a comfortable thumb
// target (Fitts' law), matching the drawer's existing enlarged hit areas.
export function MobileAccount({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const { profile, listingCount } = useProfile();
  const { count: savedCount } = useSaved();
  const { count: swapCount } = useSwaps();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    onNavigate();
    router.refresh();
    router.push("/");
  }

  if (!profile) {
    return (
      <Link
        href="/sign-in"
        onClick={onNavigate}
        className={buttonClass("primary", "md", "w-full")}
      >
        Sign In
      </Link>
    );
  }

  return (
    <div className="mt-2 border-t border-border pt-5">
      <div className="mb-3 flex items-center gap-3">
        <Avatar name={profile.fullName} src={profile.avatarUrl} size={44} />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{profile.fullName}</span>
          <span className="block truncate text-xs text-muted">{profile.email}</span>
        </span>
      </div>

      <div className="flex flex-col">
        {accountSections(savedCount, listingCount, swapCount, profile.isAdmin)
          .flat()
          .map((item) =>
            item.soon ? (
              <span
                key={item.label}
                className="flex items-center gap-3 py-3 text-muted/60"
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Soon
                </span>
              </span>
            ) : (
              <Link
                key={item.label}
                href={item.href!}
                onClick={onNavigate}
                className="flex items-center gap-3 py-3 text-muted transition hover:text-fg"
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs font-semibold text-accent">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          )}

        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-3 border-t border-border py-3 mt-2 text-left text-muted transition hover:text-fg"
        >
          <SignOutGlyph />
          Sign out
        </button>
      </div>
    </div>
  );
}
