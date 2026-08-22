import Link from "next/link";
import Image from "next/image";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Avatar } from "@/components/avatar";
import { buttonClass } from "@/components/button";
import { MascotGlyph } from "@/components/brand";
import { getMySwaps } from "@/lib/swaps";
import {
  STATUS_META,
  dateRange,
  tabFor,
  timeAgo,
  type SwapRequest,
  type SwapTab,
} from "@/lib/swap-types";

// Private page — the proxy (middleware) redirects signed-out users to /sign-in.
// Reads the session cookie, so it must render per-request, never at build time.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "My swaps · SwapDoor",
};

// The account menu has carried a "My swaps — Soon" row since the menu was
// built. This is the page it was waiting for, and the chip is gone.
//
// Four tabs, in the order the work arrives: what needs YOUR answer first, then
// what you are waiting on, then what is agreed, then history. The card-sorting
// sitemap (Overview §4) asked for exactly this grouping — Pending / Confirmed /
// Past — with "incoming vs sent" split out, because they are two different jobs:
// one is a decision you owe someone, the other is a decision you are owed.
const TABS: { id: SwapTab; label: string; blurb: string }[] = [
  { id: "incoming", label: "Needs your answer", blurb: "Requests from members who want to swap with you." },
  { id: "sent", label: "You asked", blurb: "Requests you sent, waiting on the host." },
  { id: "confirmed", label: "Confirmed", blurb: "Agreed swaps still ahead of you." },
  { id: "past", label: "Past", blurb: "Finished, declined and withdrawn requests." },
];

