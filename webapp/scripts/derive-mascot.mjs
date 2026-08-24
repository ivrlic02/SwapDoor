// Derives public/mascot.png and public/mascot-light.png from the source artwork
// at the repo root — one file per theme.
//
// The source ("swapdoor homepage.png", 2048² with the art floating in the
// middle) is a three-tone silhouette: body #2C3444, door #20202C and a near
// black knob. On the site's #1A2030 background those tones are nearly the
// background itself, and the door — the brand's whole idea — ends up *darker*
// than the bigfoot carrying it.
//
// So this script does two things, once, in the asset rather than with a CSS
// filter (a filter would shift both tones together and could never make the
// door lighter than the body):
//   1. crops to the alpha bounding box, so layout is controlled purely by the
//      width class in components/hero-decor.tsx;
//   2. re-maps the three tones onto the palette.
//
// TWO ramps, because the mascot is a watermark, and a watermark is defined by
// its distance from the page rather than by its own colour. The dark ramp lifts
// the three tones ABOVE #1A2030; the light ramp drops them BELOW #EAEFF7. Both
// land, at the hero's opacity-35, a few values off the background — which is
// what "faint decoration" actually means. Reusing the dark file on a pale page
// would put the highest-contrast object on the first screen back onto the one
// element carrying no meaning, which is the finding the 2026-08-21 landing-page
// pass fixed (S2).
//
// The door stays the more prominent of the two in both, which is why the ramps
// are not mirror images: on a dark page prominence is *lighter*, on a pale one
// it is *darker*, so the body/door order flips while their roles do not. The
// knob follows the door for the same reason — it has to read against the door,
// never against the page.
//
// Classification is by luminance, which separates the three tones cleanly with
// a soft window at each boundary so the artwork's anti-aliasing survives. Edge
// pixels (alpha < 200) are always body: the door is fully interior, so every
// silhouette edge belongs to the body.
//
// TWO SOURCES, and which one is used matters.
//
// The original is "swapdoor homepage.png" at the repo root. It is no longer
// there — the handoff had it filed as loose clutter to move somewhere
// deliberate (item 18) and at some point it went. So this script now falls back
// to public/mascot.png, the dark file IT produced, and re-tones that. Same
// pipeline, one step further down it: the fallback is already cropped and
// already exactly three tones, so the classification is if anything cleaner —
// what it cannot do is regenerate the dark file, which would then be derived
// from itself. When the original comes back, put it at the path below and this
// reverts to the full two-ramp run with no other change.
//
// The two window sets exist because the tones arrive in a different ORDER in
// each source. In the original the luminances run knob ≈11 < door ≈34 < body
// ≈51; in the derived file they run knob ≈50 < body ≈74 < door ≈135, because
// making the door the lighter element is precisely what the dark ramp did.
// Reading one file with the other's windows silently paints the door as body.
//
// Usage: node scripts/derive-mascot.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { inflateSync, deflateSync } from "node:zlib";

const SRC = "swapdoor homepage.png";
const DERIVED_SRC = "public/mascot.png";

// Luminance boundaries, as [tone, tone, softStart, softEnd] pairs read in
// order. See the header for why there are two sets.
const WINDOWS = {
  // the original artwork: knob → door → body
  source: { first: "knob", second: "door", third: "body", a: [18, 26], b: [40, 46] },
  // public/mascot.png: knob → body → door
  derived: { first: "knob", second: "body", third: "door", a: [57, 66], b: [98, 111] },
};

// The two ramps, both on-palette (see the token block in app/globals.css).
const RAMPS = [
  {
    out: "public/mascot.png",
    theme: "dark",
    body: [0x3e, 0x4a, 0x66], // a step above --color-border, reads on the bg
    door: [0x7a, 0x88, 0xa6], // clearly lighter than the body — the brand mark
    knob: [0x2a, 0x32, 0x45], // dark, so it stays visible on the light door
  },
  {
    out: "public/mascot-light.png",
    theme: "light",
    // Placed by working backwards from what the hero actually composites: at
    // opacity-35 over --color-bg (#EAEFF7) these land at roughly #D5DCE8 body
    // and #C7CFE0 door — a whisper on the page, with the door still the firmer
    // of the two. Lighter than this and the artwork stops existing; darker and
    // it starts competing with the headline again.
    body: [0xaf, 0xb8, 0xcc],
    door: [0x87, 0x94, 0xb4], // darker = more prominent, on a pale ground
    knob: [0xe3, 0xe8, 0xf2], // light, so it stays visible on the dark door
  },
];

