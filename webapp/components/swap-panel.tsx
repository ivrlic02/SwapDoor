"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSaved } from "@/components/saved-context";
import { useProfile } from "@/components/profile-context";
import { useSwapDock } from "@/components/swap-dock-context";
import { buttonClass } from "@/components/button";
import { Avatar } from "@/components/avatar";
import { Select } from "@/components/select";
import { Calendar, addDays, nightsBetween, todayISO } from "@/components/calendar";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { dateRange } from "@/lib/swap-types";

// Short, unambiguous date. The year is included on purpose: a swap window can
// sit in the next calendar year (a ski chalet is open in January), and "Jan 9"
// alone would read as weeks away rather than months.
const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// The swap panel — the one place on the listing page where the user acts.
//
// The old version was a price plus a bare "Propose a swap" link into /sign-in:
// no dates, no guests, and no hint of what pressing it would do. That's a Gulf
// of Execution on the page's single most important control (Lecture 3), and it
// is exactly the kind of thing Mateo & Elena ("wary of scams, too many
// buttons") refuse to press.
//
// Now it asks the two questions a swap actually needs — when, and how many —
// answers "what happens if I click this?" *before* the click (feedforward,
// Lecture 2), with the host's real availability window enforced by the picker
// itself rather than by an error message afterwards (Nielsen #5), and — as of
// this pass — actually SENDS something.
//
// ── Two changes in this pass ───────────────────────────────────────────────
//
// 1. THE CALENDAR IS AN ACCORDION, not an always-open grid. The earlier
//    reasoning ("dates are the whole decision, so hiding them behind a click
//    costs a step for nothing — the sidebar has the room") held only while the
//    panel fitted on a screen. It did not: price + month grid + legend +
//    presets + guests + CTA + the three next-steps stacked up taller than a
//    laptop viewport, so the panel needed its own inner scrollbar just to
//    reach its own button. A sticky card whose inner scroller is ALWAYS active
//    does not read as sticky — it reads as frozen, because the thing that
//    moves when you scroll over it is its contents, not the card.
//    Collapsed, the panel is a price, a two-cell dates row, a guest stepper and
//    the CTA, so the primary action sits near the top of the sidebar and the
//    card travels with the page as it should. The row still SHOWS the chosen
//    dates — only the grid for changing them is behind the click.
//
//    The max-height guard is KEPT (below), because with the accordion open on
//    a short window the panel can still exceed the viewport. It is now a
//    fallback for one state rather than the permanent condition.
//
// 2. "PROPOSE A SWAP" IS REAL. It writes a `swap_requests` row (see
//    supabase/swaps.sql), the host gets it in their inbox with a badge, and
//    both sides get a thread to agree the details in. The panel used to say, in
//    so many words, that messaging was not built yet; that sentence is gone
//    because the thing it apologised for exists.
export function SwapPanel({
  houseId,
  houseName,
  hostId,
  hostName,
  hostAvatarUrl,
  pricePerNight,
  maxGuests,
  availableFrom,
  availableTo,
  verified,
}: {
  houseId: number;
  houseName: string;
  hostId?: string;
  hostName: string;
  hostAvatarUrl?: string;
  pricePerNight: number;
  maxGuests: number;
  availableFrom: string;
  availableTo: string | null;
  verified: boolean;
}) {
  const pathname = usePathname();
  const { signedIn, isSaved, toggle } = useSaved();
  const { profile } = useProfile();
  const dock = useSwapDock();

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"form" | "review" | "sent">("form");
  const [sheet, setSheet] = useState(false);
  // Is the panel's own call to action on screen? On a phone the panel sits at
  // the bottom of a very long single column, which is why <MobileBar> exists at
  // all — but once the reader has scrolled to the panel, the bar is a second
  // copy of a button already in front of them. This tells the bar to stand down.
  const [ctaOnScreen, setCtaOnScreen] = useState(false);
  const ctaEndRef = useRef<HTMLDivElement>(null);
  const [datesOpen, setDatesOpen] = useState(false);

  const [note, setNote] = useState("");
  const [offeredId, setOfferedId] = useState<number | "">("");
  const [myListings, setMyListings] = useState<{ id: number; name: string; location: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [sentId, setSentId] = useState<number | null>(null);
  /** An open request this member already has on this home, if any. */
  const [existing, setExisting] = useState<{ id: number; status: string } | null>(null);

  const saved = isSaved(houseId);
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const firstName = hostName.split(" ")[0];

  // The bookable window: never earlier than today (a window that opened last
  // month is still open, but you can't check in yesterday), and null-ended when
  // the host set no end date.
  const today = todayISO();
  const windowStart = availableFrom > today ? availableFrom : today;
  const windowEnd = availableTo && availableTo > windowStart ? availableTo : null;
  const windowOver = Boolean(availableTo && availableTo <= today);
  // Your own listing is not somewhere you can travel to. Offering the button at
  // all would be an invitation to an error the database would then have to
  // refuse (Nielsen #5 — prevent it instead).
  const ownHome = Boolean(profile && hostId && profile.id === hostId);

  const selectRange = useCallback((start: string, end: string) => {
    setCheckIn(start);
    setCheckOut(end);
    if (start && end) setError(null);
  }, []);

  // What this member already has open on this home, plus the homes they could
  // offer back. One effect, run once they are known to be signed in — a
  // signed-out visitor is asked to sign in before any of it matters.
  useEffect(() => {
    if (!isSupabaseConfigured || !profile) return;
    let active = true;
    const supabase = createClient();

    (async () => {
      const [open, mine] = await Promise.all([
        supabase
          .from("swap_requests")
          .select("id, status")
          .eq("house_id", houseId)
          .eq("guest_id", profile.id)
          .in("status", ["pending", "accepted"])
          .maybeSingle(),
        supabase
          .from("houses")
          .select("id, name, location")
          .eq("host_id", profile.id)
          .order("created_at", { ascending: false }),
      ]);
      if (!active) return;
      if (open.data) setExisting({ id: Number(open.data.id), status: String(open.data.status) });
      setMyListings(
        (mine.data ?? []).map((h) => ({
          id: Number(h.id),
          name: String(h.name),
          location: String(h.location ?? ""),
        }))
      );
    })();

    return () => {
      active = false;
    };
  }, [houseId, profile]);

  // Used by send(); propose() repeats the checks inline so it can be a stable
  // callback (a function recreated every render would re-register the dock
  // body every render).
  function validate(): string | null {
    if (!checkIn || !checkOut) {
      return "Pick both a check-in and a check-out date so the host knows your dates.";
    }
    if (nights <= 0) return "Check-out has to be after check-in.";
    if (guests > maxGuests) {
      return `This home sleeps ${maxGuests}. Lower the guest count to continue.`;
    }
    return null;
  }

  // ONE dates control, two homes for the picker: the accordion where there is
  // room for it, the bottom sheet where there is not. The breakpoint is read at
  // click time rather than duplicated as two hidden buttons, so the row is a
  // single element in the DOM and a single target to a user.
  const isWide = () => window.matchMedia("(min-width: 1024px)").matches;
  const toggleDates = useCallback(() => {
    if (isWide()) setDatesOpen((v) => !v);
    else setSheet(true);
  }, []);
  // Same, but never closes: used when something else needs the picker OPEN
  // (a validation error that can only be fixed in it).
  const revealDates = useCallback(() => {
    if (isWide()) setDatesOpen(true);
    else setSheet(true);
  }, []);
  const closeDock = dock.closeExpanded;

  // Step one of two. The review step is deliberately kept: it is where the
  // request stops being a form and starts being a message to a person, and it
  // is the last moment to change your mind before someone else is involved.
  //
  // Pressed from the docked drop-down, it also closes the drop-down: the review
  // step lives in the panel, and leaving a now-stale copy of the form hanging
  // under the nav would be two versions of the same thing on one screen.
  const propose = useCallback(() => {
    if (!checkIn || !checkOut) {
      setError("Pick both a check-in and a check-out date so the host knows your dates.");
      revealDates();
      return;
    }
    if (nightsBetween(checkIn, checkOut) <= 0) {
      setError("Check-out has to be after check-in.");
      return;
    }
    if (guests > maxGuests) {
      setError(`This home sleeps ${maxGuests}. Lower the guest count to continue.`);
      return;
    }
    setError(null);
    setStage("review");
    closeDock();
    document.getElementById("swap-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [checkIn, checkOut, guests, maxGuests, closeDock, revealDates]);

  async function send() {
    if (!profile || sending) return;
    const problem = validate();
    if (problem) {
      setError(problem);
      setStage("form");
      return;
    }

    setSending(true);
    setError(null);
    const supabase = createClient();
    const { data, error: dbError } = await supabase
      .from("swap_requests")
      .insert({
        house_id: houseId,
        // The trigger overwrites this from `houses.host_id`, so a tampered
        // client cannot address the request to someone else; it is sent here
        // only because the column is NOT NULL.
        host_id: hostId ?? null,
        guest_id: profile.id,
        offered_house_id: offeredId === "" ? null : offeredId,
        check_in: checkIn,
        check_out: checkOut,
        guests,
        message: note.trim() || null,
      })
      .select("id")
      .single();

    if (dbError) {
      // 23505 is the one-open-request-per-home index doing its job — usually a
      // double-click, or a second tab. Say what is true and offer the way on,
      // rather than reporting a constraint name (Nielsen #6, #9).
      if (dbError.code === "23505") {
        const { data: open } = await supabase
          .from("swap_requests")
          .select("id, status")
          .eq("house_id", houseId)
          .eq("guest_id", profile.id)
          .in("status", ["pending", "accepted"])
          .maybeSingle();
        if (open) setExisting({ id: Number(open.id), status: String(open.status) });
        setStage("form");
      } else {
        // The database's own messages are written for people ("This home sleeps
        // 8, so 10 guests will not fit."), so they are shown as they are.
        setError(dbError.message || "That didn't send. Check your connection and try again.");
      }
      setSending(false);
      return;
    }

    setSentId(Number(data.id));
    setStage("sent");
    setSending(false);
  }

  // One calendar instance, shared by wherever the body is rendered.
  const chooser = useMemo(
    () => (
      <DateChooser
        checkIn={checkIn}
        checkOut={checkOut}
        min={windowStart}
        max={windowEnd}
        onSelect={selectRange}
      />
    ),
    [checkIn, checkOut, windowStart, windowEnd, selectRange]
  );

  // Everything <SwapBody> needs, in one memo — so the dock registration below
  // re-runs when the form actually changes and not once per render.
  const bodyProps = useMemo(
    () => ({
      checkIn,
      checkOut,
      guests,
      maxGuests,
      nights,
      datesOpen,
      onOpenDates: toggleDates,
      onGuests: setGuests,
      chooser,
      error,
      windowOver,
      windowStart,
      windowEnd,
      ownHome,
      signedIn,
      existing,
      pathname,
      firstName,
      onPropose: propose,
    }),
    [
      checkIn,
      checkOut,
      guests,
      maxGuests,
      nights,
      datesOpen,
      toggleDates,
      chooser,
      error,
      windowOver,
      windowStart,
      windowEnd,
      ownHome,
      signedIn,
      existing,
      pathname,
      firstName,
      propose,
    ]
  );

  // ── The docked pill + drop-down ───────────────────────────────────────────
  // Publish what the nav should show while the panel is off screen: a one-line
  // summary for the pill, and the SAME <SwapBody> for the drop-down. The CTA
  // text on the pill is the same words as the real button below it — a control
  // that renames itself between two places is two controls to a user.
  //
  // Cleared while the panel is on the review or confirmation step: those live
  // in the panel, which `propose()` has just scrolled into view.
  const pillCta = !signedIn
    ? "Sign in to propose"
    : ownHome
      ? "Your listing"
      : existing
        ? "Open conversation"
        : windowOver
          ? "Dates closed"
          : "Propose a swap";

  // One line, because three segments in a third of the header is three
  // ellipses — see the note on `summary` in swap-dock-context.tsx.
  const pillSummary =
    checkIn && checkOut
      ? `${dateRange(checkIn, checkOut)} · ${guests} guest${guests === 1 ? "" : "s"}`
      : "";
  const { setDock } = dock;

  useEffect(() => {
    if (!dock.active) return;
    setDock(
      { home: houseName, summary: pillSummary, cta: pillCta },
      stage === "form" ? <SwapBody variant="dock" {...bodyProps} /> : null
    );
    return () => setDock(null, null);
  }, [dock.active, setDock, houseName, pillSummary, pillCta, stage, bodyProps]);

  // The bottom margin is the height of the fixed bar plus a little: the
  // sentinel has to clear the bar, or the bar would hide itself the instant it
  // covered its own trigger and then flicker back the moment it did.
  useEffect(() => {
    const el = ctaEndRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setCtaOnScreen(entry.isIntersecting),
      { rootMargin: "0px 0px -96px 0px", threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [stage]);

  return (
    <div
      id="swap-panel"
      className="scroll-mt-24 rounded-2xl border border-border bg-surface p-5 shadow-lg shadow-black/10 sm:p-6 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto"
    >
      {/* Value is context, not the headline: SwapDoor trades homes, it doesn't
          sell nights, so the number is deliberately quieter than the action. */}
      <p className="flex items-baseline gap-1.5">
        <span className="text-xl font-semibold text-fg">
          ${pricePerNight.toLocaleString()}
        </span>
        <span className="text-sm text-muted">est. value / night</span>
      </p>
      <p className="mt-1 text-xs text-muted">No cash changes hands — swaps only</p>

      {stage === "sent" ? (
        <SentStep
          hostName={hostName}
          hostAvatarUrl={hostAvatarUrl}
          requestId={sentId}
          dates={`${fmt(checkIn)} – ${fmt(checkOut)}`}
          nights={nights}
          guests={guests}
        />
      ) : stage === "review" ? (
        <ReviewStep
          hostName={hostName}
          firstName={firstName}
          houseName={houseName}
          dates={`${fmt(checkIn)} – ${fmt(checkOut)}`}
          nights={nights}
          guests={guests}
          note={note}
          onNote={setNote}
          myListings={myListings}
          offeredId={offeredId}
          onOffered={setOfferedId}
          sending={sending}
          error={error}
          onSend={send}
          onBack={() => setStage("form")}
        />
      ) : (
        <SwapBody variant="panel" {...bodyProps} />
      )}

      {/* Watched by the observer above. Sitting immediately after the body, it
          marks the end of the panel's own call to action — so when it is on
          screen (and clear of where the fixed bar sits), the bar has nothing
          left to do and takes itself away. See the note on `ctaOnScreen`. */}
      <div ref={ctaEndRef} aria-hidden className="h-px w-full" />

      {stage === "form" && (
        <>
          {/* What happens after the click — three steps, so pressing the button
              stops being a leap of faith. */}
          <ol className="mt-4 space-y-2 text-xs text-muted">
            <Next n={1}>{firstName} reviews your dates — no commitment yet.</Next>
            <Next n={2}>You agree the details in secure messaging.</Next>
            <Next n={3}>Both homes are confirmed, and only then do you swap keys.</Next>
          </ol>

          <p className="mt-4 flex items-center justify-center gap-1.5 border-t border-border/60 pt-3 text-center text-xs text-muted">
            {verified ? (
              <>
                <span aria-hidden className="text-success">
                  ✓
                </span>
                Verified host · Secure messaging
              </>
            ) : (
              <>
                <LockIcon />
                Secure messaging with every swap
              </>
            )}
          </p>
        </>
      )}

      {/* Saving stays available in every stage — it is the low-commitment
          action next to the high-commitment one, and the one thing that still
          makes sense when the swap window has closed. */}
      {(stage === "sent" || windowOver) && (
        <button
          type="button"
          onClick={() => toggle(houseId)}
          className={buttonClass(saved ? "secondary" : "ghost", "sm", "mt-3 w-full")}
        >
          {saved ? "♥ Saved to your homes" : "Save this home"}
        </button>
      )}

      <DateSheet
        open={sheet && !windowOver}
        onClose={() => setSheet(false)}
        nights={nights}
        done={Boolean(checkIn && checkOut)}
      >
        {chooser}
      </DateSheet>

      <MobileBar
        hidden={ctaOnScreen}
        pricePerNight={pricePerNight}
        stage={stage}
        hasDates={Boolean(checkIn && checkOut)}
        disabled={windowOver || ownHome}
        existing={existing}
        signedIn={signedIn}
        pathname={pathname}
        onAddDates={() => {
          document.getElementById("swap-panel")?.scrollIntoView({ behavior: "smooth" });
          setSheet(true);
        }}
        onPropose={propose}
      />
    </div>
  );
}

// ── The form body ───────────────────────────────────────────────────────────
// `panel` stacks it in the sidebar; `dock` lays the same controls out in a row
// for the nav's drop-down. Only the arrangement differs — never the wording,
// the order or the behaviour.
function SwapBody({
  variant,
  checkIn,
  checkOut,
  guests,
  maxGuests,
  nights,
  datesOpen,
  onOpenDates,
  onGuests,
  chooser,
  error,
  windowOver,
  windowStart,
  windowEnd,
  ownHome,
  signedIn,
  existing,
  pathname,
  firstName,
  onPropose,
}: {
  variant: "panel" | "dock";
  checkIn: string;
  checkOut: string;
  guests: number;
  maxGuests: number;
  nights: number;
  datesOpen: boolean;
  onOpenDates: () => void;
  onGuests: (n: number) => void;
  chooser: React.ReactNode;
  error: string | null;
  windowOver: boolean;
  windowStart: string;
  windowEnd: string | null;
  ownHome: boolean;
  signedIn: boolean;
  existing: { id: number; status: string } | null;
  pathname: string;
  firstName: string;
  onPropose: () => void;
}) {
  const ids = useId();
  const dockish = variant === "dock";

  if (windowOver) {
    // A calendar in which every single day is struck through is a dead end. Say
    // what happened instead, and leave an action available.
    return (
      <p className="mt-5 rounded-xl border border-border bg-bg px-3 py-3 text-sm leading-relaxed text-muted">
        This home&apos;s swap window has closed. Save it and you&apos;ll have it to hand when{" "}
        {firstName} opens new dates.
      </p>
    );
  }

  if (ownHome) {
    return (
      <div className="mt-5 rounded-xl border border-border bg-bg px-3 py-3">
        <p className="text-sm font-semibold text-fg">This is your listing</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Swap requests for this home arrive in your swaps inbox.
        </p>
        <Link href="/swaps" className={buttonClass("secondary", "sm", "mt-3 w-full")}>
          Go to my swaps
        </Link>
      </div>
    );
  }

  // Already asked. Showing the form again would invite a request the database
  // is about to refuse; showing the state you are actually in is the honest
  // answer to "where am I" (Nielsen #1).
  if (existing) {
    return (
      <div className="mt-5 rounded-xl border border-brand/40 bg-brand/10 px-3 py-3">
        <p className="text-sm font-semibold text-fg">
          {existing.status === "accepted"
            ? `${firstName} accepted your swap`
            : `Waiting on ${firstName}`}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          You already have an open request for this home.
        </p>
        <Link
          href={`/swaps/${existing.id}`}
          className={buttonClass("primary", "md", "mt-3 w-full")}
        >
          Open conversation
        </Link>
      </div>
    );
  }

  // The docked copy is the SAME vertical arrangement as the sidebar, just
  // narrower and centred under the nav. It was briefly laid out horizontally
  // (dates box on the left, a CTA as wide as it on the right), which spread
  // three small controls across a 768px row and left the whole drop-down
  // looking like it had been pushed to one side.
  return (
    <div className={dockish ? "mx-auto w-full max-w-md" : "mt-5"}>
      <div className="overflow-hidden rounded-xl border border-border">
          <DateRow
            checkIn={checkIn}
            checkOut={checkOut}
            nights={nights}
            expanded={datesOpen}
            onOpen={onOpenDates}
          />

          {/* Desktop: the grid opens in place. Same 0fr→1fr reveal the nav's own
              search drop-down uses, so the page has one way of opening things
              (CRAP repetition). Phones get the bottom sheet instead — the
              targets belong under the thumb, not a screen further down. */}
          <div
            className={`hidden border-t border-border transition-[grid-template-rows] duration-[320ms] ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:transition-none lg:grid ${
              datesOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr] border-t-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="p-3">{chooser}</div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2.5">
            <span id={`${ids}-guests-label`} className="text-xs font-medium text-muted">
              Guests
            </span>
            <div
              role="group"
              aria-labelledby={`${ids}-guests-label`}
              className="flex items-center gap-3"
            >
              <Step label="Remove a guest" disabled={guests <= 1} onClick={() => onGuests(Math.max(1, guests - 1))}>
                −
              </Step>
              <output className="w-4 text-center font-medium tabular-nums">{guests}</output>
              <Step
                label="Add a guest"
                disabled={guests >= maxGuests}
                onClick={() => onGuests(Math.min(maxGuests, guests + 1))}
              >
                +
              </Step>
            </div>
        </div>
      </div>

      {/* The window is stated, not just enforced, so a struck-out date in the
          picker is explainable rather than mysterious (visibility). The night
          count used to be prefixed here too; the dates row says it now, and
          printing it twice on one card is noise, not emphasis. */}
      <p className="mt-2 text-xs text-muted">
        Host is open to swaps between {fmt(windowStart)}
        {windowEnd ? ` and ${fmt(windowEnd)}` : ""}.
      </p>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-4">
        <Cta signedIn={signedIn} pathname={pathname} onPropose={onPropose} />
      </div>
    </div>
  );
}

function Cta({
  signedIn,
  pathname,
  onPropose,
}: {
  signedIn: boolean;
  pathname: string;
  onPropose: () => void;
}) {
  if (!signedIn) {
    return (
      <Link
        href={`/sign-in?next=${encodeURIComponent(pathname)}`}
        className={buttonClass("primary", "lg", "w-full")}
      >
        Sign in to propose a swap
      </Link>
    );
  }
  return (
    <button type="button" onClick={onPropose} className={buttonClass("primary", "lg", "w-full")}>
      Propose a swap
    </button>
  );
}

// THE dates control. One button, not two.
//
// It was a two-cell CHECK-IN | CHECK-OUT row, on the reasoning that a target
// you can name is a target you can aim at. In use it did the opposite: the two
// cells look like two separate fields, so they promise that pressing "check-out"
// takes you somewhere different from "check-in" — and it does not, because one
// calendar sets both ends. Two controls that are really one control is a false
// affordance (Lecture 2), and both of them said "Add date", which is the same
// instruction twice.
//
// So: one row, shaped like every other opener on the site — a glyph, a small
// muted label, the current value, and a chevron that turns when it is open. It
// reads as "here are your dates, press to change them", which is what it is.
function DateRow({
  checkIn,
  checkOut,
  nights,
  expanded,
  onOpen,
}: {
  checkIn: string;
  checkOut: string;
  nights: number;
  expanded: boolean;
  onOpen: () => void;
}) {
  // Say where you are in the choice, not just what is stored: a half-picked
  // range is the state people get stuck in, and it is the one worth naming.
  const value = checkIn && checkOut
    ? `${fmt(checkIn)} – ${fmt(checkOut)} · ${nights} night${nights === 1 ? "" : "s"}`
    : checkIn
      ? `${fmt(checkIn)} – add a check-out`
      : "Add your dates";

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-expanded={expanded}
      className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-bg"
    >
      <span aria-hidden className="shrink-0 text-muted">
        <CalendarGlyph />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium uppercase tracking-wide text-muted">
          Dates
        </span>
        <span
          className={`block truncate text-sm ${checkIn ? "font-medium text-fg" : "text-muted"}`}
        >
          {value}
        </span>
      </span>
      <ChevronGlyph open={expanded} />
    </button>
  );
}

// 24-viewBox, 1.8 stroke — the same line-art set as the nav pill, the amenity
// list and the account menu (CRAP repetition).
function CalendarGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3.5 9.5h17M8 3.5v3M16 3.5v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronGlyph({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={`shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Step two: the request as a message to a person ──────────────────────────
function ReviewStep({
  hostName,
  firstName,
  houseName,
  dates,
  nights,
  guests,
  note,
  onNote,
  myListings,
  offeredId,
  onOffered,
  sending,
  error,
  onSend,
  onBack,
}: {
  hostName: string;
  firstName: string;
  houseName: string;
  dates: string;
  nights: number;
  guests: number;
  note: string;
  onNote: (v: string) => void;
  myListings: { id: number; name: string; location: string }[];
  offeredId: number | "";
  onOffered: (v: number | "") => void;
  sending: boolean;
  error: string | null;
  onSend: () => void;
  onBack: () => void;
}) {
  const ids = useId();

  return (
    <div className="mt-5">
      <p className="text-sm font-semibold text-fg">Send this to {firstName}</p>

      <dl className="mt-3 space-y-1.5 rounded-xl border border-border bg-bg px-3 py-3 text-sm">
        <Row term="Home">{houseName}</Row>
        <Row term="Dates">
          {dates} · {nights} night{nights === 1 ? "" : "s"}
        </Row>
        <Row term="Guests">
          {guests} guest{guests === 1 ? "" : "s"}
        </Row>
      </dl>

      {/* A swap has two sides. Naming the home you are offering is what makes
          this a proposal rather than a booking request — but it is optional,
          because a member who has not listed yet must still be able to ask, and
          saying so plainly beats a gate on the site's primary CTA. */}
      <div className="mt-4">
        <label
          htmlFor={`${ids}-offer`}
          className="block text-xs font-medium uppercase tracking-wide text-muted"
        >
          Your home in the swap
        </label>
        {myListings.length > 0 ? (
          <div className="mt-1.5">
            <Select
              id={`${ids}-offer`}
              value={String(offeredId)}
              onChange={(next) => onOffered(next === "" ? "" : Number(next))}
              ariaLabel="Your home in the swap"
              options={[
                { value: "", label: "Not offering a home right now" },
                ...myListings.map((l) => ({
                  value: String(l.id),
                  label: l.name,
                  hint: l.location || undefined,
                })),
              ]}
              variant="inset"
            />
          </div>
        ) : (
          <p className="mt-1.5 rounded-xl border border-border bg-bg px-3 py-2.5 text-sm leading-relaxed text-muted">
            You haven&apos;t listed a home yet. {firstName} can still consider your request —{" "}
            <Link href="/list-your-home" className="font-medium text-accent hover:underline">
              list your home
            </Link>{" "}
            to make it a two-way swap.
          </p>
        )}
      </div>

      <div className="mt-4">
        <label
          htmlFor={`${ids}-note`}
          className="block text-xs font-medium uppercase tracking-wide text-muted"
        >
          A note for {firstName} <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <textarea
          id={`${ids}-note`}
          value={note}
          onChange={(e) => onNote(e.target.value.slice(0, 1000))}
          rows={3}
          placeholder={`Hi ${firstName} — we're a family of ${guests} and we'd love to…`}
          className="mt-1.5 w-full resize-none rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-fg placeholder:text-muted focus:border-brand focus:outline-none"
        />
        <p className="mt-1 text-right text-[11px] text-muted">{note.length}/1000</p>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={onSend}
          disabled={sending}
          className={buttonClass("primary", "lg", "w-full")}
        >
          {sending ? "Sending…" : `Send request to ${firstName}`}
        </button>
        {/* An exit that doesn't lose the work (Nielsen #3). */}
        <button type="button" onClick={onBack} className={buttonClass("ghost", "sm", "w-full")}>
          Back to dates
        </button>
      </div>

      <p className="mt-3 text-center text-xs leading-relaxed text-muted">
        Nothing is booked yet. {hostName.split(" ")[0]} can accept or decline, and you can withdraw
        at any time.
      </p>
    </div>
  );
}

// ── Step three: it is sent, and the next move is named ──────────────────────
function SentStep({
  hostName,
  hostAvatarUrl,
  requestId,
  dates,
  nights,
  guests,
}: {
  hostName: string;
  hostAvatarUrl?: string;
  requestId: number | null;
  dates: string;
  nights: number;
  guests: number;
}) {
  return (
    <div className="mt-5">
      <p className="flex items-center gap-2 font-semibold text-success">
        <span aria-hidden>✓</span> Request sent to {hostName.split(" ")[0]}
      </p>

      <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-bg px-3 py-3">
        <Avatar name={hostName} src={hostAvatarUrl} size={40} />
        <p className="min-w-0 text-sm leading-relaxed text-muted">
          {dates} · {nights} night{nights === 1 ? "" : "s"} · {guests} guest
          {guests === 1 ? "" : "s"}
        </p>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted">
        {hostName.split(" ")[0]} will see this in their swaps inbox. You can send them a message
        while you wait — that&apos;s where you agree the details.
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {requestId && (
          <Link href={`/swaps/${requestId}`} className={buttonClass("primary", "md", "w-full")}>
            Message {hostName.split(" ")[0]}
          </Link>
        )}
        <Link href="/swaps" className={buttonClass("ghost", "sm", "w-full")}>
          See all my swaps
        </Link>
      </div>
    </div>
  );
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-muted">{term}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-fg">{children}</dd>
    </div>
  );
}

// ── The picker itself ───────────────────────────────────────────────────────
// One calendar for both ends of the stay, wrapped in the three things that make
// a *host's* calendar different from a generic date picker: a status line that
// always says which end you are choosing, a legend for the struck-out days, and
// length presets for the stays most people are actually after.
function DateChooser({
  checkIn,
  checkOut,
  min,
  max,
  onSelect,
}: {
  checkIn: string;
  checkOut: string;
  min: string;
  max: string | null;
  onSelect: (checkIn: string, checkOut: string) => void;
}) {
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;

  // A preset extends from the check-in you already picked, or from the first
  // day the host is free if you have not picked one — so it is never a surprise
  // jump into some other month. A preset that would not fit inside the window
  // is disabled rather than silently clamped (error prevention, Nielsen #5).
  const start = checkIn || min;
  const fits = (n: number) => !max || addDays(start, n) <= max;
  const isActive = (n: number) => checkIn === start && checkOut === addDays(start, n);
  const wholeActive = Boolean(max) && checkIn === min && checkOut === max;

  const presetClass = (active: boolean) =>
    `rounded-xl border px-2.5 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-35 ${
      active
        ? "border-brand bg-brand/15 text-fg"
        : "border-border text-muted hover:bg-bg hover:text-fg"
    }`;

  return (
    <div>
      {/* Which end am I choosing, and what have I got so far (Nielsen #3). */}
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-sm font-semibold text-fg">
          {checkIn && checkOut
            ? `${nights} night${nights === 1 ? "" : "s"}`
            : checkIn
              ? "Select check-out"
              : "Select check-in"}
        </span>
        {(checkIn || checkOut) && (
          <button
            type="button"
            onClick={() => onSelect("", "")}
            className="text-xs font-medium text-accent transition hover:text-brand"
          >
            Clear
          </button>
        )}
      </div>

      <Calendar
        checkIn={checkIn}
        checkOut={checkOut}
        min={min}
        max={max ?? undefined}
        markUnavailable
        onSelect={onSelect}
      />

      {/* Struck-out days are the unusual state on this page, so they get a key.
          Shape carries the meaning, not colour alone (Lecture 6). */}
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/60 pt-2 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-full bg-brand" />
          Your dates
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-full border border-border bg-bg" />
          Open to swap
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="text-muted/45 line-through">
            15
          </span>
          Host not free
        </span>
      </p>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={!fits(7)}
          onClick={() => onSelect(start, addDays(start, 7))}
          className={presetClass(isActive(7))}
        >
          1 week
        </button>
        <button
          type="button"
          disabled={!fits(14)}
          onClick={() => onSelect(start, addDays(start, 14))}
          className={presetClass(isActive(14))}
        >
          2 weeks
        </button>
        <button
          type="button"
          disabled={!max}
          onClick={() => max && onSelect(min, max)}
          className={presetClass(wholeActive)}
        >
          Whole window
        </button>
      </div>
    </div>
  );
}

// ── Bottom sheet (phones only) ──────────────────────────────────────────────
// Portaled to <body> so it escapes the panel's own rounding and sits above the
// sticky mobile bar. Backdrop click, Escape and an explicit Done button are
// three separate ways out of it (Nielsen #3).
function DateSheet({
  open,
  onClose,
  nights,
  done,
  children,
}: {
  open: boolean;
  onClose: () => void;
  nights: number;
  done: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // the page must not scroll behind it
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] lg:hidden">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose your swap dates"
        className="swap-sheet absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl border-t border-border bg-surface p-4 pb-6 shadow-2xl shadow-black/50"
      >
        {/* The grab handle is the signifier that this panel came up from the
            bottom edge and goes back down there. */}
        <div aria-hidden className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" />
        {children}
        <button
          type="button"
          onClick={onClose}
          className={buttonClass(done ? "primary" : "secondary", "md", "mt-4 w-full")}
        >
          {done ? `Done · ${nights} night${nights === 1 ? "" : "s"}` : "Close"}
        </button>
      </div>
    </div>,
    document.body
  );
}

// ── Sticky bar for phones ───────────────────────────────────────────────────
// The panel lives at the bottom of a long single-column page there, so without
// this the primary action sits ~2000px below the fold.
//
// FIXED IN THIS PASS: the button used to be labelled "Propose a swap" and only
// scrolled the page. One label, two different actions, on the primary control —
// the button said what the user wanted to hear rather than what it did
// (Nielsen #2 and #4). It now says what it will do: with no dates yet it reads
// "Add dates" and opens the picker; once there are dates it reads "Propose a
// swap" and does exactly that. It also renders from INSIDE the panel now, so it
// can read that state at all — as a separate component at page level it had no
// way to know whether any dates existed.
function MobileBar({
  hidden,
  pricePerNight,
  stage,
  hasDates,
  disabled,
  existing,
  signedIn,
  pathname,
  onAddDates,
  onPropose,
}: {
  /** True while the panel's own CTA is on screen. See `ctaOnScreen`. */
  hidden: boolean;
  pricePerNight: number;
  stage: "form" | "review" | "sent";
  hasDates: boolean;
  disabled: boolean;
  existing: { id: number; status: string } | null;
  signedIn: boolean;
  pathname: string;
  onAddDates: () => void;
  onPropose: () => void;
}) {
  // The bar's whole job is to reach a control that is off screen. Once the
  // panel is showing the review or the confirmation, the control IS on screen.
  if (stage !== "form") return null;
  // …and the same is true, on a phone, the moment the reader scrolls the panel
  // itself into view: the page then carried "Sign in to propose a swap" as a
  // full-width button in the panel AND "Sign in to propose" in a fixed bar
  // 200px below it — the same action, twice, in two different wordings, which
  // is exactly the "wonder whether different words mean the same thing" that
  // Nielsen #2 is about. The bar is the fallback, so the bar is what yields.
  if (hidden) return null;

  const action = () => {
    if (hasDates) onPropose();
    else onAddDates();
  };

  // A plain fixed element, not a portal: nothing between here and <body>
  // establishes a containing block (`position: sticky` on the sidebar does
  // not), so it pins to the viewport where it stands — and being rendered
  // in-tree is what lets it read the panel's state and label itself honestly.
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
        <p className="leading-tight">
          <span className="font-semibold">${pricePerNight.toLocaleString()}</span>
          <span className="block text-xs text-muted">est. value / night</span>
        </p>
        {!signedIn ? (
          <Link
            href={`/sign-in?next=${encodeURIComponent(pathname)}`}
            className={buttonClass("primary", "md")}
          >
            Sign in to propose
          </Link>
        ) : existing ? (
          <Link href={`/swaps/${existing.id}`} className={buttonClass("primary", "md")}>
            Open conversation
          </Link>
        ) : (
          <button
            type="button"
            onClick={action}
            disabled={disabled}
            className={buttonClass("primary", "md")}
          >
            {hasDates ? "Propose a swap" : "Add dates"}
          </button>
        )}
      </div>
    </div>
  );
}

function Step({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-full border border-border text-fg transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {children}
    </button>
  );
}

function Next({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="grid size-4 shrink-0 place-items-center rounded-full bg-brand/15 text-[10px] font-bold text-accent">
        {n}
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

function LockIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
      className="shrink-0 text-accent"
    >
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

// The 1px sentinel that docks the pill: when it scrolls up under the nav, the
// panel has gone with it. It sits after the two-column section rather than
// inside the sticky sidebar — a sentinel inside a sticky element never leaves
// the viewport, so it would never fire.
export function SwapDockSentinel() {
  const { setCollapsed } = useSwapDock();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Desktop only. On a phone the panel already has a sticky bar pinned to the
    // bottom edge, where a thumb is; docking a second copy of the same action
    // into the top of the screen would put two primary CTAs on one page, and
    // the one further from the thumb would win the space (Fitts, Nielsen #8).
    // Re-evaluated on resize, so rotating a tablet does not strand the pill.
    const mq = window.matchMedia("(min-width: 768px)");
    let io: IntersectionObserver | null = null;

    const sync = () => {
      io?.disconnect();
      io = null;
      if (!mq.matches) {
        setCollapsed(false);
        return;
      }
      // The same mechanism as the home Hero and Explore: IntersectionObserver
      // fires only on enter/leave, so there is no per-pixel scroll work.
      io = new IntersectionObserver(([entry]) => setCollapsed(!entry.isIntersecting), {
        rootMargin: "-72px 0px 0px 0px",
        threshold: 0,
      });
      io.observe(el);
    };

    sync();
    mq.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
      io?.disconnect();
    };
  }, [setCollapsed]);

  return <div ref={ref} aria-hidden className="h-px w-full" />;
}
