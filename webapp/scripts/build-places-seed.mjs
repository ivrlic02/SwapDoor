// Builds the seed for public.countries / public.cities from GeoNames.
//
// The City and Country fields used to offer 45 cities and 57 countries typed by
// hand into lib/places.ts — so "every country" was untrue, and choosing a
// country could not narrow the city list because the two lists knew nothing
// about each other. This script produces the real thing, and is committed for
// the same reason scripts/derive-mascot.mjs is: the data in the database should
// be reproducible from a command, not a one-off nobody can repeat.
//
//   node scripts/build-places-seed.mjs [outFile]
//
// Downloads (cached in the system temp dir, so a re-run is instant):
//   cities1000.zip        ~170k places with 1000+ people
//   countryInfo.txt       the ISO 3166-1 list
//   admin1CodesASCII.txt  region names, to tell two same-named cities apart
//
// Which cities make the cut: every place with 15,000+ people, plus enough of
// each country's next-largest places to give it at least MIN_PER_COUNTRY
// entries. A flat population cut-off is wrong for a home-swap site — the homes
// that need to be findable most, Hvar (4.2k) and Zermatt (6.6k), are exactly
// the small places a flat cut-off deletes. ~50k rows.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

const BIG_ENOUGH = 15_000;
const MIN_PER_COUNTRY = 300;
const BATCH = 2_000; // rows per INSERT statement

// Places SwapDoor's own listings sit in that even cities1000 leaves out, since
// GeoNames records them below its 1,000-person floor. Same convention as
// IMAGE_REPLACEMENTS in lib/houses.ts: the upstream set is authoritative, with a
// short, commented list of exceptions on top. Ids and coordinates are the real
// GeoNames ones, taken from the per-country dumps.
const EXTRA_PLACES = [
  {
    id: 252920, country_code: "GR", name: "Santorini (Firá)",
    // Firá is the town; Santorini and Thira are what people actually type.
    search: "santorini fira thira", admin1: "South Aegean",
    lat: 36.42107, lng: 25.43087, population: 2376,
  },
  {
    id: 3369169, country_code: "ZA", name: "Camps Bay",
    search: "camps bay", admin1: "Western Cape",
    lat: -33.95166, lng: 18.38437, population: 0,
  },
];

// A country is searched for by the name people type, which is often not the one
// ISO prints. Each entry is appended to that country's search_name, so "usa",
// "holland" and "turkiye" all land on the right row while the row still *shows*
// its proper name.
// Codes GeoNames still carries that ISO 3166-1 has withdrawn. Both dissolved
// before this site existed and neither holds a city, so offering them in a
// picker would just be two wrong answers.
const RETIRED_COUNTRIES = new Set(["AN", "CS"]);

const COUNTRY_ALIASES = {
  US: "usa america united states of america", GB: "uk britain england scotland wales northern ireland",
  NL: "holland", TR: "turkiye", KR: "korea", KP: "korea", CZ: "czech republic",
  CH: "swiss", DE: "deutschland", HR: "hrvatska", AE: "uae", RU: "russian federation",
  MM: "burma", SZ: "swaziland", MK: "macedonia", CV: "cape verde", TL: "east timor",
  CD: "drc congo kinshasa", CG: "congo brazzaville", VA: "vatican", CI: "cote divoire",
  LA: "laos", SY: "syria", IR: "iran", MD: "moldova", TZ: "tanzania", BO: "bolivia",
  VE: "venezuela", GR: "hellas", ES: "espana", IT: "italia", JP: "nippon", CN: "prc",
};

const CACHE = path.join(os.tmpdir(), "swapdoor-geonames");
const OUT = process.argv[2] ?? path.join("supabase", "seed-places.sql");

