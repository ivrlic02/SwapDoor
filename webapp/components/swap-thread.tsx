"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { buttonClass } from "@/components/button";
import { useSwaps } from "@/components/swaps-context";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { timeAgo, type SwapMessage, type SwapParty, type SwapRole } from "@/lib/swap-types";

// The conversation on one swap request — the "secure messaging" every trust
// line on the site has promised since the first version of the listing page.
//
// It is deliberately NOT a general inbox. A thread hangs off a request, so the
// two people in it are the two people in the swap, and that is enforced by RLS
// rather than by a membership table the app has to keep correct. It also means
// the conversation always has a subject: the dates and the home are on the page
// above it, so neither side has to remember what they are agreeing to.
//
// Freshness without a socket: the thread re-reads when the tab becomes visible
// and every 15s while it is open and focused. That is enough for a conversation
// people answer in minutes, and it costs nothing while the tab is in the
// background. (Supabase Realtime would make it instant and is a small change —
// `supabase.channel().on("postgres_changes", …)` on swap_messages — but it is
// infrastructure this page does not need yet.)
export function SwapThread({
  requestId,
  viewerId,
  viewerName,
  viewerAvatarUrl,
  counterpart,
  role,
  initialMessages,
  canWrite,
}: {
  requestId: number;
  viewerId: string;
  viewerName: string;
  viewerAvatarUrl: string | null;
  counterpart: SwapParty;
  role: SwapRole;
  initialMessages: SwapMessage[];
  /** False once the request is declined or withdrawn — the record stays readable. */
  canWrite: boolean;
}) {
  const { refresh } = useSwaps();
  const [messages, setMessages] = useState<SwapMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("swap_messages")
      .select("id, sender_id, body, created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });
    if (!data) return;
    setMessages(
      data.map((m) => ({
        id: Number(m.id),
        senderId: String(m.sender_id),
        body: String(m.body),
        createdAt: String(m.created_at),
      }))
    );
  }, [requestId]);

  // Opening the thread IS reading it. One write of one timestamp per open, and
  // the badge in the nav recomputes from it — see swaps-context.tsx for why the
  // count is derived rather than stored.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const column = role === "incoming" ? "host_read_at" : "guest_read_at";
      await supabase
        .from("swap_requests")
        .update({ [column]: new Date().toISOString() })
        .eq("id", requestId);
      if (!cancelled) await refresh();
    })();

    return () => {
      cancelled = true;
    };
    // Runs once per thread: re-running it on every message would be a write per
    // keystroke's worth of state change for no extra truth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, role]);

  // Poll while the tab is actually being looked at.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const tick = () => {
      if (document.visibilityState === "visible") reload();
    };
    const timer = setInterval(tick, 15_000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [reload]);

  // Keep the newest message in view, but only inside the thread's own scroller —
  // scrolling the whole page out from under someone who is reading the dates
  // above would be the page moving without being asked.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setError(null);
    const supabase = createClient();
    const { data, error: dbError } = await supabase
      .from("swap_messages")
      .insert({ request_id: requestId, sender_id: viewerId, body })
      .select("id, sender_id, body, created_at")
      .single();

    if (dbError || !data) {
      setError("That message didn't send. Check your connection and try again.");
      setSending(false);
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: Number(data.id),
        senderId: String(data.sender_id),
        body: String(data.body),
        createdAt: String(data.created_at),
      },
    ]);
    setDraft("");
    setSending(false);
  }

  return (
    <section className="mt-8 rounded-2xl border border-border bg-surface">
      <header className="flex items-center gap-3 border-b border-border px-5 py-4">
        <Avatar name={counterpart.name} src={counterpart.avatarUrl ?? undefined} size={40} />
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-fg">{counterpart.name}</h2>
          <p className="truncate text-xs text-muted">
            {counterpart.location ? `${counterpart.location} · ` : ""}
            {role === "incoming" ? "Asked to swap with you" : "You asked to swap"}
          </p>
        </div>
      </header>

      <div
        ref={listRef}
        className="max-h-[420px] space-y-3 overflow-y-auto px-5 py-4"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          // An empty thread should suggest the first move rather than sit blank
          // (Nielsen #1 + #10: say what to do here, at the moment it is needed).
          <p className="rounded-xl border border-border bg-bg px-3 py-3 text-sm leading-relaxed text-muted">
            No messages yet.{" "}
            {role === "incoming"
              ? `Ask ${counterpart.name.split(" ")[0]} anything you need before you answer — who is travelling, what they'd like to know about your home.`
              : `Say hello, and tell ${counterpart.name.split(" ")[0]} a little about who's travelling.`}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === viewerId;
            return (
              <div key={m.id} className={`flex gap-2.5 ${mine ? "flex-row-reverse" : ""}`}>
                <Avatar
                  name={mine ? viewerName : counterpart.name}
                  src={(mine ? viewerAvatarUrl : counterpart.avatarUrl) ?? undefined}
                  size={28}
                />
                <div className={`min-w-0 max-w-[78%] ${mine ? "text-right" : ""}`}>
                  {/* Your own messages are on the right AND in brand blue, so
                      which side of the conversation a line is on never rests on
                      colour alone (Lecture 6, guideline 4). */}
                  <p
                    className={`inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-left text-sm leading-relaxed ${
                      mine
                        ? "bg-brand text-white"
                        : "border border-border bg-bg text-fg"
                    }`}
                  >
                    {m.body}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    {mine ? "You" : counterpart.name.split(" ")[0]} · {timeAgo(m.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {canWrite ? (
        <div className="border-t border-border px-5 py-4">
          <label htmlFor={`thread-${requestId}`} className="sr-only">
            Message {counterpart.name}
          </label>
          <textarea
            id={`thread-${requestId}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter makes a new line — the convention every
              // messaging app the personas already use follows (Nielsen #2).
              //
              // On a phone that convention inverts, and keeping it here was a
              // trap: a touch keyboard has no Shift+Enter, and its return key
              // is how a person starts a second line. So the first paragraph
              // break sent a half-written message to a stranger you are asking
              // to swap homes with — a slip in Norman's sense (right goal,
              // automatic action misfires), on an action that cannot be undone.
              // Below `lg` the return key does what its own keyboard says it
              // does, and Send is the only thing that sends.
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                window.matchMedia("(min-width: 1024px)").matches
              ) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder={`Message ${counterpart.name.split(" ")[0]}…`}
            className="w-full resize-none rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-fg placeholder:text-muted focus:border-brand focus:outline-none"
          />
          {/* With the hint gone below `lg` the row has one child, so Send goes
              full width there rather than sitting as a small chip in an empty
              line — it is the only action in the composer (Fitts). */}
          <div className="mt-2 flex items-center justify-between gap-3">
            {/* A keyboard hint for a device with no keyboard is instructions
                for someone else's interface (Nielsen #10 — help has to be about
                the reader's actual task). */}
            <p className="hidden text-[11px] text-muted lg:block">
              Enter to send · Shift + Enter for a new line
            </p>
            <button
              type="button"
              onClick={send}
              disabled={sending || draft.trim().length === 0}
              className={buttonClass("primary", "sm", "min-h-11 flex-1 lg:min-h-0 lg:flex-none")}
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      ) : (
        // Read-only rather than deleted: a conversation that ended is still the
        // record of what was agreed, and hiding it would lose that.
        <p className="border-t border-border px-5 py-4 text-sm text-muted">
          This request is closed, so the conversation is read-only. Propose a new swap to start
          another one.
        </p>
      )}
    </section>
  );
}
