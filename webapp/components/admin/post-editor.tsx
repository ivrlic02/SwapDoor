"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Select } from "@/components/select";
import { buttonClass } from "@/components/button";
import { TextField, TextArea, NumberField, FieldShell, ItemCard } from "@/components/admin/fields";
import { savePost, deletePost, type PostInput } from "@/app/admin/actions";
import {
  BLOCK_LABELS,
  BLOCK_TYPES,
  CATEGORIES,
  emptyBlock,
  estimateReadMinutes,
  type Block,
  type BlockType,
  type BlogPost,
  type CalloutTone,
} from "@/lib/cms-types";

// The blog post editor.
//
// It is a block editor rather than a rich-text box, which is the decision that
// shapes everything else here. A WYSIWYG would let an editor paste styled HTML
// out of Word and put type on the page that the design system has no rule for;
// a stack of typed blocks can only ever produce combinations the renderer
// already knows how to draw. The trade is that inserting a paragraph is a
// click on "Paragraph" instead of pressing Enter — acceptable for a blog
// publishing a few posts a month, and it is what keeps /blog looking like one
// publication.
//
// Everything is client state until Save. There is no autosave: a post is a
// document with a publish state, and silently persisting half a thought as the
// live version of a published page is worse than an explicit button.

type Draft = {
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  category: string;
  authorName: string;
  status: "draft" | "published";
  content: Block[];
};

/** The live preview of the URL under the title field. It mirrors
 *  `normaliseSlug` in app/admin/actions.ts, which is the one that actually
 *  decides — this exists so the editor can see the URL forming as they type
 *  rather than discovering it after a save (Nielsen #3, visibility of system
 *  status). The server remains the authority; if the two ever disagree, what
 *  gets stored is the server's answer. */
