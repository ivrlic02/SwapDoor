"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buttonClass } from "@/components/button";
import { useProfile } from "@/components/profile-context";
import { createClient } from "@/lib/supabase/client";
import type { Review } from "@/lib/house-types";

// Writing a review.
//
// `reviews` has had an INSERT policy since day one and no way to use it, so
// every review on the site came from a seed script. This is the form that
// changes that — and the reason supabase/reviews.sql had to land first: the old
// policy let anyone review any home, including their own, any number of times,
// which would have made the Verified badge farmable by its own host.
//
// It is deliberately ALL client-side. `/explore/[id]` is prerendered (SSG with
// ISR) and must stay that way; asking the server "has this viewer reviewed this
// home?" would make the whole listing page dynamic and cost every visitor the
// prerender. So the form asks the database itself, from the browser, after
// paint — and only when someone is actually signed in.

const BODY_MAX = 600;
const BODY_MIN = 10;

export function ReviewForm({
  houseId,
  hostId,
  onSaved,
  onRemoved,
}: {
  houseId: number;
  /** The home's owner, so we never offer to review your own place. */
  hostId?: string;
  /** Called with the saved review so the list above can update immediately. */
  onSaved: (review: Review, wasEdit: boolean) => void;
  onRemoved: (reviewId: number) => void;
}) {
  const { profile, ready } = useProfile();
  // useState, not useRef: the client is created once, and reading a ref during
  // render is exactly what the react-hooks/refs rule forbids.
  const [supabase] = useState(() => createClient());

  const [existing, setExisting] = useState<Review | null>(null);
  const [checked, setChecked] = useState(false);
  const [open, setOpen] = useState(false);

  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isHost = Boolean(profile && hostId && profile.id === hostId);

  // Look up this member's own review of this home, once they're known. Skipped
  // entirely for signed-out visitors and for the host, neither of whom can write
  // one — no query, no work.
  useEffect(() => {
    let active = true;
    // Nothing to look up for a signed-out visitor or for the home's own host,
    // and no state to set either — the render branches below answer both cases
    // without waiting on a query. (Setting `checked` here synchronously would
    // also trip react-hooks/set-state-in-effect.)
    if (!ready || !profile || isHost) return;

    (async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, body, created_at")
        .eq("house_id", houseId)
        .eq("author_id", profile.id)
        .maybeSingle();

      if (!active) return;
      if (data) {
        const mine: Review = {
          id: data.id,
          rating: Number(data.rating),
          body: data.body,
          createdAt: data.created_at,
          author: {
            name: profile.fullName,
            avatarUrl: profile.avatarUrl ?? undefined,
            location: profile.location ?? undefined,
          },
        };
        setExisting(mine);
        setRating(mine.rating);
        setBody(mine.body);
      }
      setChecked(true);
    })();

    return () => {
      active = false;
    };
  }, [ready, profile, isHost, houseId, supabase]);

  if (!ready) return null;

  // The host of this home. Saying so beats silently hiding the control — the
  // absence of a button is not an explanation (Nielsen #1).
  if (isHost) {
    return (
      <p className="mt-5 rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm text-muted">
        This is your home — reviews here are written by the guests who stay in it.
      </p>
    );
  }

  if (!profile) {
    return (
      <p className="mt-5 rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm text-muted">
        <Link href="/sign-in" className="font-medium text-accent hover:text-brand">
          Sign in
        </Link>{" "}
        to write a review.
      </p>
    );
  }

  // Signed in and allowed to review, but we don't yet know whether they already
  // have. Rendering "Write a review" now would flip to "Edit your review" a
  // moment later, which reads as the page changing its mind.
  if (!checked) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setError(null);

    // Checked before the round trip, and phrased as what to do rather than what
    // went wrong (Nielsen #9).
    if (rating < 1) {
      setError("Pick a star rating first.");
      return;
    }
    if (body.trim().length < BODY_MIN) {
      setError(`Write at least ${BODY_MIN} characters, so the rating has a reason.`);
      return;
    }

    setBusy(true);

    const payload = { rating, body: body.trim() };
    const { data, error: dbErr } = existing
      ? await supabase
          .from("reviews")
          .update(payload)
          .eq("id", existing.id)
          .select("id, rating, body, created_at")
          .single()
      : await supabase
          .from("reviews")
          .insert({ ...payload, house_id: houseId, author_id: profile.id })
          .select("id, rating, body, created_at")
          .single();

    setBusy(false);

    if (dbErr || !data) {
      // 23505 is the one-review-per-home unique index. It can only be hit by
      // two tabs racing, so it gets a sentence rather than a constraint name.
      setError(
        dbErr?.code === "23505"
          ? "You've already reviewed this home. Refresh to edit that review instead."
          : (dbErr?.message ?? "Couldn't save that review.")
      );
      return;
    }

    const saved: Review = {
      id: data.id,
      rating: Number(data.rating),
      body: data.body,
      createdAt: data.created_at,
      author: {
        name: profile.fullName,
        avatarUrl: profile.avatarUrl ?? undefined,
        location: profile.location ?? undefined,
      },
    };

    onSaved(saved, Boolean(existing));
    setExisting(saved);
    setOpen(false);
  }

  async function remove() {
    if (!existing) return;
    setBusy(true);
    setError(null);
    const { error: dbErr } = await supabase.from("reviews").delete().eq("id", existing.id);
    setBusy(false);

    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    onRemoved(existing.id);
    setExisting(null);
    setRating(0);
    setBody("");
    setConfirmingDelete(false);
    setOpen(false);
  }

  if (!open) {
    return (
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={buttonClass(existing ? "secondary" : "primary")}
        >
          {existing ? "Edit your review" : "Write a review"}
        </button>
        {existing && (
          <span className="text-sm text-muted">
            You rated this home {existing.rating}/5.
          </span>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={save}
      className="mt-5 rounded-2xl border border-border bg-surface/60 p-5"
    >
      <h3 className="font-semibold">
        {existing ? "Edit your review" : "Write a review"}
      </h3>
      <p className="mt-1 text-sm text-muted">
        Only what you&apos;d want to read before staying somewhere yourself.
      </p>

      <StarPicker value={rating} onChange={setRating} />

      <label htmlFor={`review-body-${houseId}`} className="mt-5 block text-sm font-medium">
        Your review
      </label>
      <textarea
        id={`review-body-${houseId}`}
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
        rows={4}
        placeholder="What was the place like? What should the next guest know?"
        className="mt-2 w-full resize-y rounded-lg border border-border bg-surface px-4 py-3 text-fg outline-none transition focus:border-brand"
      />
      <span className="mt-1 block text-right text-xs text-muted">
        {body.length} / {BODY_MAX}
      </span>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={buttonClass("primary")}>
          {busy ? "Saving…" : existing ? "Save changes" : "Post review"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setConfirmingDelete(false);
            setError(null);
            // Drop any unsaved edits back to what's actually stored.
            setRating(existing?.rating ?? 0);
            setBody(existing?.body ?? "");
          }}
          className={buttonClass("ghost")}
        >
          Cancel
        </button>

        {/* Deleting confirms inline, as a second click on the same control —
            the pattern UnlistButton established, so destructive actions behave
            the same way everywhere (Nielsen #4). */}
        {existing &&
          (confirmingDelete ? (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">Delete it?</span>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className={buttonClass("secondary", "sm")}
              >
                Keep
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={remove}
                className={`${buttonClass("ghost", "sm")} text-danger hover:text-danger`}
              >
                Delete
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className={`${buttonClass("ghost", "sm")} ml-auto`}
            >
              Delete review
            </button>
          ))}
      </div>
    </form>
  );
}

/**
 * Five stars as one radio group. Real radios under the hood, so arrow keys work
 * and the choice is announced — a row of <div>s with click handlers is the most
 * common way star ratings become unusable without a mouse.
 */
function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  const WORDS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  return (
    <div className="mt-4">
      <p className="text-sm font-medium">Your rating</p>
      <div
        role="radiogroup"
        aria-label="Your rating, 1 to 5 stars"
        className="mt-2 flex items-center gap-1"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            onMouseEnter={() => setHover(n)}
            className="cursor-pointer p-0.5 text-2xl leading-none"
          >
            <input
              type="radio"
              name="rating"
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only"
            />
            <span
              aria-hidden
              className={
                n <= shown ? "text-accent" : "text-border transition hover:text-muted"
              }
            >
              ★
            </span>
            <span className="sr-only">
              {n} star{n === 1 ? "" : "s"} — {WORDS[n]}
            </span>
          </label>
        ))}

        {/* The number and the word, because a row of stars alone leaves the
            reader counting shapes — and colour is doing the work otherwise
            (Lecture 6). */}
        <span className="ml-3 text-sm text-muted">
          {shown ? `${shown} / 5 · ${WORDS[shown]}` : "Not rated yet"}
        </span>
      </div>
    </div>
  );
}
