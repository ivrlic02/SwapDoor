"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/button";
import { useProfile } from "@/components/profile-context";
import { createClient } from "@/lib/supabase/client";
import { storagePathFromUrl } from "@/lib/storage";

// Removing a listing is destructive and can't be undone, so it asks first —
// but inline, as a second click on the same control, rather than a browser
// confirm() dialog. The confirm state names the home and offers "Keep it",
// so the safe option is always one click away (Nielsen #3, user control, and
// #5: make the destructive path deliberate).
export function UnlistButton({
  houseId,
  houseName,
  photos,
}: {
  houseId: number;
  houseName: string;
  /** Storage URLs to clean up with the row, so the bucket doesn't collect orphans. */
  photos: string[];
}) {
  const router = useRouter();
  const { profile, refresh } = useProfile();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlist() {
    if (!profile) return;
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: dbErr } = await supabase.from("houses").delete().eq("id", houseId);

    if (dbErr) {
      setBusy(false);
      setError(dbErr.message);
      return;
    }

    // Delete the photos too — only ones inside this user's own folder, which is
    // also all the storage policy would allow. Seeded Unsplash URLs yield null
    // and are left alone.
    const paths = photos
      .map((url) => storagePathFromUrl(url, "house-photos", profile.id))
      .filter((p): p is string => p !== null);
    if (paths.length > 0) {
      await supabase.storage.from("house-photos").remove(paths);
    }

    await refresh(); // keeps the nav menu's "My listings" count correct
    router.refresh();
  }

  if (error) {
    return (
      <p role="alert" className="text-sm text-danger">
        Couldn&apos;t unlist: {error}
      </p>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={buttonClass("ghost", "sm")}
      >
        Unlist
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">Remove “{houseName}” from Explore?</span>
      <button
        type="button"
        onClick={unlist}
        disabled={busy}
        className={`${buttonClass("secondary", "sm")} border-danger text-danger hover:bg-danger/10`}
      >
        {busy ? "Removing…" : "Yes, unlist"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={busy}
        className={buttonClass("ghost", "sm")}
      >
        Keep it
      </button>
    </span>
  );
}