export default async function SwapsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const swaps = await getMySwaps();

  const buckets: Record<SwapTab, SwapRequest[]> = {
    incoming: [],
    sent: [],
    confirmed: [],
    past: [],
  };
  for (const s of swaps) buckets[tabFor(s)].push(s);

  // Land on the tab that has something waiting, unless the URL says otherwise —
  // an inbox that opens on an empty tab while another one has three unanswered
  // requests is answering the wrong question.
  const requested = TABS.find((t) => t.id === tab)?.id;
  const active: SwapTab =
    requested ??
    (buckets.incoming.length > 0
      ? "incoming"
      : buckets.sent.length > 0
        ? "sent"
        : buckets.confirmed.length > 0
          ? "confirmed"
          : "incoming");

  const meta = TABS.find((t) => t.id === active)!;
  const rows = buckets[active];

  return (
    <main className="min-h-screen bg-bg text-fg">
      <Navigation />

      <section className="mx-auto max-w-5xl px-6 pb-20 pt-14">
        <header className="mb-6">
          <h1 className="text-4xl font-bold md:text-5xl">My swaps</h1>
          <p className="mt-2 text-muted">
            {swaps.length > 0
              ? "Every request you've sent or received, and the conversation that goes with it."
              : "Requests you send and receive will collect here."}
          </p>
        </header>

        {/* Tabs. Each carries its own count, so the shape of the work is visible
            before anything is clicked (Nielsen #1) — and a count sitting next to
            a word means the state is never carried by colour alone. */}
        <nav className="flex flex-wrap gap-2 border-b border-border pb-3">
          {TABS.map((t) => {
            const count = buckets[t.id].length;
            const unread = buckets[t.id].reduce((n, s) => n + s.unread, 0);
            const current = t.id === active;
            return (
              <Link
                key={t.id}
                href={`/swaps?tab=${t.id}`}
                aria-current={current ? "page" : undefined}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  current
                    ? "border-brand bg-brand/12 text-fg"
                    : "border-border text-muted hover:bg-surface hover:text-fg"
                }`}
              >
                {t.label}
                {count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                      unread > 0 ? "bg-brand text-white" : "bg-border/60 text-muted"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <p className="mt-4 text-sm text-muted">{meta.blurb}</p>

        {rows.length > 0 ? (
          <ul className="mt-5 space-y-3">
            {rows.map((s) => (
              <li key={s.id}>
                <SwapRow swap={s} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState tab={active} />
        )}
      </section>

      <Footer />
    </main>
  );
}

// One request as an inbox row. It has to answer four questions at a glance:
// which home, with whom, when, and what state it is in — so those four sit in
// one block rather than being spread across a card with a photo in the middle
// (CRAP proximity).
function SwapRow({ swap }: { swap: SwapRequest }) {
  const status = STATUS_META[swap.status];
  const toneClass =
    status.tone === "success"
      ? "text-success"
      : status.tone === "brand"
        ? "text-accent"
        : "text-muted";

  return (
    <Link
      href={`/swaps/${swap.id}`}
      className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-4 transition hover:border-muted/50 hover:bg-surface-2"
    >
      {swap.house.image ? (
        <Image
          src={swap.house.image}
          alt=""
          width={112}
          height={84}
          sizes="112px"
          className="hidden h-[84px] w-28 shrink-0 rounded-xl object-cover sm:block"
        />
      ) : (
        <div aria-hidden className="hidden h-[84px] w-28 shrink-0 rounded-xl bg-bg sm:block" />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="min-w-0 truncate font-semibold text-fg">{swap.house.name}</p>
          <span className={`flex shrink-0 items-center gap-1.5 text-xs font-semibold ${toneClass}`}>
            <span aria-hidden>{status.glyph}</span>
            {status.label}
          </span>
        </div>

        <p className="mt-0.5 truncate text-sm text-muted">
          {[swap.house.location, swap.house.country].filter(Boolean).join(", ")}
        </p>

        <p className="mt-2 text-sm text-fg">
          {dateRange(swap.checkIn, swap.checkOut)} · {swap.nights} night
          {swap.nights === 1 ? "" : "s"} · {swap.guests} guest{swap.guests === 1 ? "" : "s"}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-sm text-muted">
          <Avatar
            name={swap.counterpart.name}
            src={swap.counterpart.avatarUrl ?? undefined}
            size={24}
          />
          <span className="truncate">
            {swap.role === "incoming" ? "From" : "With"} {swap.counterpart.name}
          </span>
          <span aria-hidden className="text-muted/50">
            ·
          </span>
          <span>{timeAgo(swap.lastMessageAt ?? swap.updatedAt)}</span>
          {swap.unread > 0 && (
            <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">
              {swap.unread} new message{swap.unread === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// An empty tab that names the thing you'd do next, rather than a blank panel.
//
// The mascot is faded to 30%, the same as Explore's no-results, /dashboard and
// /my-listings: an empty panel is a moment of doubt ("is this broken, or have I
// just not done it yet?"), and a piece of the brand answering it says the page
// rendered fine — quiet enough that the sentence and the button still land
// first. Same treatment in all four places, so it reads as one system (CRAP
// repetition, Nielsen #4).
function EmptyState({ tab }: { tab: SwapTab }) {
  const copy: Record<SwapTab, { title: string; body: string }> = {
    incoming: {
      title: "No requests waiting",
      body: "When a member asks to swap into one of your homes, it lands here.",
    },
    sent: {
      title: "You haven't asked anyone yet",
      body: "Find a home you like and propose a swap — the host answers, and nothing is committed until you both agree.",
    },
    confirmed: {
      title: "No confirmed swaps yet",
      body: "Once a host accepts, the swap moves here with the conversation attached.",
    },
    past: {
      title: "Nothing in your history",
      body: "Finished, declined and withdrawn requests are kept here.",
    },
  };
  const { title, body } = copy[tab];

  return (
    <div className="mt-5 rounded-2xl border border-border bg-surface/60 px-6 py-16 text-center">
      <MascotGlyph className="mx-auto mb-6 h-20 w-auto opacity-30" />
      <p className="text-lg font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-muted">{body}</p>
      <Link href="/explore" className={`mt-5 inline-block ${buttonClass("primary")}`}>
        Explore homes
      </Link>
    </div>
  );
}
