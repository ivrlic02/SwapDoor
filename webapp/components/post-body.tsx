import Image from "next/image";
import Link from "next/link";
import { getHouseById } from "@/lib/houses";
import { BLUR_DATA_URL } from "@/lib/images";
import { renderInline } from "@/lib/inline";
import type { Block, CalloutTone } from "@/lib/cms-types";
import { VideoEmbed } from "@/components/video-embed";
import { CodeBlock } from "@/components/code-block";
import { AlertIcon, ArrowRightIcon, InfoIcon, LightbulbIcon, StarIcon } from "@/components/icons";

// The one renderer every blog post goes through. A post cannot introduce a
// style the site does not already have, because there is nowhere for it to put
// one — CRAP *Repetition* (Lecture 5) held in place by architecture.
//
// Two typographic decisions are made here, and both fix real defects in the
// previous hand-rolled renderer in app/blog/[slug]/page.tsx:
//
// 1. MEASURE. Body copy is capped at 66 characters, not at the container. The
//    old page set 18px text inside `max-w-3xl` (768px), which runs to roughly
//    95 characters a line — well past the 60–75 where the eye reliably finds
//    the start of the next line. Media is deliberately allowed to be wider than
//    the text column, which is also what makes the column read as a column.
//
// 2. PROXIMITY. The old renderer put every block in one `gap-6` flex column and
//    gave headings `mt-4`, so a heading ended up *closer to the paragraph above
//    it* than to the text it introduced — the textbook proximity failure from
//    Lecture 5, on the element whose entire job is to group what follows.
//    Spacing is now per-block: a heading takes a large space above and a small
//    one below, so it belongs to its own section on sight.

