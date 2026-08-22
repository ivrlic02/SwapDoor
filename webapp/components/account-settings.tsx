"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/button";
import { useProfile } from "@/components/profile-context";
import { createClient } from "@/lib/supabase/client";

// The account half of /profile — the "Account Settings" node from the
// card-sorting sitemap (Overview.md §4: Personal Info, Password, Log Out).
// Kept as a section of the same page rather than a second route: on a site
// this size, two near-empty settings pages is worse than one page with two
// clearly separated blocks (Lecture 5, proximity does the grouping).
//
// Three of these are new, and each closed a specific gap:
//  • The email card used to say "Changing it isn't available yet" — a dead end
//    dressed as a setting (Nielsen #1). It changes an email now.
//  • Signing out ended the session on this device only, with nothing said
//    about that. A shared or lost machine had no remedy.
//  • There was no way to leave. An account you cannot delete is the clearest
//    possible violation of user control and freedom (#3).

const PASSWORD_MIN = 6; // Supabase's own minimum
const DELETE_PHRASE = "DELETE";

type Status = { text: string; tone: "ok" | "error" } | null;

export function AccountSettings() {
  const router = useRouter();
  const { profile } = useProfile();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  if (!profile) return null;

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    // Checked here so the mismatch is caught before a round trip, and the
    // message says what to do rather than what went wrong (Nielsen #9).
    if (password.length < PASSWORD_MIN) {
      setStatus({
        text: `Use at least ${PASSWORD_MIN} characters.`,
        tone: "error",
      });
      return;
    }
    if (password !== confirm) {
      setStatus({ text: "The two passwords don't match.", tone: "error" });
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      setStatus({ text: error.message, tone: "error" });
      return;
    }
    setPassword("");
    setConfirm("");
    setStatus({ text: "Password updated.", tone: "ok" });
  }

  async function signOut(scope: "local" | "global") {
    const supabase = createClient();
    await supabase.auth.signOut({ scope });
    router.refresh();
    router.push("/");
  }

  return (
    <div id="account" className="mt-14 scroll-mt-24 border-t border-border pt-10">
      <h2 className="text-2xl font-bold">Account settings</h2>
      <p className="mt-1 text-muted">Your sign-in details. Never shown to other members.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <EmailCard email={profile.email} />

        <form
          onSubmit={changePassword}
          className="rounded-2xl border border-border bg-surface/60 p-6"
        >
          <h3 className="font-semibold">Change password</h3>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="newPassword" className="text-sm font-medium">
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={PASSWORD_MIN}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={PASSWORD_MIN}
                className={inputClass}
              />
            </div>
          </div>

          {status && (
            <p
              role={status.tone === "error" ? "alert" : "status"}
              className={`mt-4 text-sm ${status.tone === "error" ? "text-danger" : "text-success"}`}
            >
              {status.tone === "ok" && "✓ "}
              {status.text}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !password || !confirm}
            className={`mt-5 ${buttonClass("secondary")}`}
          >
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>

      {/* ---- Sessions --------------------------------------------------- */}
      {/* Two exits, and the difference between them is spelled out rather than
          implied by the word "everywhere": someone reaching for this after
          using a shared laptop needs to know which button actually helps. */}
      <div className="mt-6 rounded-2xl border border-border bg-surface/60 p-6">
        <h3 className="font-semibold">Sessions</h3>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            Signed in as <span className="text-fg">{profile.email}</span>. Signing
            out everywhere also ends any session on other devices — use it if you
            signed in somewhere you no longer trust.
          </p>
          <div className="flex shrink-0 flex-wrap gap-3">
            <button
              type="button"
              onClick={() => signOut("local")}
              className={buttonClass("secondary")}
            >
              Sign out
            </button>
            <button
              type="button"
              onClick={() => signOut("global")}
              className={buttonClass("ghost")}
            >
              Sign out everywhere
            </button>
          </div>
        </div>
      </div>

      <DeleteAccount />
    </div>
  );
}

/**
 * Changing the sign-in address. The confirmation link is the whole mechanism,
 * so the copy leads with it: nothing changes until the link is opened, which
 * means a typo is recoverable by simply not clicking (Nielsen #5) — and a
 * member who never sees the mail knows why they're still on the old address.
 */
