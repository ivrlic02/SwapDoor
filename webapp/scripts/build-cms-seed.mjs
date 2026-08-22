// Turns lib/cms-seed.json into supabase/seed-cms.sql.
//
//   node scripts/build-cms-seed.mjs
//
// Same pattern as scripts/build-places-seed.mjs: the SQL is generated rather
// than hand-maintained, so the seed and the app-level fallback in
// lib/cms-defaults.ts can never disagree — they are the same file.
//
// Run supabase/cms.sql first (it creates the tables), then the file this
// writes. Both are safe to re-run: posts upsert on `slug`, sections on `key`.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const seed = JSON.parse(readFileSync(join(root, "lib/cms-seed.json"), "utf8"));

/** Single-quoted SQL literal. */
const q = (value) => (value == null ? "null" : `'${String(value).replace(/'/g, "''")}'`);

/** jsonb literal, dollar-quoted so the JSON's own quotes and backslashes pass
 *  through untouched. The tag is `$cms$` rather than `$$` precisely because
 *  some of the seeded code blocks contain `$$` (they quote PL/pgSQL bodies). */
const json = (value) => `$cms$${JSON.stringify(value)}$cms$::jsonb`;

/** Mirror of `estimateReadMinutes` in lib/cms-types.ts.
 *
 *  Duplicated rather than imported because this is a plain .mjs script and the
 *  original is TypeScript. If the estimate is ever changed there, change it
 *  here too — or simply re-run this script and re-seed, since the app recomputes
 *  the value anyway whenever the stored one is missing. */
function estimateReadMinutes(blocks) {
  let words = 0;
  let media = 0;
  const count = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;

  for (const b of blocks) {
    switch (b.type) {
      case "heading":
      case "paragraph":
      case "quote":
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

const lines = [];

lines.push("-- ============================================================================");
lines.push("-- SwapDoor — CMS seed content");
lines.push("--");
lines.push("-- GENERATED FILE. Do not edit by hand: run");
lines.push("--     node scripts/build-cms-seed.mjs");
lines.push("-- after changing lib/cms-seed.json.");
lines.push("--");
lines.push("-- Run supabase/cms.sql first. Safe to re-run: posts upsert on `slug`,");
lines.push("-- sections upsert on `key`.");
lines.push("--");
lines.push("-- `author_id` is resolved by matching `profiles.full_name`, so a post by a");
lines.push("-- demo host picks up that member's photo and bio. A byline with no matching");
lines.push("-- profile (e.g. 'The SwapDoor Team') simply leaves author_id null and shows");
lines.push("-- `author_name` — which is why both columns exist.");
lines.push("-- ============================================================================");
lines.push("");

lines.push("-- ---------------------------------------------------------------------------");
lines.push("-- Blog posts");
lines.push("-- ---------------------------------------------------------------------------");
lines.push("");

for (const post of seed.posts) {
  const readMinutes = estimateReadMinutes(post.content);
  lines.push(`-- ${post.title}`);
  lines.push("insert into public.blog_posts");
  lines.push(
    "  (slug, title, excerpt, cover, category, author_id, author_name, status, published_at, read_minutes, content)",
  );
  lines.push("values (");
  lines.push(`  ${q(post.slug)},`);
  lines.push(`  ${q(post.title)},`);
  lines.push(`  ${q(post.excerpt)},`);
  lines.push(`  ${q(post.cover)},`);
  lines.push(`  ${q(post.category)},`);
  lines.push(`  (select id from public.profiles where full_name = ${q(post.author)} limit 1),`);
  lines.push(`  ${q(post.author)},`);
  lines.push(`  ${q(post.status)},`);
  lines.push(`  ${q(`${post.date}T09:00:00+00`)},`);
  lines.push(`  ${readMinutes},`);
  lines.push(`  ${json(post.content)}`);
  lines.push(")");
  lines.push("on conflict (slug) do update set");
  lines.push("  title        = excluded.title,");
  lines.push("  excerpt      = excluded.excerpt,");
  lines.push("  cover        = excluded.cover,");
  lines.push("  category     = excluded.category,");
  lines.push("  author_id    = excluded.author_id,");
  lines.push("  author_name  = excluded.author_name,");
  lines.push("  status       = excluded.status,");
  lines.push("  published_at = excluded.published_at,");
  lines.push("  read_minutes = excluded.read_minutes,");
  lines.push("  content      = excluded.content;");
  lines.push("");
}

lines.push("-- ---------------------------------------------------------------------------");
lines.push("-- How it Works sections");
lines.push("-- ---------------------------------------------------------------------------");
lines.push("");

const sections = [
  ["how_it_works.intro", seed.howItWorks.intro],
  ["how_it_works.steps", seed.howItWorks.steps],
  ["how_it_works.trust", seed.howItWorks.trust],
  ["how_it_works.faq", seed.howItWorks.faq],
];

for (const [key, value] of sections) {
  lines.push(`insert into public.site_content (key, value)`);
  lines.push(`values (${q(key)}, ${json(value)})`);
  lines.push("on conflict (key) do update set value = excluded.value, updated_at = now();");
  lines.push("");
}

const out = join(root, "supabase/seed-cms.sql");
writeFileSync(out, lines.join("\n"), "utf8");

console.log(
  `Wrote ${out}\n  ${seed.posts.length} posts, ${sections.length} site_content sections`,
);
