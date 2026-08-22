"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/button";
import { useSwaps } from "@/components/swaps-context";
import { createClient } from "@/lib/supabase/client";
import type { SwapRole, SwapStatus } from "@/lib/swap-types";

// Answering a swap request. Which controls exist depends entirely on which side
// of it you are standing on, and the database agrees: the guard trigger in
// supabase/swaps.sql lets a host move a pending request to accepted/declined
// and a guest move it to cancelled, and refuses everything else. The UI here
// shows exactly the moves that exist, so there is no button whose only possible
// outcome is an error (Nielsen #5).
//
// Declining and withdrawing are one-way — the status machine has no route back
// out of a terminal state — so both ask once before they act. The confirmation
// is inline rather than a modal: it replaces the button it is confirming, which
// keeps the question next to the thing it is about (CRAP proximity) and does not
// blank the page the user is reading to decide.
export function SwapActions({
  requestId,
  role,
  status,
  counterpartName,
}: {
  requestId: number;
  role: SwapRole;
  status: SwapStatus;
  counterpartName: string;
}) {
  const router = useRouter();
  const { refresh } = useSwaps();
  const [busy, setBusy] = useState<null | SwapStatus>(null);
  const [confirming, setConfirming] = useState<null | "declined" | "cancelled">(null);
  const [error, setError] = useState<string | null>(null);

  const firstName = counterpartName.split(" ")[0];

  async function setStatus(next: SwapStatus) {
    setBusy(next);
    setError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("swap_requests")
      .update({ status: next })
      .eq("id", requestId);

    if (dbError) {
      // The trigger's messages are written for people ("This request has
      // already been answered."), so they are shown as they are.
      setError(dbError.message || "That didn't go through. Try again.");
      setBusy(null);
      return;
    }
    setConfirming(null);
    setBusy(null);
    await refresh();
    router.refresh();
  }

  if (status !== "pending") return null;

  return (
    <div className="mt-4">
      {role === "incoming" ? (
        <div className="flex flex-wrap gap-2">
          {confirming === "declined" ? (
            <Confirm
              question={`Decline ${firstName}'s request? This can't be undone.`}
              confirmLabel={busy ? "Declining…" : "Yes, decline"}
              busy={busy !== null}
              onConfirm={() => setStatus("declined")}
              onCancel={() => setConfirming(null)}
            />
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStatus("accepted")}
                disabled={busy !== null}
                className={buttonClass("primary", "md")}
              >
                {busy === "accepted" ? "Accepting…" : "Accept swap"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming("declined")}
                disabled={busy !== null}
                className={buttonClass("secondary", "md")}
              >
                Decline
              </button>
            </>
          )}
        </div>
      ) : confirming === "cancelled" ? (
        <Confirm
          question="Withdraw this request? You can propose again later."
          confirmLabel={busy ? "Withdrawing…" : "Yes, withdraw"}
          busy={busy !== null}
          onConfirm={() => setStatus("cancelled")}
          onCancel={() => setConfirming(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setConfirming("cancelled")}
          className={buttonClass("secondary", "md")}
        >
          Withdraw request
        </button>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function Confirm({
  question,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  question: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="w-full rounded-xl border border-border bg-bg px-3 py-3">
      <p className="text-sm text-fg">{question}</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={buttonClass("primary", "sm")}
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className={buttonClass("ghost", "sm")}
        >
          Keep it open
        </button>
      </div>
    </div>
  );
}