function EmailCard({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    const address = next.trim();
    if (address.toLowerCase() === email.toLowerCase()) {
      setStatus({ text: "That's already your address.", tone: "error" });
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser(
      { email: address },
      // Land back on this section, so the tab that finishes the change shows
      // the setting that started it rather than the home page.
      { emailRedirectTo: `${window.location.origin}/auth/callback?next=/profile%23account` }
    );
    setBusy(false);

    if (error) {
      setStatus({ text: error.message, tone: "error" });
      return;
    }

    setStatus({
      text: `Check ${address} for a confirmation link. Your sign-in address stays ${email} until you open it — and if confirmation is required on both addresses, there's a link waiting at ${email} too.`,
      tone: "ok",
    });
    setNext("");
  }

  return (
    <section className="rounded-2xl border border-border bg-surface/60 p-6">
      <h3 className="font-semibold">Email</h3>
      <p className="mt-2 text-muted">{email}</p>
      <p className="mt-3 text-sm text-muted">This is the address you sign in with.</p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`mt-4 ${buttonClass("secondary")}`}
        >
          Change email
        </button>
      ) : (
        <form onSubmit={submit} className="mt-4">
          <label htmlFor="newEmail" className="text-sm font-medium">
            New email address
          </label>
          <input
            id="newEmail"
            type="email"
            required
            autoComplete="email"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="you@example.com"
            className={`mt-2 ${inputClass}`}
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy || !next.trim()}
              className={buttonClass("secondary")}
            >
              {busy ? "Sending…" : "Send confirmation"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setNext("");
                setStatus(null);
              }}
              className={buttonClass("ghost")}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {status && (
        <p
          role={status.tone === "error" ? "alert" : "status"}
          className={`mt-4 text-sm ${status.tone === "error" ? "text-danger" : "text-success"}`}
        >
          {status.tone === "ok" && "✓ "}
          {status.text}
        </p>
      )}
    </section>
  );
}

/**
 * Deleting the account. Three things make this deliberate rather than merely
 * scary: the consequences are listed before the control appears, the confirm
 * asks the member to *type* a word (an accidental double-click can't do it),
 * and "Keep my account" is always the nearer, easier option — the same inline
 * two-step the Unlist button uses, so destructive actions behave alike across
 * the site (Nielsen #4).
 */
function DeleteAccount() {
  const router = useRouter();
  const { profile, listingCount } = useProfile();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!profile) return;
    setBusy(true);
    setError(null);

    const supabase = createClient();

    // Storage is not covered by the database cascade, so the member's own
    // uploads are cleared first — otherwise their photos would outlive the
    // account that owns them. Failures here are not fatal: an orphaned file is
    // a smaller problem than an account that refuses to be deleted.
    for (const bucket of ["avatars", "house-photos"] as const) {
      const { data: files } = await supabase.storage.from(bucket).list(profile.id);
      if (files && files.length > 0) {
        await supabase.storage
          .from(bucket)
          .remove(files.map((f) => `${profile.id}/${f.name}`));
      }
    }

    // Deleting an auth user needs privileges a browser key doesn't have, so
    // this goes through a SECURITY DEFINER function that takes no arguments and
    // derives the target from auth.uid() (supabase/profile.sql).
    const { error: rpcErr } = await supabase.rpc("delete_own_account");

    if (rpcErr) {
      setBusy(false);
      setError(rpcErr.message);
      return;
    }

    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  return (
    <div className="mt-6 rounded-2xl border border-danger/40 bg-surface/60 p-6">
      <h3 className="font-semibold text-danger">Delete account</h3>
      <p className="mt-2 text-sm text-muted">
        This removes your profile, your saved homes, and every swap request and
        message you&apos;re part of.
        {listingCount > 0 && (
          <>
            {" "}
            Your {listingCount} listing{listingCount === 1 ? "" : "s"} and its
            reviews go with it, and it will disappear from Explore.
          </>
        )}{" "}
        It cannot be undone.
      </p>

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          Couldn&apos;t delete the account: {error}
        </p>
      )}

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={`mt-4 ${buttonClass("secondary")}`}
        >
          Delete my account
        </button>
      ) : (
        <div className="mt-4">
          <label htmlFor="deleteConfirm" className="text-sm font-medium text-fg">
            Type {DELETE_PHRASE} to confirm
          </label>
          <input
            id="deleteConfirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            placeholder={DELETE_PHRASE}
            className={`mt-2 max-w-xs ${inputClass}`}
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setTyped("");
              }}
              className={buttonClass("secondary")}
            >
              Keep my account
            </button>
            <button
              type="button"
              disabled={busy || typed.trim() !== DELETE_PHRASE}
              onClick={remove}
              className={`${buttonClass("ghost")} text-danger hover:text-danger`}
            >
              {busy ? "Deleting…" : "Delete permanently"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-4 py-3 text-fg outline-none transition focus:border-brand";
