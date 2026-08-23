import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Avatar } from "@/components/avatar";
import { SwapActions } from "@/components/swap-actions";
import { SwapThread } from "@/components/swap-thread";
import { SwapReview } from "@/components/swap-review";
import { getSwapThread } from "@/lib/swaps";
import { STATUS_META, dateRange } from "@/lib/swap-types";

// Private page. Note that "not yours" and "does not exist" deliberately look the
// same: RLS returns nothing for a request you are not part of, and this page
// turns that into a 404 rather than a "forbidden" — a swap between two other
// people should not be probeable by id.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Swap request · SwapDoor",
};

export default async function SwapThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (Number.isNaN(numericId)) notFound();

  const thread = await getSwapThread(numericId);
  if (!thread) notFound();

  const { request: swap, messages, viewerId } = thread;
  const viewer = swap.role === "incoming" ? swap.host : swap.guest;
  const status = STATUS_META[swap.status];
  const firstName = swap.counterpart.name.split(" ")[0];
  const open = swap.status === "pending" || swap.status === "accepted";

  return (
    <main className="min-h-screen bg-bg text-fg">
      <Navigation />

      <div className="mx-auto max-w-3xl px-4 pb-14 pt-6 sm:px-6 lg:pb-20 lg:pt-8">
        <Link href="/swaps" className="text-sm font-medium text-accent hover:underline">
          ← All my swaps
        </Link>

        {/* What this conversation is about, kept at the top of the page so
            neither side has to remember the terms while they talk (recognition
            over recall, Nielsen #7). */}
        <section className="mt-4 rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-start gap-4">
            {swap.house.image ? (
              <Image
                src={swap.house.image}
                alt=""
                width={128}
                height={96}
                sizes="128px"
                className="hidden h-24 w-32 shrink-0 rounded-xl object-cover sm:block"
              />
            ) : null}

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {swap.role === "incoming" ? "Request for your home" : "Your request"}
              </p>
              <h1 className="mt-1 text-2xl font-bold">
                {swap.house.id ? (
                  <Link href={`/explore/${swap.house.id}`} className="hover:underline">
                    {swap.house.name}
                  </Link>
                ) : (
                  swap.house.name
                )}
              </h1>
              <p className="mt-0.5 text-sm text-muted">
                {[swap.house.location, swap.house.country].filter(Boolean).join(", ")}
              </p>

              <p
                className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                  status.tone === "success"
                    ? "border-success/40 bg-success/10 text-success"
                    : status.tone === "brand"
                      ? "border-brand/40 bg-brand/10 text-accent"
                      : "border-border bg-bg text-muted"
                }`}
              >
                <span aria-hidden>{status.glyph}</span>
                {status.label}
              </p>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
            <Field term="Dates">
              {dateRange(swap.checkIn, swap.checkOut)} · {swap.nights} night
              {swap.nights === 1 ? "" : "s"}
            </Field>
            <Field term="Guests">
              {swap.guests} guest{swap.guests === 1 ? "" : "s"}
            </Field>
            <Field term={swap.role === "incoming" ? "Asked by" : "Host"}>
              <span className="flex items-center gap-2">
                <Avatar
                  name={swap.counterpart.name}
                  src={swap.counterpart.avatarUrl ?? undefined}
                  size={24}
                />
                {swap.counterpart.name}
              </span>
            </Field>
            {/* A swap has two sides, so the home offered back is a term of the
                deal, not a detail — and when there isn't one, saying so is more
                useful to a host deciding than leaving the row out. */}
            <Field term={swap.role === "incoming" ? "Offering you" : "You offered"}>
              {swap.offeredHouse ? (
                <Link
                  href={`/explore/${swap.offeredHouse.id}`}
                  className="text-accent hover:underline"
                >
                  {swap.offeredHouse.name}
                  {swap.offeredHouse.location ? ` — ${swap.offeredHouse.location}` : ""}
                </Link>
              ) : (
                <span className="text-muted">No home listed yet</span>
              )}
            </Field>
          </dl>

          {swap.message && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {swap.role === "incoming" ? `${firstName} wrote` : "Your note"}
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-fg">
                {swap.message}
              </p>
            </div>
          )}

          <SwapActions
            requestId={swap.id}
            role={swap.role}
            status={swap.status}
            counterpartName={swap.counterpart.name}
          />

          {/* What happens next, in the state you are actually in — the listing
              page promises these three steps, and this is where step two and
              three come true. */}
          {swap.status === "accepted" && (
            <p className="mt-4 rounded-xl border border-success/40 bg-success/10 px-3 py-3 text-sm leading-relaxed text-fg">
              Agreed. Use the conversation below to settle arrival times, keys and house rules —
              exact addresses are shared between the two of you here, not on the public listing.
            </p>
          )}

          {/* Once a swap is agreed, each side can review the home they stayed
              in — which is the other person's. The guest reviews the home they
              asked for; the host reviews the one that was offered back, when
              there was one. Neither can review their own, and the form
              enforces that too. */}
          {swap.status === "accepted" &&
            (swap.role === "sent" ? (
              <SwapReview house={swap.house} ownerId={swap.host.id} />
            ) : (
              swap.offeredHouse && (
                <SwapReview house={swap.offeredHouse} ownerId={swap.guest.id} />
              )
            ))}
          {swap.status === "pending" && swap.role === "sent" && (
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Nothing is committed yet. {firstName} can accept or decline, and you can withdraw at
              any time.
            </p>
          )}
        </section>

        <SwapThread
          requestId={swap.id}
          viewerId={viewerId}
          viewerName={viewer.name}
          viewerAvatarUrl={viewer.avatarUrl}
          counterpart={swap.counterpart}
          role={swap.role}
          initialMessages={messages}
          canWrite={open}
        />
      </div>

      <Footer />
    </main>
  );
}

function Field({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{term}</dt>
      <dd className="mt-1 text-fg">{children}</dd>
    </div>
  );
}
