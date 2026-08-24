// Pre-encode every photo the site can ask for, so no visitor is the one who pays.
//
//     node scripts/warm-images.mjs                          # warm production
//     node scripts/warm-images.mjs --site http://localhost:3000
//     node scripts/warm-images.mjs --dry-run                # list the URLs, fetch nothing
//     node scripts/warm-images.mjs --concurrency 4
//
// WHY THIS EXISTS
// ---------------
// next/image does not resize anything at build time. The first request for a
// given (photo, width, quality, format) is served by encoding it right then —
// download the 2400px master from Supabase Storage, decode it, resize, encode
// AVIF — and everyone after that is served the cached result from the edge.
//
// Measured against production on 2026-08-24:
//
//     w=1080 q=75   cold 1.39s   warm 0.17s    79 KB
//     w=1920 q=90   cold 1.78s   warm 0.17s   267 KB
//
// So the pipeline is not slow, it is COLD — and on a site that is opened a few
// times a day, by a grader or a usability tester or PageSpeed Insights, almost
// every request was the cold one. `minimumCacheTTL` in next.config.ts stops the
// entries expiring after four hours; this script makes sure they exist in the
// first place.
//
// Run it once after each deploy (the optimizer cache is keyed to the build). It
// takes about a minute, and it is the difference between a demo whose photos
// appear instantly and one that fades them in over a second and a half.
//
// SAFE TO RE-RUN. It only issues GETs; a URL that is already warm answers from
// the cache and costs nothing.
//
// It reads the photo list from Supabase rather than hard-coding one, because
// unlike scripts/seed-storage-media.mjs there is no self-reference to worry
// about: this wants whatever the site is serving *today*, member-created
// listings included.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at === -1 ? fallback : args[at + 1];
};
const DRY_RUN = args.includes("--dry-run");
const SITE = String(flag("site", "https://swap-door.vercel.app")).replace(/\/+$/, "");
const CONCURRENCY = Number(flag("concurrency", "6"));

// The widths and qualities the app actually asks for.
//
// These mirror `deviceSizes` / `imageSizes` / `qualities` in next.config.ts.
// Trimming those lists is what makes warming exhaustively affordable: with the
// framework defaults it would be 15 widths x 2 qualities per photo, and most of
// those renditions would never be requested by a real browser anyway.
const DEVICE_SIZES = [640, 828, 1080, 1440, 1920, 2048];
const IMAGE_SIZES = [64, 128, 256, 384];

// Listing photos are drawn at three scales: the card grid (q75), the detail
// mosaic and lightbox (q90), and the lightbox thumbnail strip (q75, fixed size
// so 1x/2x only). Warming every device width at both qualities covers all three
// plus whatever viewport a visitor turns up with.
const HOUSE_JOBS = [
  ...DEVICE_SIZES.map((w) => ({ w, q: 75 })),
  ...DEVICE_SIZES.map((w) => ({ w, q: 90 })),
  // The thumbnail strip: components/gallery.tsx draws these at a fixed 56px,
  // which next/image serves from the imageSizes ladder at 1x and 2x.
  { w: 64, q: 75 },
  { w: 128, q: 75 },
];

// Avatars are fixed-size too (26-96px), so they only ever need the small end.
const AVATAR_JOBS = IMAGE_SIZES.map((w) => ({ w, q: 75 }));

// AVIF is what next.config.ts serves first, so this is the header a real
// browser sends and the variant worth having cached. The WebP fallback is only
// reached by browsers old enough that they are not the ones being demoed to.
const ACCEPT = "image/avif,image/webp,image/apng,image/*,*/*;q=0.8";

// ---------------------------------------------------------------------------

function readEnv() {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) throw new Error(".env.local not found — see AI/project/Supabase-Setup.md");
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const at = line.indexOf("=");
    if (at === -1 || line.trimStart().startsWith("#")) continue;
    env[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY missing from .env.local");
  return { url, key };
}

async function restGet(api, key, pathAndQuery) {
  const res = await fetch(`${api}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`${pathAndQuery} -> HTTP ${res.status}`);
  return res.json();
}

const optimizerUrl = (src, w, q) =>
  `${SITE}/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${q}`;

// A small worker pool. Serial would take ten minutes; unbounded would have the
// optimizer encoding fifty images at once and time itself out.
async function pool(items, worker) {
  let cursor = 0;
  const runners = Array.from({ length: Math.max(1, CONCURRENCY) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      await worker(items[i], i);
    }
  });
  await Promise.all(runners);
}

async function main() {
  const { url: api, key } = readEnv();

  console.log(`Site:   ${SITE}`);
  console.log(`Source: ${api}\n`);

  const [houses, profiles] = await Promise.all([
    restGet(api, key, "houses?select=id,image,images"),
    restGet(api, key, "profiles?select=id,avatar_url&avatar_url=not.is.null"),
  ]);

  // `image` (the card hero) and `images[0]` (the gallery hero) are the same file
  // on every seeded home, but a member-created listing can still disagree, so
  // both are collected and de-duplicated.
  const housePhotos = new Set();
  for (const h of houses) {
    if (h.image) housePhotos.add(h.image);
    for (const src of h.images ?? []) if (src) housePhotos.add(src);
  }
  const avatars = new Set(profiles.map((p) => p.avatar_url).filter(Boolean));

  const jobs = [
    ...[...housePhotos].flatMap((src) => HOUSE_JOBS.map(({ w, q }) => optimizerUrl(src, w, q))),
    ...[...avatars].flatMap((src) => AVATAR_JOBS.map(({ w, q }) => optimizerUrl(src, w, q))),
  ];

  console.log(
    `${housePhotos.size} listing photos x ${HOUSE_JOBS.length} renditions` +
      ` + ${avatars.size} avatars x ${AVATAR_JOBS.length} = ${jobs.length} URLs\n`
  );

  if (DRY_RUN) {
    for (const url of jobs.slice(0, 8)) console.log(`  ${url}`);
    if (jobs.length > 8) console.log(`  ... and ${jobs.length - 8} more`);
    console.log("\nDry run — nothing fetched.");
    return;
  }

  const started = Date.now();
  let hit = 0;
  let miss = 0;
  let bytes = 0;
  const failures = [];

  await pool(jobs, async (url, i) => {
    const t0 = Date.now();
    try {
      const res = await fetch(url, { headers: { Accept: ACCEPT } });
      const body = await res.arrayBuffer();
      if (!res.ok) {
        failures.push(`HTTP ${res.status}  ${url}`);
        return;
      }
      bytes += body.byteLength;
      // Vercel reports whether it had to do the work. Locally the header is
      // absent, so anything slow is counted as a miss instead.
      const cache = res.headers.get("x-vercel-cache") ?? (Date.now() - t0 > 400 ? "MISS" : "HIT");
      if (cache === "HIT") hit++;
      else miss++;
    } catch (err) {
      failures.push(`${err.message}  ${url}`);
    }
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${jobs.length}`);
  });

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\nDone in ${secs}s`);
  console.log(`  already warm : ${hit}`);
  console.log(`  encoded now  : ${miss}`);
  console.log(`  transferred  : ${(bytes / 1024 / 1024).toFixed(1)} MB`);
  if (failures.length) {
    console.log(`\n${failures.length} failed:`);
    for (const f of failures.slice(0, 20)) console.log(`  ${f}`);
    process.exitCode = 1;
  } else {
    console.log("\nEvery rendition the site can ask for is now cached at the edge.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
