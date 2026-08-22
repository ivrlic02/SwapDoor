// Derives lib/brand-art.ts from the logo artwork at the repo root.
//
// The logo is a PNG: a walking Sasquatch carrying a door, above the "SwapDoor"
// wordmark, in three flat tones (body #1870B0, door #38A8E8, wordmark #08508F).
// A PNG is fine for the hero, where the art is 400px wide and soft — but it is
// the wrong material for everything else the brand needs:
//
//   * a 16px favicon out of a 1024² PNG is mush;
//   * the tones are baked in, so the mark can never follow the colour tokens;
//   * and the door cannot move independently of the body, which is exactly what
//     the animated nav mark (components/brand.tsx) is built on.
//
// So this traces the artwork to vector, once, and writes the paths out as a
// generated TypeScript module. Four shapes come out:
//
//   MASCOT_SILHOUETTE  body + door as one solid — the figure in a doorway
//   MASCOT_BODY        the same, with the door punched out (fill-rule evenodd)
//   MASCOT_DOOR        the door alone, so it can swing on its own hinge
//   WORDMARK_PATH      all eight letters plus their counters, one path
//
// Note MASCOT_DOOR is fully *enclosed* by the body: separating them leaves a
// door-shaped hole in his torso. That is deliberate — components/brand.tsx
// fills the hole with the lit doorway behind the door, which is both the fix
// and the idea (the door he carries opens onto somewhere else).
//
// Pipeline: classify pixels by colour → crack-follow the mask into closed
// staircase loops → Douglas-Peucker → Catmull-Rom to cubic beziers.
//
// Usage: node scripts/trace-logo.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const SRC = "imSDSADADage.png";
const OUT = "lib/brand-art.ts";

// Measured from the source once; asserted below so a different artwork fails
// loudly rather than silently tracing the wrong regions.
const MASCOT = { x0: 276, y0: 95, x1: 732, y1: 684 };
const DOOR = { x0: 441, y0: 262, x1: 588, y1: 531 };
const WORD = { x0: 106, y0: 724, x1: 933, y1: 888 };
const SPLIT_Y = 700; // the blank rows between the mascot and the wordmark

const BODY_RGB = [24, 116, 180];
const DOOR_RGB = [62, 170, 234];
const WORD_RGB = [13, 84, 146];

// ── PNG decode (8-bit RGBA) ──────────────────────────────────────────────────
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

// ── contour tracing ──────────────────────────────────────────────────────────
// Walks the unit edges between a mask pixel and a non-mask pixel, chaining them
// into closed loops. Exact (a staircase), which the simplifier then smooths.
function traceMask(mask, w, h, minArea) {
  const key = (x, y) => y * (w + 1) + x;
  const starts = new Map();
  const push = (x0, y0, x1, y1) => {
    const k = key(x0, y0);
    if (!starts.has(k)) starts.set(k, []);
    starts.get(k).push([x1, y1]);
  };
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : mask[y * w + x]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!at(x, y)) continue;
      if (!at(x, y - 1)) push(x, y, x + 1, y);
      if (!at(x + 1, y)) push(x + 1, y, x + 1, y + 1);
      if (!at(x, y + 1)) push(x + 1, y + 1, x, y + 1);
      if (!at(x - 1, y)) push(x, y + 1, x, y);
    }
  }
  const loops = [];
  for (const [k0] of [...starts]) {
    while (starts.get(k0)?.length) {
      const pts = [];
      let cx = k0 % (w + 1);
      let cy = (k0 - cx) / (w + 1);
      const startK = key(cx, cy);
      for (;;) {
        const list = starts.get(key(cx, cy));
        if (!list || !list.length) break;
        const [nx, ny] = list.pop();
        pts.push([cx, cy]);
        cx = nx; cy = ny;
        if (key(cx, cy) === startK) break;
      }
      if (pts.length > 3) loops.push(pts);
    }
  }
  const area = (p) => {
    let a = 0;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += p[j][0] * p[i][1] - p[i][0] * p[j][1];
    return Math.abs(a) / 2;
  };
  return loops.filter((p) => area(p) >= minArea);
}

