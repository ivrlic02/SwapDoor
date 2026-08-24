// Move the demo media off Unsplash and into this project's own Supabase Storage.
//
//     node scripts/seed-storage-media.mjs            # upload + update the database
//     node scripts/seed-storage-media.mjs --dry-run  # download + report, write nothing
//
// WHY THIS EXISTS
// ---------------
// Until 2026-08-23 the ten seeded homes carried `images.unsplash.com` URLs and
// the seven demo hosts carried no picture at all (`profiles.avatar_url` was null
// for all of them, and the `avatars` bucket was empty). So the site's listing
// photos were hotlinked to a third party that has already removed five of them
// once — which is the whole reason `IMAGE_REPLACEMENTS` exists in lib/houses.ts —
// and every host rendered as an initials circle.
//
// This script copies each photo into the project's own buckets and repoints the
// database at them. Afterwards nothing on a listing page is fetched from a host
// this project does not control.
//
// The same discipline as scripts/build-places-seed.mjs: data that lives in the
// database should be reproducible from a command, not from a one-off nobody can
// repeat. It also writes supabase/seed-media.sql as the readable record of what
// it did, so the result can be re-applied from the SQL editor alone.
//
// SAFE TO RE-RUN. Every upload is an upsert onto a deterministic path, so a
// second run overwrites the same objects rather than accumulating orphans, and
// the URLs it writes back are identical.
//
// HOW IT AUTHENTICATES
// --------------------
// The Storage policies key on the *first folder segment* of an object's path
// being `auth.uid()` (see supabase/schema.sql), so a file can only be written
// into its owner's folder. Rather than reach for a service-role key, this signs
// in as each demo host with the shared password from supabase/seed-hosts.mjs and
// uploads their own media as them — which means the paths, the ownership and the
// RLS story are exactly the same as for a real member who uploads through the app.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY_RUN = process.argv.includes("--dry-run");

// Shared demo password for every seeded host account (supabase/seed-hosts.mjs).
const HOST_PASSWORD = "SwapDoorHost!2025";

// Unsplash serves whatever size the URL asks for. Match lib/houses.ts's
// UNSPLASH_MASTER exactly (w=2400, q=80) so moving the file into Storage is a
// pure relocation — next/image resizes the same master DOWN per device, and the
// photos look identical to what the site serves today. `fm=jpg` rather than
// `auto=format`, because the bucket only accepts jpeg/png/webp and `auto` would
// let the CDN pick a format based on an Accept header we do not control.
const HOUSE_SRC = "fm=jpg&fit=crop&w=2400&q=80";

// Avatars are drawn at 40-96px and never bigger, so 512² is already generous.
// `facearea` asks Unsplash's own face detection to centre the crop, which is
// what stops a portrait becoming a chin inside components/avatar.tsx's circle.
const AVATAR_SRC = "fm=jpg&fit=facearea&facepad=2.6&w=512&h=512&q=80";

// The four photos each seeded home is made of, element 0 being the hero. This is
// the SAME list as the `pool` CTE in supabase/seed-images.sql, with that file's
// dead-photo replacements already applied — every id here was confirmed to
// return HTTP 200.
//
// It is written down rather than read back out of `houses.images` on purpose.
// Reading the database would make the script self-referential the moment it has
// run once: the rows now hold Storage URLs, so a second run would re-download
// the project's own copies instead of the originals, and would fail outright if
// the bucket were ever emptied. Sourcing from a fixed manifest is what makes
// "safe to re-run" true rather than accidentally true.
const HOUSE_PHOTOS = {
  1: ["photo-1602343168117-bb8ffe3e2e9f", "photo-1505693416388-ac5ce068fe85", "photo-1522708323590-d24dbb6b0267", "photo-1560448204-e02f11c3d0e2"],
  2: ["photo-1518780664697-55e3ad937233", "photo-1502672260266-1c1ef2d93688", "photo-1554995207-c18c203602cb", "photo-1484154218962-a197022b5858"],
  3: ["photo-1523217582562-09d0def993a6", "photo-1556911220-bff31c812dba", "photo-1600585154340-be6161a56a0c", "photo-1600566753086-00f18fb6b3ea"],
  4: ["photo-1537726235470-8504e3beef77", "photo-1600210492486-724fe5c67fb0", "photo-1583847268964-b28dc8f51f92", "photo-1618221195710-dd6b41faaea6"],
  5: ["photo-1499793983690-e29da59ef1c2", "photo-1616486338812-3dadae4b4ace", "photo-1616594039964-ae9021a400a0", "photo-1502005229762-cf1b2da7c5d6"],
  6: ["photo-1490806843957-31f4c9a91c65", "photo-1560184897-ae75f418493e", "photo-1505693416388-ac5ce068fe85", "photo-1522708323590-d24dbb6b0267"],
  7: ["photo-1483347756197-71ef80e95f73", "photo-1560448204-e02f11c3d0e2", "photo-1502672260266-1c1ef2d93688", "photo-1554995207-c18c203602cb"],
  8: ["photo-1499002238440-d264edd596ec", "photo-1484154218962-a197022b5858", "photo-1556911220-bff31c812dba", "photo-1600585154340-be6161a56a0c"],
  9: ["photo-1564013799919-ab600027ffc6", "photo-1600566753086-00f18fb6b3ea", "photo-1600210492486-724fe5c67fb0", "photo-1583847268964-b28dc8f51f92"],
  10: ["photo-1520250497591-112f2f40a3f4", "photo-1618221195710-dd6b41faaea6", "photo-1616486338812-3dadae4b4ace", "photo-1616594039964-ae9021a400a0"],
};