// ── download + cache ────────────────────────────────────────────────────────
async function fetchCached(name, url) {
  const file = path.join(CACHE, name);
  if (fs.existsSync(file)) return file;
  fs.mkdirSync(CACHE, { recursive: true });
  process.stderr.write(`downloading ${name}…\n`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

// A minimal zip reader, rather than shelling out to `tar`/`unzip`: the tar that
// ships with Git for Windows reads "C:\..." as a remote host and refuses, and
// requiring a specific unzip binary would make the script unrunnable on a
// machine that happens not to have one. GeoNames' archives are one deflated
// member each, so the central directory is all we need.
function unzipTo(zip, member) {
  const out = path.join(CACHE, member);
  if (fs.existsSync(out)) return out;

  const buf = fs.readFileSync(zip);
  // End-of-central-directory: scan backwards, since it sits behind a comment
  // of unknown (max 64k) length.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66_000); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error(`${zip}: not a zip file`);

  let p = buf.readUInt32LE(eocd + 16);
  const entries = buf.readUInt16LE(eocd + 10);
  for (let n = 0; n < entries; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error(`${zip}: bad central directory`);
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localAt = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);

    if (name === member) {
      // The local header repeats the name and carries its own extra field,
      // which is often a different length from the central one.
      const dataAt = localAt + 30 + buf.readUInt16LE(localAt + 26) + buf.readUInt16LE(localAt + 28);
      const raw = buf.subarray(dataAt, dataAt + compSize);
      fs.writeFileSync(out, method === 0 ? raw : zlib.inflateRawSync(raw));
      return out;
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`${zip}: no member named ${member}`);
}

// ── text helpers ────────────────────────────────────────────────────────────
// Lowercase ASCII with the diacritics stripped. The same normalisation runs in
// lib/places.ts on the query, so a search never needs Postgres's unaccent (which
// is not IMMUTABLE and therefore cannot back the trigram index).
const FOLD = { đ: "d", Đ: "d", ø: "o", Ø: "o", ł: "l", Ł: "l", ß: "ss", æ: "ae", Æ: "ae", œ: "oe", Œ: "oe", þ: "th", ð: "d", ı: "i" };
const norm = (s) =>
  s
    .replace(/[đĐøØłŁßæÆœŒþðı]/g, (c) => FOLD[c])
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`’ʻʼ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const q = (s) => (s === null || s === undefined || s === "" ? "null" : `'${String(s).replace(/'/g, "''")}'`);

/** 🇭🇷 from "HR" — the two regional-indicator code points. */
function countrySearch(code, name) {
  const base = norm(name);
  const phrases = [];
  // "The Netherlands" has to be findable by typing "neth", so the stripped form
  // leads and wins the prefix tier; the full name and any aliases follow, where
  // a LIKE '%q%' still reaches them. Whole phrases, not words, so the substring
  // "the netherlands" survives too.
  if (base.startsWith("the ")) phrases.push(base.slice(4));
  phrases.push(base);
  if (COUNTRY_ALIASES[code]) phrases.push(norm(COUNTRY_ALIASES[code]));
  return [...new Set(phrases)].join(" ");
}

const flag = (code) =>
  String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

// ── build ───────────────────────────────────────────────────────────────────
const base = "https://download.geonames.org/export/dump/";
const [zip, countryInfo, admin1File] = await Promise.all([
  fetchCached("cities1000.zip", base + "cities1000.zip"),
  fetchCached("countryInfo.txt", base + "countryInfo.txt"),
  fetchCached("admin1CodesASCII.txt", base + "admin1CodesASCII.txt"),
]);
const citiesFile = unzipTo(zip, "cities1000.txt");

const countries = new Map(); // code → row
for (const line of fs.readFileSync(countryInfo, "utf8").split("\n")) {
  if (!line || line.startsWith("#")) continue;
  const f = line.split("\t");
  const [code, , , , name, , , , continent] = f;
  if (!code || !name) continue;
  if (RETIRED_COUNTRIES.has(code)) continue;
  countries.set(code, { code, name, continent: continent || null, cities: [] });
}

