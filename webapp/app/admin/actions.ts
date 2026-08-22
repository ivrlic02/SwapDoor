"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  estimateReadMinutes,
  SITE_KEYS,
  type Block,
  type HowItWorksContent,
} from "@/lib/cms-types";

// Every CMS write goes through one of these three actions.
//
// They are the *second* line of defence, not the only one: the RLS policies in
// supabase/cms.sql already refuse a write from anyone whose profile is not
// `role = 'admin'`, and that check runs inside the database where it cannot be
// skipped. The `requireAdmin` here exists to turn what would otherwise surface
// as an opaque PostgREST error into a sentence the editor can act on, and to
// avoid doing the work of a save that is going to be rejected anyway.

export type ActionResult = { ok: true; id?: number } | { ok: false; error: string };

export type PostInput = {
  /** Absent on a new post. */
  id?: number;
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  category: string;
  authorName: string;
  status: "draft" | "published";
  content: Block[];
};

async function requireAdmin() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured, so there is nothing to save to.");
  }
  const supabase = await createClient();
  const { data: admin } = await supabase.rpc("is_admin");
  if (admin !== true) throw new Error("You do not have permission to edit content.");
  return supabase;
}

/** Slugs are the post's public URL, so they are normalised here rather than
 *  trusted from the form — a slug with a space or a slash in it would produce a
 *  route that either 404s or silently shadows another one. */
function normaliseSlug(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    // Strip combining marks, so "Zagreb — čišćenje" becomes "zagreb-ciscenje"
    // rather than losing the accented letters entirely.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Drop blocks an editor added and then left empty. Saving them would publish
 *  a stray empty paragraph, and the renderer would have to guess. */
function cleanBlocks(blocks: Block[]): Block[] {
  return blocks.filter((b) => {
    switch (b.type) {
      case "heading":
      case "paragraph":
      case "quote":
      case "callout":
        return b.text.trim().length > 0;
      case "list":
        return b.items.some((i) => i.trim().length > 0);
      case "image":
        return b.src.trim().length > 0;
      case "gallery":
        return b.images.some((i) => i.src.trim().length > 0);
      case "video":
        return b.id.trim().length > 0;
      case "code":
        return b.code.trim().length > 0;
      case "listing":
        return b.houseId > 0;
      default:
        return true;
    }
  });
}

/** Refresh every route that can show a post. `/blog/[slug]` is revalidated as a
 *  page *type* rather than a single path, because a slug change makes two paths
 *  stale — the old one and the new one — and the old one is the easier to
 *  forget. */
function revalidateBlog() {
  revalidatePath("/blog");
  revalidatePath("/blog/[slug]", "page");
}

export async function savePost(input: PostInput): Promise<ActionResult> {
  let supabase;
  try {
    supabase = await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const slug = normaliseSlug(input.slug || input.title);
  if (!slug) return { ok: false, error: "Give the post a title before saving." };
  if (!input.title.trim()) return { ok: false, error: "Give the post a title before saving." };

  const content = cleanBlocks(input.content);

  const row = {
    slug,
    title: input.title.trim(),
    excerpt: input.excerpt.trim(),
    cover: input.cover.trim(),
    category: input.category,
    author_name: input.authorName.trim() || null,
    status: input.status,
    // Computed rather than typed in: a hand-entered reading time is one more
    // thing to forget to update after an edit, and it is never checked.
    read_minutes: estimateReadMinutes(content),
    content,
  };

  const query = input.id
    ? supabase.from("blog_posts").update(row).eq("id", input.id).select("id").single()
    : supabase.from("blog_posts").insert(row).select("id").single();

  const { data, error } = await query;

  if (error) {
    // 23505 is a unique violation, and `slug` is the only unique column — so
    // this is always "that URL is taken", which is worth saying plainly.
    if (error.code === "23505") {
      return { ok: false, error: `Another post already uses the URL /blog/${slug}` };
    }
    return { ok: false, error: error.message };
  }

  revalidateBlog();
  revalidatePath("/admin");
  return { ok: true, id: data.id as number };
}

export async function deletePost(id: number): Promise<ActionResult> {
  let supabase;
  try {
    supabase = await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateBlog();
  revalidatePath("/admin");
  return { ok: true };
}

/** Give every step a stable, readable, unique `key`.
 *
 *  The key is the anchor the sticky rail scrolls to (`#step-browse`), so it has
 *  to survive a save and must not collide. Deriving it from the title here —
 *  rather than minting an id in the browser — keeps anchors legible, and keeps
 *  an existing step's anchor unchanged when its title is only being reworded,
 *  because a step that already has a key keeps it. */
function normaliseSteps(steps: HowItWorksContent["steps"]): HowItWorksContent["steps"] {
  const used = new Set<string>();
  return steps.map((step, i) => {
    let key = step.key?.trim() || normaliseSlug(step.title) || `step-${i + 1}`;
    if (used.has(key)) {
      let n = 2;
      while (used.has(`${key}-${n}`)) n += 1;
      key = `${key}-${n}`;
    }
    used.add(key);
    return { ...step, key };
  });
}

export async function saveHowItWorks(content: HowItWorksContent): Promise<ActionResult> {
  let supabase;
  try {
    supabase = await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const { data: session } = await supabase.auth.getUser();
  const updatedBy = session.user?.id ?? null;

  // One upsert of four rows rather than four round trips, so the page can never
  // end up half-saved — the sections are read together and edited together.
  const rows = [
    { key: SITE_KEYS.hiwIntro, value: content.intro },
    { key: SITE_KEYS.hiwSteps, value: normaliseSteps(content.steps) },
    { key: SITE_KEYS.hiwTrust, value: content.trust },
    { key: SITE_KEYS.hiwFaq, value: content.faq },
  ].map((r) => ({ ...r, updated_by: updatedBy }));

  const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/how-it-works");
  revalidatePath("/admin/how-it-works");
  return { ok: true };
}