/** Text column: everything the reader reads in sequence sits at 66ch. */
function Prose({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[66ch]">{children}</div>;
}

const CALLOUT_STYLES: Record<
  CalloutTone,
  { icon: typeof LightbulbIcon; ring: string; tint: string; label: string }
> = {
  tip: { icon: LightbulbIcon, ring: "border-accent/40", tint: "text-accent", label: "Tip" },
  note: { icon: InfoIcon, ring: "border-border", tint: "text-muted", label: "Note" },
  warning: { icon: AlertIcon, ring: "border-selected/50", tint: "text-selected", label: "Worth checking" },
};

function Callout({ tone, title, text }: { tone: CalloutTone; title?: string; text: string }) {
  const style = CALLOUT_STYLES[tone] ?? CALLOUT_STYLES.note;
  const Glyph = style.icon;
  return (
    <Prose>
      <aside className={`my-10 rounded-2xl border ${style.ring} bg-surface p-5`}>
        <p className={`mb-2 flex items-center gap-2 text-sm font-semibold ${style.tint}`}>
          <Glyph className="h-5 w-5 shrink-0" />
          {/* The tone is named in words as well as drawn in colour — a reader
              who cannot separate the amber from the blue still gets the
              distinction (Lecture 6: never signal by colour alone). */}
          {title || style.label}
        </p>
        <p className="text-[0.975rem] leading-relaxed text-muted">{renderInline(text)}</p>
      </aside>
    </Prose>
  );
}

/** A real listing, read live from `houses` at render time.
 *
 *  Deliberately a live read rather than details copied into the post: a home
 *  mentioned in an article is the one thing on the page most likely to change
 *  after publication, and a stale price or a delisted home in an editorial
 *  recommendation is worse than no recommendation. If the home is gone, the
 *  block renders nothing and the prose closes over the gap. */
async function ListingBlock({ houseId, note }: { houseId: number; note?: string }) {
  const house = await getHouseById(houseId);
  if (!house) return null;

  return (
    <div className="my-10">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent">
        A home from SwapDoor
      </p>
      <Link
        href={`/explore/${house.id}`}
        className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-brand sm:flex-row"
      >
        <div className="relative h-48 w-full shrink-0 sm:h-auto sm:w-52">
          <Image
            src={house.image}
            alt={`${house.name} in ${house.location}, ${house.country}`}
            fill
            sizes="(max-width: 640px) 100vw, 208px"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="object-cover"
          />
        </div>
        <div className="flex flex-1 flex-col justify-center gap-1 p-5">
          <p className="text-sm text-muted">
            {house.location}, {house.country}
          </p>
          <h3 className="text-lg font-semibold transition group-hover:text-accent">{house.name}</h3>
          {house.reviewCount ? (
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <StarIcon className="h-4 w-4 text-accent" />
              {house.rating.toFixed(1)}
              <span className="text-muted/70">· {house.reviewCount} reviews</span>
            </p>
          ) : (
            <p className="text-sm text-muted">Newly listed</p>
          )}
          {note && <p className="mt-1 text-sm italic text-muted">{note}</p>}
          <span className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-accent">
            View this home
            <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </div>
  );
}

function BlockView({ block, index }: { block: Block; index: number }) {
  switch (block.type) {
    case "heading":
      return (
        <Prose>
          {/* mt-14 / mb-3: the gap above a heading is roughly four times the gap
              below it, so the heading visibly belongs to what follows. */}
          <h2 className="mt-14 mb-3 scroll-mt-28 text-2xl font-bold first:mt-0">
            {block.text}
          </h2>
        </Prose>
      );

    case "paragraph":
      return (
        <Prose>
          <p className="mb-6 text-[1.0625rem] leading-[1.75] text-fg/90">
            {renderInline(block.text)}
          </p>
        </Prose>
      );

    case "list": {
      const items = block.items.filter((i) => i.trim().length > 0);
      if (items.length === 0) return null;
      const List = block.ordered ? "ol" : "ul";
      return (
        <Prose>
          <List
            className={`mb-6 space-y-2 pl-5 text-[1.0625rem] leading-[1.75] text-fg/90 ${
              block.ordered ? "list-decimal marker:text-accent" : "list-disc marker:text-accent"
            }`}
          >
            {items.map((item, i) => (
              <li key={i} className="pl-1">
                {renderInline(item)}
              </li>
            ))}
          </List>
        </Prose>
      );
    }

    case "image":
      if (!block.src) return null;
      return (
        <figure className="my-10">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl">
            <Image
              src={block.src}
              alt={block.alt}
              fill
              // The first media block on a post is usually above the fold on a
              // phone; everything after it can wait.
              loading={index < 2 ? "eager" : "lazy"}
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
          {block.caption && (
            <figcaption className="mt-3 text-center text-sm text-muted">{block.caption}</figcaption>
          )}
        </figure>
      );

    case "gallery": {
      const images = block.images.filter((i) => i.src);
      if (images.length === 0) return null;
      return (
        <figure className="my-10">
          <div className={`grid gap-3 ${images.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {images.map((img, i) => (
              <div key={i} className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  sizes="(max-width: 640px) 100vw, 380px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
          {block.caption && (
            <figcaption className="mt-3 text-center text-sm text-muted">{block.caption}</figcaption>
          )}
        </figure>
      );
    }

    case "quote":
      return (
        <Prose>
          <blockquote className="my-10 border-l-2 border-accent pl-6">
            <p className="text-xl leading-relaxed text-fg italic">{block.text}</p>
            {block.attribution && (
              <footer className="mt-3 text-sm not-italic text-muted">— {block.attribution}</footer>
            )}
          </blockquote>
        </Prose>
      );

    case "callout":
      return <Callout tone={block.tone} title={block.title} text={block.text} />;

    case "video":
      if (!block.id) return null;
      return <VideoEmbed id={block.id} title={block.title} caption={block.caption} />;

    case "code":
      if (!block.code.trim()) return null;
      return (
        <CodeBlock
          code={block.code}
          language={block.language}
          caption={block.caption}
          collapsed={block.collapsed}
        />
      );

    case "listing":
      if (!block.houseId) return null;
      return <ListingBlock houseId={block.houseId} note={block.note} />;

    default:
      return null;
  }
}

export function PostBody({ blocks }: { blocks: Block[] }) {
  return (
    <div>
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} index={i} />
      ))}
    </div>
  );
}