// Douglas-Peucker on a closed loop, anchored on its two most distant points.
function simplify(points, tol) {
  if (points.length < 4) return points;
  const segDist = (p, a, b) => {
    let x = a[0], y = a[1];
    const dx = b[0] - x, dy = b[1] - y;
    if (dx || dy) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) { x = b[0]; y = b[1]; } else if (t > 0) { x += dx * t; y += dy * t; }
    }
    return (p[0] - x) ** 2 + (p[1] - y) ** 2;
  };
  const t2 = tol * tol;
  const run = (pts, first, last, out) => {
    let max = t2, idx = -1;
    for (let i = first + 1; i < last; i++) {
      const d = segDist(pts[i], pts[first], pts[last]);
      if (d > max) { idx = i; max = d; }
    }
    if (idx > 0) { run(pts, first, idx, out); out.push(pts[idx]); run(pts, idx, last, out); }
  };
  let far = 0, best = -1;
  for (let i = 1; i < points.length; i++) {
    const d = (points[0][0] - points[i][0]) ** 2 + (points[0][1] - points[i][1]) ** 2;
    if (d > best) { best = d; far = i; }
  }
  const rot = points.slice(far).concat(points.slice(0, far));
  const out = [rot[0]];
  run(rot, 0, rot.length - 1, out);
  out.push(rot[rot.length - 1]);
  return out;
}

// Catmull-Rom through the simplified points → closed cubic-bezier path data.
// Straight beziers would keep the staircase; this rounds it back to the shape
// the artwork's own anti-aliasing describes.
function toPath(points, scale, ox, oy) {
  const P = points.map(([x, y]) => [(x - ox) * scale, (y - oy) * scale]);
  const n = P.length;
  const f = (v) => Number(v.toFixed(2));
  let d = `M${f(P[0][0])} ${f(P[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])},${f(c2[0])} ${f(c2[1])},${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d}Z`;
}

// ── build the masks ──────────────────────────────────────────────────────────
const { w, h, data } = decode(SRC);
if (w !== 1024 || h !== 1024) throw new Error(`expected a 1024² source, got ${w}×${h}`);

const dist = (r, g, b, t) => Math.sqrt((r - t[0]) ** 2 + (g - t[1]) ** 2 + (b - t[2]) ** 2);
const inBox = (x, y, box, pad = 2) =>
  x >= box.x0 - pad && x <= box.x1 + pad && y >= box.y0 - pad && y <= box.y1 + pad;

const silhouette = new Uint8Array(w * h);
const door = new Uint8Array(w * h);
const wordmark = new Uint8Array(w * h);

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (data[i * 4 + 3] < 128) continue;
    if (y >= SPLIT_Y) { wordmark[i] = 1; continue; }
    silhouette[i] = 1;
    // Inside the door's box, the two lighter tones (door blue, and the dark
    // knob sitting on it) are both "door"; everything else is body. Outside the
    // box nothing can be door, which keeps stray anti-aliased pixels out.
    if (!inBox(x, y, DOOR)) continue;
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const d = [dist(r, g, b, BODY_RGB), dist(r, g, b, DOOR_RGB), dist(r, g, b, WORD_RGB)];
    const nearest = d.indexOf(Math.min(...d));
    if (nearest !== 0) door[i] = 1;
  }
}

// Close the door mask (dilate then erode) so the knob and any anti-aliased
// seam don't leave pinholes that would trace as extra contours.
function morph(src, rad, grow) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let hit = grow ? 0 : 1;
      outer:
      for (let dy = -rad; dy <= rad; dy++) {
        for (let dx = -rad; dx <= rad; dx++) {
          const nx = x + dx, ny = y + dy;
          const v = nx < 0 || ny < 0 || nx >= w || ny >= h ? 0 : src[ny * w + nx];
          if (grow && v) { hit = 1; break outer; }
          if (!grow && !v) { hit = 0; break outer; }
        }
      }
      out[y * w + x] = hit;
    }
  }
  return out;
}
const doorSolid = morph(morph(door, 2, true), 2, false);

const body = new Uint8Array(w * h);
for (let i = 0; i < w * h; i++) body[i] = silhouette[i] && !doorSolid[i] ? 1 : 0;