// One portrait per demo host, chosen to fit the persona each account stands for
// (Overview.md §3) and checked by eye at the size the avatar actually renders.
// Unsplash photos are free to use commercially without permission; these stand
// in for fictional members, which is what a course demo needs and nothing more.
const HOST_AVATARS = {
  "sofia.rossi@swapdoor.dev": "photo-1494790108377-be9c29b29330", // Florence, Italy
  "lars.eriksson@swapdoor.dev": "photo-1599566150163-29194dcaad36", // Stockholm, Sweden
  "alex.chen@swapdoor.dev": "photo-1628157588553-5eeea00af15c", // Persona 1 — the digital nomad, 28
  "sarah.miller@swapdoor.dev": "photo-1508214751196-bcfd4ca60f91", // Persona 2 — the family planner, 42
  "kenji.tanaka@swapdoor.dev": "photo-1596075780750-81249df16d19", // Kyoto, Japan
  "mateo.elena@swapdoor.dev": "photo-1618077360395-f3068be8e001", // Persona 3 — the empty nesters, 61/59
  "amara.okafor@swapdoor.dev": "photo-1573497161161-c3e73707e25c", // Cape Town, South Africa
};

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

const houseSrc = (photoId) => `https://images.unsplash.com/${photoId}?${HOUSE_SRC}`;

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  // A JPEG starts FF D8 FF. Checking it here means a CDN error page can never be
  // uploaded as though it were a photo, which would fail silently and only show
  // up as a broken image on the site.
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error(`${url} is not a JPEG`);
  return bytes;
}

async function signIn(api, key, email) {
  const res = await fetch(`${api}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: HOST_PASSWORD }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`sign-in ${email} → ${body.error_description || body.msg || res.status}`);
  return { token: body.access_token, uid: body.user.id };
}

/** Upsert one object and return its public URL. */
async function upload(api, key, session, bucket, objectPath, bytes) {
  const res = await fetch(`${api}/storage/v1/object/${bucket}/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "image/jpeg",
      "x-upsert": "true", // re-runnable: overwrite the same path instead of 409ing
    },
    body: bytes,
  });
  if (!res.ok) throw new Error(`upload ${bucket}/${objectPath} → ${res.status} ${await res.text()}`);
  return `${api}/storage/v1/object/public/${bucket}/${objectPath}`;
}

async function patch(api, key, session, table, filter, row) {
  const res = await fetch(`${api}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`patch ${table} → ${res.status} ${JSON.stringify(body)}`);
  // RLS returns 200 with an empty array when the row exists but the policy
  // refuses it, so an empty result is a silent no-op worth failing on.
  if (!Array.isArray(body) || body.length === 0) throw new Error(`patch ${table}?${filter} matched no row`);
  return body;
}

const sqlStr = (s) => `'${String(s).replace(/'/g, "''")}'`;

// ---------------------------------------------------------------------------