const admin1 = new Map(); // "HR.20" → "Split-Dalmatia"
for (const line of fs.readFileSync(admin1File, "utf8").split("\n")) {
  if (!line) continue;
  const [key, name] = line.split("\t");
  if (key && name) admin1.set(key, name);
}

for (const line of fs.readFileSync(citiesFile, "utf8").split("\n")) {
  if (!line) continue;
  const f = line.split("\t");
  const country = countries.get(f[8]);
  if (!country) continue; // a code countryInfo doesn't list — skip rather than orphan
  country.cities.push({
    id: Number(f[0]),
    name: f[1],
    search: norm(f[2] || f[1]),
    admin1: admin1.get(`${f[8]}.${f[10]}`) ?? null,
    lat: Number(f[4]),
    lng: Number(f[5]),
    population: Number(f[14]) || 0,
  });
}

const rows = [];
for (const country of countries.values()) {
  country.cities.sort((a, b) => b.population - a.population || a.name.localeCompare(b.name));
  const big = country.cities.filter((c) => c.population >= BIG_ENOUGH).length;
  const keep = country.cities.slice(0, Math.max(big, Math.min(country.cities.length, MIN_PER_COUNTRY)));

  // Country centre = its cities' population-weighted centroid, so a map can
  // frame a country without a second data source. Cities-free entries (Bouvet
  // Island and friends) keep a null centre and still appear in the list.
  let wLat = 0, wLng = 0, w = 0;
  for (const c of keep) {
    const weight = Math.max(c.population, 1);
    wLat += c.lat * weight;
    wLng += c.lng * weight;
    w += weight;
  }
  country.lat = w ? +(wLat / w).toFixed(5) : null;
  country.lng = w ? +(wLng / w).toFixed(5) : null;
  country.count = keep.length;
  for (const c of keep) rows.push({ ...c, country_code: country.code });
}

for (const extra of EXTRA_PLACES) {
  if (rows.some((r) => r.id === extra.id)) continue; // a wider floor already got it
  rows.push(extra);
  const country = countries.get(extra.country_code);
  if (country) country.count += 1;
}

// ── emit ────────────────────────────────────────────────────────────────────
const out = [];
out.push("-- Generated by scripts/build-places-seed.mjs — do not edit by hand.");
out.push(`-- ${countries.size} countries, ${rows.length} cities, from GeoNames (CC BY 4.0).`);
out.push("begin;");
out.push("delete from public.cities;");
out.push("delete from public.countries;");

const countryValues = [...countries.values()].map(
  (c) =>
    `(${q(c.code)},${q(c.name)},${q(countrySearch(c.code, c.name))},${q(flag(c.code))},${q(c.continent)},${c.lat ?? "null"},${c.lng ?? "null"},${c.count})`
);
out.push(
  "insert into public.countries (code,name,search_name,emoji,continent,lat,lng,city_count) values\n" +
    countryValues.join(",\n") +
    "\non conflict (code) do update set name = excluded.name," +
    " search_name = excluded.search_name, emoji = excluded.emoji," +
    " continent = excluded.continent, lat = excluded.lat, lng = excluded.lng," +
    " city_count = excluded.city_count;"
);

for (let i = 0; i < rows.length; i += BATCH) {
  const values = rows
    .slice(i, i + BATCH)
    .map(
      (c) =>
        `(${c.id},${q(c.country_code)},${q(c.name)},${q(c.search)},${q(c.admin1)},${c.lat},${c.lng},${c.population})`
    );
  out.push(
    "insert into public.cities (id,country_code,name,search_name,admin1,lat,lng,population) values\n" +
      values.join(",\n") +
      "\non conflict (id) do nothing;"
  );
}

out.push("commit;");
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out.join("\n\n") + "\n", "utf8");
process.stderr.write(`${OUT}: ${countries.size} countries, ${rows.length} cities\n`);
