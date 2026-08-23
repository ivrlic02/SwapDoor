// Client-safe CMS types — the *shape* of everything the Blog and How it Works
// pages read out of Supabase. No server imports here (same rule as
// `lib/house-types.ts`), so the admin editor and the public pages can both
// import these without pulling `next/headers` into a Client Component.
//
// Why a block model rather than one big HTML/markdown field:
//   * The course brief asks for posts carrying "images, videos, code snippets"
//     (Overview §5). A typed block union makes each of those a first-class
//     thing an editor can add from a menu, instead of hand-written HTML.
//   * Every block renders through one component (`components/post-body.tsx`),
//     so a post can never introduce a style the rest of the site does not have —
//     CRAP *Repetition* (Lecture 5) enforced in code, not by convention.
//   * Storing it as `jsonb` means adding a block type later is a TypeScript
//     change plus an admin menu entry; no migration.

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

/** Tone of a callout box. Each maps to an icon + border colour in the renderer. */
export type CalloutTone = "tip" | "note" | "warning";

export type Block =
  | { type: "heading"; text: string }
  /** Body copy. Supports the small inline syntax handled by `lib/inline.tsx`. */
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "image"; src: string; alt: string; caption?: string }
  | { type: "gallery"; images: { src: string; alt: string }[]; caption?: string }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "callout"; tone: CalloutTone; title?: string; text: string }
  /** A YouTube embed. `id` is the 11-character video id, not a full URL. */
  | { type: "video"; provider: "youtube"; id: string; title: string; caption?: string }
  /** A code snippet.
   *
   *  `collapsed` ships it closed, behind a one-line disclosure. It exists
   *  because a snippet is *evidence*, not prose: when the substance of a
   *  passage is inside the code, the reader has been asked to parse a language
   *  to learn something the page could simply have told them (Nielsen #1 —
   *  speak the user's language, not the system's). The rule is now: say it in
   *  words, and let the code sit underneath for whoever wants to check it. */
  | { type: "code"; language: string; code: string; caption?: string; collapsed?: boolean }
  /** Renders a real listing card, read live from `houses` at request time. */
  | { type: "listing"; houseId: number; note?: string };

export type BlockType = Block["type"];

/** The order blocks appear in the admin "Add block" menu. */
export const BLOCK_TYPES: BlockType[] = [
  "paragraph",
  "heading",
  "list",
  "image",
  "gallery",
  "quote",
  "callout",
  "video",
  "code",
  "listing",
];

/** Human labels for the admin menu — the editor never shows a raw type name. */
export const BLOCK_LABELS: Record<BlockType, string> = {
  paragraph: "Paragraph",
  heading: "Heading",
  list: "List",
  image: "Image",
  gallery: "Gallery",
  quote: "Quote",
  callout: "Callout",
  video: "Video (YouTube)",
  code: "Code snippet",
  listing: "Home from the site",
};

/** A new block of each type, so "Add block" inserts something already valid. */
export function emptyBlock(type: BlockType): Block {
  switch (type) {
    case "heading":
      return { type: "heading", text: "" };
    case "list":
      return { type: "list", ordered: false, items: [""] };
    case "image":
      return { type: "image", src: "", alt: "" };
    case "gallery":
      return { type: "gallery", images: [{ src: "", alt: "" }] };
    case "quote":
      return { type: "quote", text: "" };
    case "callout":
      return { type: "callout", tone: "tip", text: "" };
    case "video":
      return { type: "video", provider: "youtube", id: "", title: "" };
    case "code":
      return { type: "code", language: "ts", code: "", collapsed: true };
    case "listing":
      return { type: "listing", houseId: 0 };
    default:
      return { type: "paragraph", text: "" };
  }
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

/** Post categories. A closed set, mirrored by a CHECK in `supabase/cms.sql`.
 *  The filter row on /blog is only useful while it stays short enough to scan
 *  in one glance (Hick law, Lecture 3), so this is deliberately a fixed list
 *  rather than a free-text tag field an editor can grow without limit. */
export const CATEGORIES = [
  { slug: "travel", label: "Travel" },
  { slug: "hosting", label: "Hosting" },
  { slug: "trust", label: "Trust & safety" },
  { slug: "guides", label: "Guides" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export function categoryLabel(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

export type PostStatus = "draft" | "published";

/** The author line on a post. Either a real member profile (joined from
 *  `profiles`) or a plain name for house accounts like "The SwapDoor Team". */
export type PostAuthor = {
  name: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
};

export type BlogPost = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  category: CategorySlug;
  author: PostAuthor;
  /** ISO date. On a draft this is the date it *will* carry once published. */
  date: string;
  status: PostStatus;
  readMinutes: number;
  content: Block[];
};

/** Rough reading time, so an editor never has to compute it by hand.
 *  200 wpm is the usual prose estimate; media blocks get a flat allowance. */
export function estimateReadMinutes(blocks: Block[]): number {
  let words = 0;
  let media = 0;
  const count = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

  for (const b of blocks) {
    switch (b.type) {
      case "heading":
      case "paragraph":
      case "quote":
        words += count(b.text);
        break;
      case "callout":
        words += count(b.text);
        break;
      case "list":
        words += count(b.items.join(" "));
        break;
      case "code":
        words += b.code.split("\n").length * 4;
        break;
      case "image":
      case "gallery":
      case "video":
      case "listing":
        media += 1;
        break;
    }
  }
  return Math.max(1, Math.round(words / 200 + media * 0.2));
}

// ---------------------------------------------------------------------------
// Site content (the How it Works page)
// ---------------------------------------------------------------------------

/** Which product visual a How-it-Works step shows beside its copy.
 *
 *  The split is deliberate: the CMS owns the *words* (title, body, link), the
 *  codebase owns the *picture*, because the picture is a live slice of the real
 *  interface — a real listing card, a real message thread — not an uploaded
 *  screenshot that silently goes stale the next time the UI changes. An editor
 *  picks one of these from a dropdown; they cannot invent a new one without a
 *  developer, which is the correct constraint. */
export const STEP_PANELS = ["search", "listings", "message", "calendar", "keys"] as const;
export type StepPanel = (typeof STEP_PANELS)[number];

export const PANEL_LABELS: Record<StepPanel, string> = {
  search: "Search bar",
  listings: "Listing cards",
  message: "Message thread",
  calendar: "Dates + agreement",
  keys: "Keys / arrival",
};

export type HowItWorksStep = {
  /** Stable id, used as the anchor the sticky rail scrolls to. */
  key: string;
  title: string;
  body: string;
  panel: StepPanel;
  ctaLabel?: string;
  ctaHref?: string;
};

export type TrustCard = { icon: string; title: string; body: string };

export type FaqItem = { group: string; q: string; a: string };

export type HowItWorksIntro = { eyebrow: string; title: string; subtitle: string };

/** Everything `/how-it-works` reads. One key per section in `site_content`. */
export type HowItWorksContent = {
  intro: HowItWorksIntro;
  steps: HowItWorksStep[];
  trust: TrustCard[];
  faq: FaqItem[];
};

/** The `site_content.key` values this app knows about. Anything else in the
 *  table is ignored by the app — the column is plain text so a future section
 *  needs a constant here, not a migration. */
export const SITE_KEYS = {
  hiwIntro: "how_it_works.intro",
  hiwSteps: "how_it_works.steps",
  hiwTrust: "how_it_works.trust",
  hiwFaq: "how_it_works.faq",
} as const;