const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function decode(path) {
  const buf = readFileSync(path);
  let p = 8, w = 0, h = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString("ascii", p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9];
    } else if (type === "IDAT") idat.push(Buffer.from(data));
    else if (type === "IEND") break;
    p += 12 + len;
  }
  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(`expected 8-bit RGBA, got depth=${bitDepth} colorType=${colorType}`);
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * 4;
  const out = Buffer.alloc(stride * h);
  const prev = Buffer.alloc(stride);
  const line = Buffer.alloc(stride);
  let off = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[off++];
    raw.copy(line, 0, off, off + stride);
    off += stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= 4 ? line[i - 4] : 0;
      const b = prev[i];
      const c = i >= 4 ? prev[i - 4] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[i] = v & 255;
    }
    line.copy(prev);
    line.copy(out, y * stride);
  }
  return { w, h, data: out };
}

function crc32(b) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < b.length; n++) {
    c = (crc ^ b[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encode(path, w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  writeFileSync(path, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]));
}

// Prefer the original artwork; fall back to the file this script already made.
const fromSource = existsSync(SRC);
const { w, h, data } = decode(fromSource ? SRC : DERIVED_SRC);
const windows = fromSource ? WINDOWS.source : WINDOWS.derived;
if (!fromSource) {
  console.log(
    `${SRC} not found — re-toning ${DERIVED_SRC} instead. Only the light ramp ` +
      `is written; the dark one is the input and cannot be derived from itself.`
  );
}

// 1. crop to the alpha bounding box
let minX = w, minY = h, maxX = -1, maxY = -1;
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > 16) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
const cw = maxX - minX + 1;
const ch = maxY - minY + 1;

// 2. re-map the tones — once per ramp. The classification is identical for
//    both and only the three targets it maps onto differ, which is the whole
//    reason this is one script and not two: the day the artwork changes, the
//    two files cannot drift apart.
for (const ramp of RAMPS) {
  const { out: OUT, theme, body: BODY, door: DOOR, knob: KNOB } = ramp;
  // Deriving the dark file from itself would round every anti-aliased pixel a
  // second time for no gain, so it is left exactly as it is.
  if (!fromSource && theme === "dark") continue;

  const tones = { body: BODY, door: DOOR, knob: KNOB };
  const [t1, t2, t3] = [tones[windows.first], tones[windows.second], tones[windows.third]];
  const [a0, a1] = windows.a;
  const [b0, b1] = windows.b;

  const out = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const s = ((y + minY) * w + (x + minX)) * 4;
      const d = (y * cw + x) * 4;
      const alpha = data[s + 3];
      let colour;
      if (alpha < 200) {
        colour = BODY; // silhouette edge — never the door
      } else {
        const L = luma(data[s], data[s + 1], data[s + 2]);
        // Three plateaus with a soft ramp at each boundary, so the artwork's
        // own anti-aliasing comes through as a blend instead of a stairstep.
        if (L < a0) colour = t1;
        else if (L < a1) colour = mix(t1, t2, clamp01((L - a0) / (a1 - a0)));
        else if (L < b0) colour = t2;
        else if (L < b1) colour = mix(t2, t3, clamp01((L - b0) / (b1 - b0)));
        else colour = t3;
      }
      out[d] = colour[0];
      out[d + 1] = colour[1];
      out[d + 2] = colour[2];
      out[d + 3] = alpha;
    }
  }

  encode(OUT, cw, ch, out);
  console.log(`${OUT}: ${cw}x${ch}, ${theme} ramp (from ${fromSource ? SRC : DERIVED_SRC}, ${w}x${h} at ${minX},${minY})`);
}
