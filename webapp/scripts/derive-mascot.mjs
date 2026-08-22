// Derives public/mascot.png from the source artwork at the repo root.
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
//   2. re-maps the three tones onto the palette — dark blue-grey body, clearly
//      lighter door, dark knob so it still reads against that door.
//
// Classification is by luminance, which separates the three source tones
// cleanly (≈51 / ≈34 / ≈11), with a soft window at each boundary so the
// artwork's anti-aliasing survives. Edge pixels (alpha < 200) are always body:
// the door is fully interior, so every silhouette edge belongs to the body.
//
// Usage: node scripts/derive-mascot.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { inflateSync, deflateSync } from "node:zlib";

const SRC = "swapdoor homepage.png";
const OUT = "public/mascot.png";

// Targets, all on-palette (see the token block in app/globals.css).
const BODY = [0x3e, 0x4a, 0x66]; // a step above --color-border, reads on the bg
const DOOR = [0x7a, 0x88, 0xa6]; // clearly lighter than the body — the brand mark
const KNOB = [0x2a, 0x32, 0x45]; // dark, so it stays visible on the light door

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

const { w, h, data } = decode(SRC);

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

// 2. re-map the tones
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
      // knob (≈11) → door (≈34) → body (≈51), with soft boundaries so the
      // artwork's own anti-aliasing isn't turned into stairsteps.
      if (L < 18) colour = KNOB;
      else if (L < 26) colour = mix(KNOB, DOOR, clamp01((L - 18) / 8));
      else if (L < 40) colour = DOOR;
      else if (L < 46) colour = mix(DOOR, BODY, clamp01((L - 40) / 6));
      else colour = BODY;
    }
    out[d] = colour[0];
    out[d + 1] = colour[1];
    out[d + 2] = colour[2];
    out[d + 3] = alpha;
  }
}

encode(OUT, cw, ch, out);
console.log(`${OUT}: ${cw}x${ch} (cropped from ${w}x${h} at ${minX},${minY})`);