function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function PostEditor({ post }: { post: BlogPost | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [draft, setDraft] = useState<Draft>({
    slug: post?.slug ?? "",
    title: post?.title ?? "",
    excerpt: post?.excerpt ?? "",
    cover: post?.cover ?? "",
    category: post?.category ?? "travel",
    authorName: post?.author.name ?? "The SwapDoor Team",
    status: post?.status ?? "draft",
    content: post?.content ?? [],
  });

  // The slug follows the title until somebody edits it by hand. After that it
  // is theirs: a published post's URL must never change because a typo in the
  // headline was fixed.
  const [slugTouched, setSlugTouched] = useState(Boolean(post));

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setMessage(null);
  }

  function setTitle(value: string) {
    setDraft((d) => ({ ...d, title: value, slug: slugTouched ? d.slug : slugify(value) }));
    setMessage(null);
  }

  function updateBlock(index: number, next: Block) {
    setDraft((d) => ({ ...d, content: d.content.map((b, i) => (i === index ? next : b)) }));
  }

  function addBlock(type: BlockType) {
    setDraft((d) => ({ ...d, content: [...d.content, emptyBlock(type)] }));
  }

  function moveBlock(index: number, by: -1 | 1) {
    setDraft((d) => {
      const next = [...d.content];
      const target = index + by;
      if (target < 0 || target >= next.length) return d;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...d, content: next };
    });
  }

  function removeBlock(index: number) {
    setDraft((d) => ({ ...d, content: d.content.filter((_, i) => i !== index) }));
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const input: PostInput = { id: post?.id, ...draft };
      const result = await savePost(input);

      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      setMessage({
        tone: "ok",
        text:
          draft.status === "published"
            ? "Saved and live. It can take up to a minute to appear on /blog."
            : "Saved as a draft. It is not visible on the site.",
      });
      // A new post now has an id, so the editor must become the edit screen for
      // it — otherwise a second Save would insert a duplicate.
      if (!post && result.id) router.replace(`/admin/posts/${result.id}`);
      else router.refresh();
    });
  }

  function remove() {
    if (!post) return;
    startTransition(async () => {
      const result = await deletePost(post.id);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      router.push("/admin");
    });
  }

  const readMinutes = estimateReadMinutes(draft.content);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Header: identity on the left, the state of the document on the right. */}
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <Link href="/admin" className="text-sm text-muted transition hover:text-fg">
          ← All posts
        </Link>
        <span className="ml-auto flex flex-wrap items-center gap-3">
          {post && draft.status === "published" && (
            <Link
              href={`/blog/${post.slug}`}
              target="_blank"
              className="text-sm text-accent transition hover:text-brand"
            >
              View post ↗
            </Link>
          )}
          <div className="w-40">
            <Select
              value={draft.status}
              onChange={(v) => set("status", v as Draft["status"])}
              ariaLabel="Publication status"
              options={[
                { value: "draft", label: "Draft", hint: "Only visible here" },
                { value: "published", label: "Published", hint: "Live on /blog" },
              ]}
            />
          </div>
          <button type="button" onClick={save} disabled={pending} className={buttonClass("primary")}>
            {pending ? "Saving…" : "Save"}
          </button>
        </span>
      </div>

      {message && (
        <p
          role="status"
          className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
            message.tone === "ok"
              ? "border-success/40 bg-success/10 text-fg"
              : "border-danger/40 bg-danger/10 text-fg"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Body */}
        <div className="order-2 space-y-4 lg:order-1">
          <div className="rounded-xl border border-border bg-surface p-4">
            <TextArea
              label="Title"
              value={draft.title}
              onChange={setTitle}
              rows={2}
              placeholder="What is the post called?"
            />
          </div>

          {draft.content.length === 0 && (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
              No content yet. Add a block below to start writing.
            </p>
          )}

          {draft.content.map((block, i) => (
            <ItemCard
              key={i}
              title={BLOCK_LABELS[block.type]}
              canUp={i > 0}
              canDown={i < draft.content.length - 1}
              onUp={() => moveBlock(i, -1)}
              onDown={() => moveBlock(i, 1)}
              onRemove={() => removeBlock(i)}
            >
              <BlockFields block={block} onChange={(b) => updateBlock(i, b)} />
            </ItemCard>
          ))}

          {/* Add-block menu. Every type is one click away rather than hidden
              behind a dropdown — ten targets shown at once is well inside what
              a person scans comfortably, and recognition beats recall (#7). */}
          <div className="rounded-xl border border-dashed border-border p-4">
            <p className="mb-3 text-xs font-semibold text-muted">Add a block</p>
            <div className="flex flex-wrap gap-2">
              {BLOCK_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addBlock(type)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-brand hover:text-fg"
                >
                  + {BLOCK_LABELS[type]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Meta sidebar */}
        <aside className="order-1 space-y-4 lg:order-2">
          <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
            <TextField
              label="URL"
              value={draft.slug}
              onChange={(v) => {
                setSlugTouched(true);
                set("slug", v);
              }}
              placeholder="how-to-prepare-your-home"
              hint={`/blog/${draft.slug || "…"}`}
              mono
            />

            <FieldShell label="Category">
              <Select
                value={draft.category}
                onChange={(v) => set("category", String(v))}
                ariaLabel="Category"
                options={CATEGORIES.map((c) => ({ value: c.slug, label: c.label }))}
              />
            </FieldShell>

            <TextField
              label="Author byline"
              value={draft.authorName}
              onChange={(v) => set("authorName", v)}
              hint="Shown on the card and the post. Use a member's exact name to pick up their photo."
            />
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
            <TextArea
              label="Excerpt"
              value={draft.excerpt}
              onChange={(v) => set("excerpt", v)}
              rows={4}
              hint="One or two sentences. Used on the blog list and as the link preview."
            />
            <TextField
              label="Cover image URL"
              value={draft.cover}
              onChange={(v) => set("cover", v)}
              placeholder="https://images.unsplash.com/photo-…"
              hint="Unsplash or a Supabase Storage URL. Sizing is added automatically."
              mono
            />
          </div>

          <div className="rounded-xl border border-border bg-surface p-4 text-xs text-muted">
            <p>
              <span className="font-semibold text-fg">{readMinutes} min</span> read · calculated
              from the blocks, saved with the post.
            </p>
          </div>

          {post && (
            <div className="rounded-xl border border-danger/30 bg-surface p-4">
              <p className="mb-3 text-xs font-semibold text-muted">Danger zone</p>
              {/* Confirms in place rather than in a browser dialog, matching
                  the Unlist button on /my-listings — one pattern for
                  "irreversible, are you sure" across the whole site. */}
              {confirmDelete ? (
                <div className="space-y-2">
                  <p className="text-sm text-fg">Delete this post permanently?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={remove}
                      disabled={pending}
                      className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                    >
                      Yes, delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-fg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="text-sm text-danger transition hover:underline"
                >
                  Delete post
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

const INLINE_HINT = "**bold**, *italic*, `code`, [link](/explore)";

function BlockFields({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  switch (block.type) {
    case "heading":
      return (
        <TextField
          label="Heading"
          value={block.text}
          onChange={(text) => onChange({ ...block, text })}
        />
      );

    case "paragraph":
      return (
        <TextArea
          label="Text"
          value={block.text}
          onChange={(text) => onChange({ ...block, text })}
          rows={5}
          hint={INLINE_HINT}
        />
      );

    case "list":
      return (
        <>
          <FieldShell label="Style">
            <Select
              value={block.ordered ? "ordered" : "bulleted"}
              onChange={(v) => onChange({ ...block, ordered: v === "ordered" })}
              ariaLabel="List style"
              options={[
                { value: "bulleted", label: "Bulleted" },
                { value: "ordered", label: "Numbered" },
              ]}
            />
          </FieldShell>
          <TextArea
            label="Items"
            value={block.items.join("\n")}
            onChange={(v) => onChange({ ...block, items: v.split("\n") })}
            rows={6}
            hint="One item per line. Empty lines are dropped when you save."
          />
        </>
      );

    case "image":
      return (
        <>
          <TextField
            label="Image URL"
            value={block.src}
            onChange={(src) => onChange({ ...block, src })}
            mono
          />
          <TextField
            label="Alt text"
            value={block.alt}
            onChange={(alt) => onChange({ ...block, alt })}
            hint="What the picture shows, for anyone who cannot see it. Required."
          />
          <TextField
            label="Caption (optional)"
            value={block.caption ?? ""}
            onChange={(caption) => onChange({ ...block, caption })}
          />
        </>
      );

    case "gallery":
      return (
        <>
          <TextArea
            label="Image URLs"
            value={block.images.map((i) => i.src).join("\n")}
            onChange={(v) => {
              const urls = v.split("\n");
              onChange({
                ...block,
                images: urls.map((src, i) => ({ src, alt: block.images[i]?.alt ?? "" })),
              });
            }}
            rows={4}
            hint="One URL per line."
            mono
          />
          <TextArea
            label="Alt text, in the same order"
            value={block.images.map((i) => i.alt).join("\n")}
            onChange={(v) => {
              const alts = v.split("\n");
              onChange({
                ...block,
                images: block.images.map((img, i) => ({ ...img, alt: alts[i] ?? "" })),
              });
            }}
            rows={4}
          />
          <TextField
            label="Caption (optional)"
            value={block.caption ?? ""}
            onChange={(caption) => onChange({ ...block, caption })}
          />
        </>
      );

    case "quote":
      return (
        <>
          <TextArea
            label="Quote"
            value={block.text}
            onChange={(text) => onChange({ ...block, text })}
            rows={3}
          />
          <TextField
            label="Attribution (optional)"
            value={block.attribution ?? ""}
            onChange={(attribution) => onChange({ ...block, attribution })}
            placeholder="Sarah Miller, host in Minneapolis"
          />
        </>
      );

    case "callout":
      return (
        <>
          <FieldShell label="Tone">
            <Select
              value={block.tone}
              onChange={(v) => onChange({ ...block, tone: v as CalloutTone })}
              ariaLabel="Callout tone"
              options={[
                { value: "tip", label: "Tip", hint: "Blue — useful advice" },
                { value: "note", label: "Note", hint: "Neutral — an aside" },
                { value: "warning", label: "Worth checking", hint: "Amber — do this first" },
              ]}
            />
          </FieldShell>
          <TextField
            label="Title (optional)"
            value={block.title ?? ""}
            onChange={(title) => onChange({ ...block, title })}
            hint="Leave empty to use the tone name."
          />
          <TextArea
            label="Text"
            value={block.text}
            onChange={(text) => onChange({ ...block, text })}
            rows={3}
            hint={INLINE_HINT}
          />
        </>
      );

    case "video":
      return (
        <>
          <TextField
            label="YouTube video ID"
            value={block.id}
            onChange={(id) => onChange({ ...block, id: extractYouTubeId(id) })}
            placeholder="juhnkCSr0zo"
            hint="Paste the whole YouTube link if you like — the ID is pulled out of it."
            mono
          />
          <TextField
            label="Title"
            value={block.title}
            onChange={(title) => onChange({ ...block, title })}
            hint="Shown over the poster frame and read out by screen readers."
          />
          <TextField
            label="Caption (optional)"
            value={block.caption ?? ""}
            onChange={(caption) => onChange({ ...block, caption })}
          />
        </>
      );

    case "code":
      return (
        <>
          {/* Collapsed is the default for a new snippet, on purpose: a code
              block on a blog is evidence for something the prose has already
              said in words. If it is the only place a fact appears, the fact
              is in the wrong place. */}
          <FieldShell label="Display">
            <Select
              value={block.collapsed === false ? "open" : "collapsed"}
              onChange={(v) => onChange({ ...block, collapsed: v !== "open" })}
              ariaLabel="Code block display"
              options={[
                { value: "collapsed", label: "Collapsed — behind a “Show the code” line" },
                { value: "open", label: "Always open" },
              ]}
            />
          </FieldShell>
          <TextField
            label="Language"
            value={block.language}
            onChange={(language) => onChange({ ...block, language })}
            hint="sql, ts, tsx, js or bash — anything else renders unhighlighted."
          />
          <TextArea
            label="Code"
            value={block.code}
            onChange={(code) => onChange({ ...block, code })}
            rows={10}
            mono
          />
          <TextField
            label="Caption (optional)"
            value={block.caption ?? ""}
            onChange={(caption) => onChange({ ...block, caption })}
          />
        </>
      );

    case "listing":
      return (
        <>
          <NumberField
            label="Home ID"
            value={block.houseId}
            onChange={(houseId) => onChange({ ...block, houseId })}
            hint="The number in the listing's URL, e.g. 6 for /explore/6. The card is drawn from live data."
          />
          <TextField
            label="Note (optional)"
            value={block.note ?? ""}
            onChange={(note) => onChange({ ...block, note })}
            placeholder="Why this home is worth a look"
          />
        </>
      );

    default:
      return null;
  }
}

/** Accept a full YouTube URL as well as a bare id, because pasting the link is
 *  what anyone will actually do. */
function extractYouTubeId(raw: string): string {
  const input = raw.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const match = input.match(p);
    if (match) return match[1];
  }
  return input;
}
