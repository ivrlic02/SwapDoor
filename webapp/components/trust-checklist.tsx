"use client";

import { useProfile } from "@/components/profile-context";
import { trustChecklist, trustFromProfile } from "@/lib/trust";

// "Verified" — what it takes, and how far along this member is.
//
// The badge used to be a hash of a listing's id, so there was nothing to
// explain and no way to earn it. Now that it means something specific, a member
// who doesn't have it needs to be able to find out why — otherwise the page
// shows other people wearing a mark they can never account for, which is worse
// than the badge not existing (Nielsen #1).
//
// It states where they stand on every requirement, met or not. Showing only
// what's missing would hide the two they've already done, and "3 of 5" is only
// meaningful if all five are on screen.
export function TrustChecklist() {
  const { profile, ready } = useProfile();

  if (!ready) return <div className="skeleton mt-6 h-56 rounded-2xl" />;
  if (!profile) return null;

  const { items, metCount, verified } = trustChecklist(trustFromProfile(profile));

  return (
    <div id="verified" className="mt-14 scroll-mt-24 border-t border-border pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div>
          <h2 className="flex flex-wrap items-center gap-3 text-2xl font-bold">
            Verified host
            {/* The live badge comes from the database's own answer, not from
                metCount — so what a member reads here can never disagree with
                what a stranger sees on their listing. */}
            {profile.verified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                <span aria-hidden>✓</span> Verified
              </span>
            )}
          </h2>
          <p className="mt-1 max-w-2xl text-muted">
            {verified
              ? "Every home you host carries the ✓ Verified badge."
              : "Meet all five and every home you host carries the ✓ Verified badge."}
          </p>
        </div>

        <p className="text-muted">
          <span className="font-semibold text-fg">{metCount}</span> of {items.length}
        </p>
      </div>

      <ul className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/60">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-3.5 px-5 py-4">
            {/* Met vs. not is a filled tick against an empty ring — a shape,
                never colour on its own (Lecture 6). */}
            <span
              aria-hidden
              className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-xs leading-none ${
                item.done
                  ? "border-success bg-success/15 text-success"
                  : "border-muted/40 text-transparent"
              }`}
            >
              ✓
            </span>

            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${item.done ? "text-muted" : "text-fg"}`}>
                {item.label}
                <span className="sr-only">{item.done ? " — met" : " — not met yet"}</span>
              </p>
              {/* Where they actually stand. A requirement without the member's
                  own number against it is a rule, not an answer. */}
              <p className="mt-0.5 text-sm text-muted">{item.detail}</p>
            </div>

            {/* Only the two things they can act on right now get a link. There
                is no button for "get more reviews", and offering one would be
                a promise the page can't keep. */}
            {!item.done && item.target && (
              <a
                href={`#${item.target}`}
                className="shrink-0 text-sm font-medium text-accent transition hover:text-brand"
              >
                Fix
              </a>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-sm text-muted">
        Verified describes a host&apos;s record on SwapDoor — how long they&apos;ve
        been here and what guests said. It isn&apos;t a promise about a home, so
        read the reviews too.
      </p>
    </div>
  );
}