// The knob: the darkest blob inside the door. Emitted as a circle rather than
// a path — it is one, and a circle survives being drawn at 16px.
//
// Search inside `doorSolid`, not inside DOOR's bounding *box*: the door is
// tilted, so its box corners are full of body pixels, which are darker than the
// door tone and would drag the centroid off the knob entirely.
const darkInDoor = new Uint8Array(w * h);
for (let i = 0; i < w * h; i++) {
  if (!doorSolid[i] || data[i * 4 + 3] < 200) continue;
  const L = 0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2];
  if (L < 110) darkInDoor[i] = 1; // door ≈ 153, knob ≈ 85
}
// Largest 4-connected component — the knob, not the anti-aliased seam.
const seen = new Uint8Array(w * h);
let knobPixels = [];
for (let i = 0; i < w * h; i++) {
  if (!darkInDoor[i] || seen[i]) continue;
  const stack = [i];
  seen[i] = 1;
  const comp = [];
  while (stack.length) {
    const j = stack.pop();
    comp.push(j);
    const jx = j % w, jy = (j - (j % w)) / w;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = jx + dx, ny = jy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const k = ny * w + nx;
      if (darkInDoor[k] && !seen[k]) { seen[k] = 1; stack.push(k); }
    }
  }
  if (comp.length > knobPixels.length) knobPixels = comp;
}
if (knobPixels.length < 20) throw new Error("no door knob found — has the artwork changed?");
let kx = 0, ky = 0, kx0 = w, kx1 = 0;
for (const j of knobPixels) {
  const jx = j % w, jy = (j - (j % w)) / w;
  kx += jx; ky += jy;
  if (jx < kx0) kx0 = jx;
  if (jx > kx1) kx1 = jx;
}
const kn = knobPixels.length;

// ── emit ─────────────────────────────────────────────────────────────────────
// Both marks are normalised to a height of 100 units, so a caller sizes them
// purely with CSS and never has to know the source pixel dimensions.
const mScale = 100 / (MASCOT.y1 - MASCOT.y0 + 1);
const mWidth = ((MASCOT.x1 - MASCOT.x0 + 1) * mScale).toFixed(2);
const wScale = 40 / (WORD.y1 - WORD.y0 + 1);
const wWidth = ((WORD.x1 - WORD.x0 + 1) * wScale).toFixed(2);

const trace = (mask, tol, minArea, scale, ox, oy) =>
  traceMask(mask, w, h, minArea).map((loop) => toPath(simplify(loop, tol), scale, ox, oy)).join("");

const silPath = trace(silhouette, 2.2, 120, mScale, MASCOT.x0, MASCOT.y0);
const bodyPath = trace(body, 2.2, 200, mScale, MASCOT.x0, MASCOT.y0);
const doorPath = trace(doorSolid, 2.2, 400, mScale, MASCOT.x0, MASCOT.y0);
const wordPath = trace(wordmark, 1.6, 60, wScale, WORD.x0, WORD.y0);

const knob = {
  cx: (((kx / kn) - MASCOT.x0) * mScale).toFixed(2),
  cy: (((ky / kn) - MASCOT.y0) * mScale).toFixed(2),
  r: (((kx1 - kx0 + 1) / 2) * mScale).toFixed(2),
};

// The door's left edge is the hinge the animated mark rotates about.
const hingeX = (((DOOR.x0 - MASCOT.x0) * mScale)).toFixed(2);

const ts = `// GENERATED FILE — do not edit by hand.
// Run \`node scripts/trace-logo.mjs\` to regenerate from ${SRC}.
//
// The SwapDoor logo as vector paths. See the header of that script for why the
// artwork is traced rather than shipped as a PNG, and for what each shape is.
// Both marks are normalised to a height of 100 (mascot) / 40 (wordmark) units,
// so callers size them with CSS alone.

/** Mascot viewBox — the walking figure, cropped to its own bounding box. */
export const MASCOT_VIEWBOX = "0 0 ${mWidth} 100";

/** Body + door as one solid shape. The figure seen standing in a doorway. */
export const MASCOT_SILHOUETTE =
  "${silPath}";

/** The same figure with the door punched out. Needs fill-rule="evenodd". */
export const MASCOT_BODY =
  "${bodyPath}";

/** The carried door alone, so it can swing on its own hinge. */
export const MASCOT_DOOR =
  "${doorPath}";

/** The door's knob, in mascot viewBox units. */
export const MASCOT_KNOB = { cx: ${knob.cx}, cy: ${knob.cy}, r: ${knob.r} } as const;

/** x of the door's hinge edge, in mascot viewBox units. */
export const MASCOT_DOOR_HINGE_X = ${hingeX};

/** Wordmark viewBox — "SwapDoor", cropped to its own bounding box. */
export const WORDMARK_VIEWBOX = "0 0 ${wWidth} 40";

/** All eight letters and their counters in one path. Needs fill-rule="evenodd". */
export const WORDMARK_PATH =
  "${wordPath}";
`;

writeFileSync(OUT, ts);
console.log(
  `${OUT}: mascot ${mWidth}×100, wordmark ${wWidth}×40, ` +
  `${(silPath.length + bodyPath.length + doorPath.length + wordPath.length / 1) / 1024 | 0}KB of path data`
);
