"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, initials } from "@/components/avatar";
import { useProfile } from "@/components/profile-context";
import { useSaved } from "@/components/saved-context";
import { useSwaps } from "@/components/swaps-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/client";

// The signed-in account control in the navbar. Replaces the old
// "Saved · full-email-address · [Sign Out]" row, which spent the widest slot in
// the header on a string the user already knows (Nielsen #8, aesthetic and
// minimalist) and scattered three separate account controls across it.
//
// One trigger, one menu:
//  - external consistency (#2) — an avatar in the top-right corner opening an
//    account menu is the pattern Airbnb, Google and GitHub all use;
//  - Hick's law — one target instead of three competing ones;
//  - Fitts' law — a 36px circle near the corner is a far bigger, easier target
//    than a text link, and the menu items are full-width rows;
//  - CRAP proximity — account actions are finally grouped as one unit, in the
//    three sections the card-sorting sitemap called for (Overview.md §4:
//    Dashboard / My Profile / Account Settings / Log Out).
//
// The email did not disappear — it moved into the menu header, where it
// identifies the account at the moment you are about to act on it.

export function UserMenu() {
  const router = useRouter();
  const { profile, listingCount } = useProfile();
  const { count: savedCount } = useSaved();
  // Requests waiting on you + unread messages. Derived, not stored — see
  // swaps-context.tsx.
  const { count: swapCount } = useSwaps();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Click-away + Escape. Escape returns focus to the trigger so keyboard users
  // are never dropped at the top of the document (Nielsen #3, user control).
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  // Roving arrow-key navigation over the menu's focusable rows.
  const moveFocus = useCallback((dir: 1 | -1) => {
    const items = menuRef.current?.querySelectorAll<HTMLElement>("[data-menu-item]");
    if (!items || items.length === 0) return;
    const list = Array.from(items);
    const at = list.indexOf(document.activeElement as HTMLElement);
    const next = at === -1 ? (dir === 1 ? 0 : list.length - 1) : (at + dir + list.length) % list.length;
    list[next].focus();
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.refresh();
    router.push("/");
  }

  if (!profile) return null;

  const name = profile.fullName;
  // With a photo, the initials sit beside it as the user asked. Without one the
  // circle IS the initials, so repeating them would read "MV MV" — the first
  // name goes there instead, and the trigger still says who is signed in.
  const label = profile.avatarUrl ? initials(name) : name.split(/\s+/)[0];

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            requestAnimationFrame(() => moveFocus(1));
          }
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={
          swapCount > 0
            ? `Account menu for ${name} — ${swapCount} swap update${swapCount === 1 ? "" : "s"}`
            : `Account menu for ${name}`
        }
        className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-2.5 transition ${
          open
            ? "border-brand bg-surface"
            : "border-border hover:border-muted/50 hover:bg-surface"
        }`}
      >
        {/* A dot on the avatar is the only thing in the header that says
            something is waiting for you. It is a *signal*, not a count: the
            number lives one click away on the row it belongs to, so the nav
            does not grow a second badge system. The accessible name carries the
            same news, since a coloured dot alone says nothing to a screen
            reader — or to anyone who cannot distinguish it (Lecture 6). */}
        <span className="relative">
          <Avatar name={name} src={profile.avatarUrl} size={32} />
          {swapCount > 0 && (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-bg bg-brand"
            />
          )}
        </span>
        <span className="max-w-[7rem] truncate text-sm font-medium text-fg">{label}</span>
        <Chevron open={open} />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              moveFocus(1);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              moveFocus(-1);
            }
          }}
          className="absolute right-0 top-[calc(100%+0.6rem)] w-72 origin-top-right overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-shade/40 motion-safe:animate-[menu-in_140ms_cubic-bezier(0.16,1,0.3,1)]"
        >
          {/* Identity header — the email lives here now, next to the name it
              belongs to, instead of taking up the navbar. */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
            <Avatar name={name} src={profile.avatarUrl} size={40} />
            <span className="min-w-0">
              <span className="block truncate font-semibold text-fg">{name}</span>
              <span className="block truncate text-xs text-muted">{profile.email}</span>
            </span>
          </div>

          {accountSections(savedCount, listingCount, swapCount, profile.isAdmin).map((section, i) => (
            <Section key={i}>
              {section.map((item) =>
                item.soon ? (
                  <SoonItem key={item.label} icon={item.icon} label={item.label} />
                ) : (
                  <Item
                    key={item.label}
                    href={item.href!}
                    icon={item.icon}
                    label={item.label}
                    badge={item.badge}
                    onNavigate={() => setOpen(false)}
                  />
                )
              )}
            </Section>
          ))}

          {/* Appearance. It sits in its own section between "my stuff" and the
              exit, for the same reason the admin row does: everything above is
              a place to go, and this is a setting. It is deliberately NOT a
              `data-menu-item` — the arrow keys rove between the menu's
              destinations, and a two-button control inside that roving order
              would make ArrowDown mean two different things depending on where
              you already were. Tab still reaches it, in reading order. */}
          <Section>
            <ThemeToggle label="Appearance" className="px-2.5 py-1.5" />
          </Section>

          <div className="p-1.5">
            <button
              type="button"
              data-menu-item
              role="menuitem"
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm text-muted transition hover:bg-bg hover:text-fg focus:bg-bg focus:text-fg focus:outline-none"
            >
              <span className="text-muted">
                <SignOutGlyph />
              </span>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export type AccountItem = {
  /** Absent only for `soon` rows, which are never links. */
  href?: string;
  label: string;
  icon: ReactNode;
  badge?: string;
  /** Not built yet — render as plain text with a "Soon" chip, never a link. */
  soon?: boolean;
};

// The account menu's contents, grouped into the sections the card-sorting
// sitemap defined (Overview.md §4). Shared by the desktop dropdown and the
// mobile drawer so the two can never drift apart (Nielsen #2, internal
// consistency) — only their presentation differs.
export function accountSections(
  savedCount: number,
  listingCount: number,
  swapCount: number,
  isAdmin = false
): AccountItem[][] {
  // The CMS row, when there is one. It sits in its own section at the end,
  // because it is not a member action at all — everything above it is "my
  // stuff", and mixing a site-wide editing tool into that group would blur a
  // boundary the rest of the menu is careful about (CRAP proximity).
  const adminSection: AccountItem[][] = isAdmin
    ? [[{ href: "/admin", label: "Edit content", icon: <PencilGlyph /> }]]
    : [];

  return [
    [
      {
        href: "/dashboard",
        label: "Saved homes",
        icon: <HeartGlyph />,
        badge: savedCount > 0 ? String(savedCount) : undefined,
      },
      {
        href: "/my-listings",
        label: "My listings",
        icon: <HomeGlyph />,
        badge: listingCount > 0 ? String(listingCount) : undefined,
      },
      // This row carried a "Soon" chip from the day the menu was built, because
      // proposing a swap wrote nothing anywhere. It is a real destination now.
      {
        href: "/swaps",
        label: "My swaps",
        icon: <SwapGlyph />,
        badge: swapCount > 0 ? String(swapCount) : undefined,
      },
    ],
    [
      { href: "/profile", label: "Profile", icon: <UserGlyph /> },
      { href: "/profile#account", label: "Account settings", icon: <GearGlyph /> },
    ],
    ...adminSection,
  ];
}

/** Pencil, drawn to match the other menu glyphs (same 18px box, same stroke)
 *  rather than pulled from components/icons.tsx — the menu's icon set is its
 *  own, and mixing the two weights would show. */
function PencilGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4.5 19.5h4L19 9a2.1 2.1 0 0 0-3-3L5.5 16.5z" />
      <path d="m14.5 7.5 2 2" />
    </svg>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <div className="border-b border-border p-1.5">{children}</div>;
}

function Item({
  href,
  icon,
  label,
  badge,
  onNavigate,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  badge?: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      data-menu-item
      role="menuitem"
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm text-muted transition hover:bg-bg hover:text-fg focus:bg-bg focus:text-fg focus:outline-none"
    >
      <span className="text-muted">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs font-semibold text-accent">
          {badge}
        </span>
      )}
    </Link>
  );
}

// A feature that genuinely doesn't exist yet. Rendered as plain text with a
// "Soon" chip — never as a link, so it can't become a dead end.
function SoonItem({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm text-muted/60">
      <span>{icon}</span>
      <span className="flex-1">{label}</span>
      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
        Soon
      </span>
    </span>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={`shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Line-art icon set matching the glyphs already used in the nav pill and the
// amenity list (24 viewBox, 1.8 stroke) — CRAP repetition.
function HeartGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20s-7-4.6-7-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7 2.6c0 4.8-7 9.4-7 9.4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HomeGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9.5 21v-6h5v6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function SwapGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 8h13m0 0-3.5-3.5M17 8l-3.5 3.5M20 16H7m0 0 3.5-3.5M7 16l3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function GearGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 3.5v2m0 13v2M20.4 12h-2m-13 0h-2m12.5-5.9-1.4 1.4M8.5 15.5l-1.4 1.4m10 0-1.4-1.4M8.5 8.5 7.1 7.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SignOutGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 12H21m0 0-3-3m3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
