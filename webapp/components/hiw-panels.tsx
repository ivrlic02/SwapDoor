import Image from "next/image";
import type { House } from "@/lib/house-types";
import type { StepPanel } from "@/lib/cms-types";
import { Avatar } from "@/components/avatar";
import { BLUR_DATA_URL } from "@/lib/images";
import { CalendarIcon, KeyIcon, SearchIcon, ShieldCheckIcon, StarIcon } from "@/components/icons";

// The right-hand half of /how-it-works: one panel per step, showing the part of
// the product that step is about.
//
// The page used to explain four steps with four emoji, on a page whose readers
// include the two personas least likely to take a claim on faith — Sarah, who
// will not book what she cannot see, and Mateo and Elena, who abandon anything
// that looks complicated. Emoji plus a sentence is a promise; this is evidence.
//
// Everything here is built from the site's own tokens and, where it can be, the
// site's own components: the "listings" panel is the real <HouseCard>, drawing
// two real homes out of Supabase. The three panels that show private states (a
// message thread, an agreed swap, a completed review) are reconstructions —
// they have to be, because a signed-out visitor has no thread to show — but
// they are built from the same classes as the real screens rather than being
// screenshots, so a redesign carries them along instead of leaving them stale.

/** A "screen" the panel content sits in — the shared chrome for all five. */
function Screen({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-xl shadow-shade/20">
      {/* The window chrome — three dots and a URL — is a picture of a desktop
          browser. It is what says "this is a screenshot of the product" to
          someone reading on a laptop. On a phone the reader is not looking at
          a desktop browser, so the same bar illustrates a thing that is not in
          front of them, and spends 40px and the panel's most contrasty strip
          doing it (Nielsen #1 — match the real world the reader is actually
          in; #9 — nothing in a panel should compete with its content). The
          panel keeps its frame, and drops the costume. */}
      <div className="hidden items-center gap-2 border-b border-border bg-surface px-4 py-2.5 sm:flex">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
        </span>
        <span className="ml-1 truncate text-xs font-medium text-muted">{label}</span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

/** Step 1 — the search bar, drawn the way the hero draws it. */
function SearchPanel() {
  return (
    <Screen label="swapdoor.app/explore">
      <div className="flex flex-col gap-2 rounded-2xl border border-border-raised bg-surface-raised p-2 sm:flex-row sm:items-center sm:rounded-full">
        <Field label="Where" value="Kyoto, Japan" />
        <span className="hidden h-8 w-px bg-border-raised sm:block" />
        <Field label="When" value="12 – 26 Sep" />
        <span className="hidden h-8 w-px bg-border-raised sm:block" />
        <Field label="Guests" value="2 guests" />
        <span className="flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white sm:shrink-0">
          <SearchIcon className="h-4 w-4" />
          Search
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {["Entire home", "Workspace", "Pets welcome", "✓ Verified host"].map((f) => (
          <span
            key={f}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted"
          >
            {f}
          </span>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">Showing 6 of 10 homes</p>
    </Screen>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-1 flex-col px-4 py-1.5">
      <span className="text-xs font-semibold text-accent">{label}</span>
      <span className="truncate text-sm text-fg">{value}</span>
    </span>
  );
}

/** Step 1 (alternate) — real listing cards, read live from the database. */
function ListingsPanel({ houses }: { houses: House[] }) {
  if (houses.length === 0) return <SearchPanel />;

  return (
    <Screen label="swapdoor.app/explore">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {houses.slice(0, 2).map((house) => (
          <div
            key={house.id}
            className="overflow-hidden rounded-xl border border-border bg-surface"
          >
            <div className="relative aspect-[16/10] w-full">
              <Image
                src={house.image}
                alt={`${house.name} in ${house.location}`}
                fill
                loading="lazy"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                sizes="(max-width: 640px) 100vw, 240px"
                className="object-cover"
              />
              {house.verified && (
                <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
                  <span aria-hidden className="text-success">
                    ✓
                  </span>
                  Verified
                </span>
              )}
            </div>
            <div className="p-3">
              <p className="truncate text-xs text-muted">
                {house.location}, {house.country}
              </p>
              <p className="truncate text-sm font-semibold">{house.name}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                <StarIcon className="h-3.5 w-3.5 text-accent" />
                {house.reviewCount ? house.rating.toFixed(1) : "New"}
                <span className="text-muted/60">· up to {house.maxGuests} guests</span>
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">
        Two homes currently on SwapDoor — these are live listings, not mockups.
      </p>
    </Screen>
  );
}

/** Step 2 — the private thread a swap request opens. */
function MessagePanel() {
  return (
    <Screen label="swapdoor.app/swaps/1">
      <div className="flex items-center gap-3 border-b border-border pb-3">
        <Avatar name="Kenji Tanaka" size={36} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Kenji Tanaka</p>
          <p className="truncate text-xs text-muted">Kyoto Traditional Machiya · 12 – 26 Sep</p>
        </div>
        <span className="ml-auto shrink-0 rounded-full bg-selected/15 px-2.5 py-1 text-[11px] font-semibold text-selected">
          Awaiting reply
        </span>
      </div>

      <div className="space-y-3 pt-4">
        <Bubble mine>
          Hello! We are two adults, no pets, and we would swap our flat in Split for the same
          fortnight. Is there a desk with decent light?
        </Bubble>
        <Bubble>
          There is — it looks onto the courtyard. One thing: bin day is Tuesday and it matters
          here. Happy to send the house guide.
        </Bubble>
        <Bubble mine>That works for us. Shall we lock in the 12th?</Bubble>
      </div>
    </Screen>
  );
}

function Bubble({ children, mine = false }: { children: React.ReactNode; mine?: boolean }) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <p
        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
          mine
            ? "bg-brand/20 text-fg"
            : "border border-border bg-surface text-fg"
        }`}
      >
        {children}
      </p>
    </div>
  );
}

/** Step 3 — both sides confirming the same dates. */
function CalendarPanel() {
  return (
    <Screen label="swapdoor.app/swaps/1">
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <CalendarIcon className="h-4 w-4 text-accent" />
          The swap on the table
        </p>
        <dl className="mt-3 space-y-2.5 text-sm">
          <Row term="Dates" value="12 – 26 September 2026" />
          <Row term="You stay in" value="Kyoto Traditional Machiya" />
          <Row term="They stay in" value="Your flat in Split" />
          <Row term="Cost" value="Nothing — there is no payment step" />
        </dl>
      </div>

      <div className="mt-4 space-y-2">
        <Confirmed name="You" />
        <Confirmed name="Kenji" />
      </div>

      <p className="mt-4 rounded-xl border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-fg">
        <span aria-hidden className="mr-1.5 text-success">
          ✓
        </span>
        Both sides agreed. Either of you could have withdrawn until this moment.
      </p>
    </Screen>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-muted">{term}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function Confirmed({ name }: { name: string }) {
  return (
    <p className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
      <ShieldCheckIcon className="h-4 w-4 text-success" />
      <span className="font-medium">{name}</span>
      <span className="text-muted">confirmed these dates</span>
    </p>
  );
}

/** Step 4 — arrival, and the review that follows it. */
function KeysPanel() {
  return (
    <Screen label="swapdoor.app/profile">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/15 text-accent">
          <KeyIcon className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-semibold">Swap complete</p>
          <p className="text-xs text-muted">Kyoto · 12 – 26 September 2026</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2">
          <span className="flex gap-0.5" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <StarIcon key={i} className="h-4 w-4 text-accent" />
            ))}
          </span>
          <span className="text-sm font-semibold">5.0</span>
          <span className="text-xs text-muted">· review left by Kenji</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          &ldquo;They left the flat better than they found it and watered everything. Would swap
          again without hesitating.&rdquo;
        </p>
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs text-muted">
        <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        Three reviews like this, ninety days as a member, and a filled-in profile is what earns
        the ✓ Verified badge.
      </p>
    </Screen>
  );
}

export function StepPanelView({ kind, houses }: { kind: StepPanel; houses: House[] }) {
  switch (kind) {
    case "search":
      return <SearchPanel />;
    case "listings":
      return <ListingsPanel houses={houses} />;
    case "message":
      return <MessagePanel />;
    case "calendar":
      return <CalendarPanel />;
    case "keys":
      return <KeysPanel />;
    default:
      return <SearchPanel />;
  }
}