async function main() {
  const { url: api, key } = readEnv();
  console.log(`Project: ${api}${DRY_RUN ? "   (dry run — nothing will be written)" : ""}\n`);

  // Read the current state anonymously; RLS allows public reads on both tables.
  const listing = await fetch(
    // Only host_id is read from the database — which host owns which home is the
    // one fact here that is genuinely dynamic. The photos come from HOUSE_PHOTOS.
    `${api}/rest/v1/houses?select=id,name,host_id&id=lte.10&order=id.asc`,
    { headers: { apikey: key } }
  );
  const houses = await listing.json();
  if (!Array.isArray(houses)) throw new Error(`reading houses failed: ${JSON.stringify(houses)}`);

  const profiles = await fetch(`${api}/rest/v1/profiles?select=id,full_name`, { headers: { apikey: key } });
  const nameById = Object.fromEntries((await profiles.json()).map((p) => [p.id, p.full_name]));

  const statements = [];
  let uploaded = 0;
  let bytesTotal = 0;

  for (const [email, photoId] of Object.entries(HOST_AVATARS)) {
    const session = await signIn(api, key, email);
    const name = nameById[session.uid] ?? email;
    console.log(`${name}  <${email}>`);

    // --- avatar -------------------------------------------------------------
    const avatarBytes = await download(`https://images.unsplash.com/${photoId}?${AVATAR_SRC}`);
    bytesTotal += avatarBytes.length;
    // Deterministic filename, so re-running replaces the file rather than
    // leaving the old one orphaned in the bucket. The app's own uploader uses a
    // random name (lib/storage.ts) because it must never clobber a photo the
    // member still wants; a seed has exactly one avatar and wants the opposite.
    const avatarPath = `${session.uid}/host-avatar.jpg`;
    let avatarUrl = `${api}/storage/v1/object/public/avatars/${avatarPath}`;
    if (!DRY_RUN) {
      avatarUrl = await upload(api, key, session, "avatars", avatarPath, avatarBytes);
      await patch(api, key, session, "profiles", `id=eq.${session.uid}`, { avatar_url: avatarUrl });
    }
    uploaded++;
    console.log(`   avatar        ${(avatarBytes.length / 1024).toFixed(0).padStart(5)} KB  →  avatars/${avatarPath}`);
    statements.push(
      `update public.profiles set avatar_url = ${sqlStr(avatarUrl)} where id = ${sqlStr(session.uid)};`
    );

    // --- listing photos -----------------------------------------------------
    for (const house of houses.filter((h) => h.host_id === session.uid)) {
      // `image` is the card hero and `images[0]` the gallery hero. On five of the
      // ten seeded homes those disagreed, because `image` still held a URL
      // Unsplash had removed and only `images[0]` carried the replacement — the
      // app hid that by running both through fixImage(). Writing both from one
      // uploaded file is what makes them agree in the data as well as on screen.
      const photoIds = HOUSE_PHOTOS[house.id];
      if (!photoIds) throw new Error(`house ${house.id} has no entry in HOUSE_PHOTOS`);
      const urls = [];
      for (const [i, src] of photoIds.map(houseSrc).entries()) {
        const bytes = await download(src);
        bytesTotal += bytes.length;
        const objectPath = `${session.uid}/seed/house-${house.id}-${i + 1}.jpg`;
        urls.push(
          DRY_RUN
            ? `${api}/storage/v1/object/public/house-photos/${objectPath}`
            : await upload(api, key, session, "house-photos", objectPath, bytes)
        );
        uploaded++;
        console.log(
          `   #${String(house.id).padEnd(2)} photo ${i + 1}  ${(bytes.length / 1024).toFixed(0).padStart(5)} KB  →  house-photos/${objectPath}`
        );
      }
      if (!DRY_RUN) {
        await patch(api, key, session, "houses", `id=eq.${house.id}`, { image: urls[0], images: urls });
      }
      const arr = `array[${urls.map(sqlStr).join(", ")}]`;
      statements.push(
        `update public.houses set image = ${sqlStr(urls[0])}, images = ${arr} where id = ${house.id};`
      );
    }
    console.log();
  }

  const out = path.join(ROOT, "supabase", "seed-media.sql");
  fs.writeFileSync(
    out,
    [
      "-- GENERATED by scripts/seed-storage-media.mjs — do not edit by hand.",
      "--",
      "-- Repoints the ten seeded homes and the seven demo hosts at photos held in",
      "-- this project's own Supabase Storage buckets instead of images.unsplash.com.",
      "-- The files themselves are uploaded by the script; this is the record of the",
      "-- rows it changed, so the same state can be restored from the SQL editor",
      "-- alone (as long as the objects are still in the buckets).",
      "--",
      "-- Safe to re-run: every statement is an idempotent update by primary key.",
      "",
      "begin;",
      "",
      ...statements,
      "",
      "commit;",
      "",
    ].join("\n")
  );

  console.log(`${uploaded} objects, ${(bytesTotal / 1024 / 1024).toFixed(1)} MB total`);
  console.log(`Wrote ${path.relative(ROOT, out)}`);
  if (DRY_RUN) console.log("\nDry run — no uploads and no database writes were made.");
}

main().catch((err) => {
  console.error(`\n${err.message}`);
  process.exit(1);
});
