// Renders the fixed-size brand images that Next.js serves through its metadata
// file conventions, from the vector paths in lib/brand-art.ts:
//
//   app/icon.svg              the tab icon — vector, so it stays sharp anywhere
//   app/favicon.ico           16/32/48, for anything that still asks for /favicon.ico
//   app/apple-icon.png        180×180, iOS home screen
//   app/opengraph-image.png   1200×630, the card a shared SwapDoor link renders as
//   app/twitter-image.png     the same, under the name X asks for
//
// These have to be raster (or, for the SVG, self-contained) because nothing
// renders them inside the app: a favicon has no access to the CSS custom
// properties in globals.css, so `var(--color-brand)` there would resolve to
// nothing. They therefore carry the artwork's OWN tones as literal hex — which
// is also what makes the tab icon look like the logo file rather than like a
// re-tinted copy of it.
//
// Everything is drawn here rather than pulled in from a library: the project has
// no image dependency, and the shapes involved are one silhouette, one door and
// eight letters.
//
// Usage: node scripts/build-brand-assets.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const ART = readFileSync("lib/brand-art.ts", "utf8");

/** Pull a `export const NAME =\n  "…";` string out of the generated module. */
function art(name) {
  const m = ART.match(new RegExp(`export const ${name} =\\s*\\n?\\s*"([^"]*)"`));
  if (!m) throw new Error(`lib/brand-art.ts is missing ${name} — run scripts/trace-logo.mjs`);
  return m[1];
}
function artNum(name, key) {
  const m = ART.match(new RegExp(`export const ${name} = \\{[^}]*${key}: (-?[\\d.]+)`));
  if (!m) throw new Error(`lib/brand-art.ts is missing ${name}.${key}`);
  return Number(m[1]);
}

const MASCOT_BODY = art("MASCOT_BODY");
const MASCOT_DOOR = art("MASCOT_DOOR");
const WORDMARK_PATH = art("WORDMARK_PATH");
const KNOB = { cx: artNum("MASCOT_KNOB", "cx"), cy: artNum("MASCOT_KNOB", "cy"), r: artNum("MASCOT_KNOB", "r") };
const MASCOT_W = Number(art("MASCOT_VIEWBOX").split(" ")[2]);
const WORD_W = Number(art("WORDMARK_VIEWBOX").split(" ")[2]);

// The artwork's own three tones, sampled from the source PNG.
const BODY = [0x18, 0x70, 0xb0];
const DOOR = [0x38, 0xa8, 0xe8];
const KNOB_TONE = [0x0d, 0x54, 0x92];
// App tokens, for the surfaces the images sit on (globals.css).
const BG = [0x1a, 0x20, 0x30];
const BRAND = [0x3b, 0x82, 0xf6];
const FG = [0xee, 0xf2, 0xf9];

// ── canvas ───────────────────────────────────────────────────────────────────
function canvas(w, h, bg) {
  const data = Buffer.alloc(w * h * 4);
  if (bg) {
    for (let i = 0; i < w * h; i++) {
      data[i * 4] = bg[0]; data[i * 4 + 1] = bg[1]; data[i * 4 + 2] = bg[2]; data[i * 4 + 3] = 255;
    }
  }
  return { w, h, data };
}

function blend(c, x, y, color, alpha) {
  if (alpha <= 0 || x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const i = (y * c.w + x) * 4;
  const a = Math.min(1, alpha);
  const dstA = c.data[i + 3] / 255;
  const outA = a + dstA * (1 - a);
  if (outA <= 0) return;
  for (let k = 0; k < 3; k++) {
    c.data[i + k] = Math.round((color[k] * a + c.data[i + k] * dstA * (1 - a)) / outA);
  }
  c.data[i + 3] = Math.round(outA * 255);
}

// Flattens "M…C…Z" path data (absolute M/C/Z, which is all toPath emits) into
// closed polygons, applying scale + translate on the way.
function flatten(d, scale, tx, ty, steps = 16) {
  const nums = d.match(/-?\d*\.?\d+/g).map(Number);
  const cmds = d.match(/[MCZ]/g) || [];
  const polys = [];
  let poly = null;
  let cur = [0, 0];
  let i = 0;
  const P = (x, y) => [x * scale + tx, y * scale + ty];
  for (const cmd of cmds) {
    if (cmd === "M") {
      cur = [nums[i++], nums[i++]];
      poly = [P(cur[0], cur[1])];
      polys.push(poly);
    } else if (cmd === "C") {
      const p1 = [nums[i++], nums[i++]], p2 = [nums[i++], nums[i++]], p3 = [nums[i++], nums[i++]];
      for (let s = 1; s <= steps; s++) {
        const t = s / steps, u = 1 - t;
        poly.push(P(
          u * u * u * cur[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
          u * u * u * cur[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
        ));
      }
      cur = p3;
    }
  }
  return polys;
}

// Even-odd scanline fill. Vertical coverage comes from SS sub-scanlines, and
// horizontal coverage is computed analytically per span, so edges are properly
// anti-aliased even at 16px — which is the whole point of the favicon.
const SS = 8;
function fillPolys(c, polys, color, alphaScale = 1) {
  let minY = Infinity, maxY = -Infinity;
  for (const p of polys) for (const [, y] of p) { if (y < minY) minY = y; if (y > maxY) maxY = y; }
  const y0 = Math.max(0, Math.floor(minY));
  const y1 = Math.min(c.h - 1, Math.ceil(maxY));
  const cov = new Float32Array(c.w);
  for (let py = y0; py <= y1; py++) {
    cov.fill(0);
    for (let s = 0; s < SS; s++) {
      const y = py + (s + 0.5) / SS;
      const xs = [];
      for (const poly of polys) {
        for (let k = 0, j = poly.length - 1; k < poly.length; j = k++) {
          const a = poly[j], b = poly[k];
          if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
        }
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(0, xs[k]);
        const xb = Math.min(c.w, xs[k + 1]);
        if (xb <= xa) continue;
        for (let px = Math.floor(xa); px < Math.ceil(xb); px++) {
          const overlap = Math.min(xb, px + 1) - Math.max(xa, px);
          if (overlap > 0) cov[px] += overlap / SS;
        }
      }
    }
    for (let px = 0; px < c.w; px++) if (cov[px] > 0) blend(c, px, py, color, cov[px] * alphaScale);
  }
}

function fillPath(c, d, color, scale, tx, ty) {
  fillPolys(c, flatten(d, scale, tx, ty), color);
}

function fillCircle(c, cx, cy, r, color) {
  const poly = [];
  const n = Math.max(24, Math.ceil(r * 4));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    poly.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  fillPolys(c, [poly], color);
}

/** The logo's figure: body with the door punched out, door over the hole, knob. */
function drawMascot(c, height, x, y, tones = [BODY, DOOR, KNOB_TONE]) {
  const s = height / 100;
  fillPath(c, MASCOT_BODY, tones[0], s, x, y);
  fillPath(c, MASCOT_DOOR, tones[1], s, x, y);
  fillCircle(c, x + KNOB.cx * s, y + KNOB.cy * s, KNOB.r * s, tones[2]);
}

function drawWordmark(c, height, x, y, color) {
  fillPath(c, WORDMARK_PATH, color, height / 40, x, y);
}

// ── PNG encode ───────────────────────────────────────────────────────────────
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
function toPng(c) {
  const stride = c.w * 4;
  const raw = Buffer.alloc((stride + 1) * c.h);
  for (let y = 0; y < c.h; y++) {
    // Filter 1 (Sub) beats None on flat art and on gradients alike.
    raw[y * (stride + 1)] = 1;
    for (let i = 0; i < stride; i++) {
      const v = c.data[y * stride + i];
      const left = i >= 4 ? c.data[y * stride + i - 4] : 0;
      raw[y * (stride + 1) + 1 + i] = (v - left) & 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(c.w, 0); ihdr.writeUInt32BE(c.h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** ICO wrapping PNG payloads — accepted by every browser that still asks for one. */
function toIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = 6 + dir.length;
  pngs.forEach(({ size, png }, i) => {
    const o = i * 16;
    dir[o] = size >= 256 ? 0 : size;
    dir[o + 1] = size >= 256 ? 0 : size;
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(png.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += png.length;
  });
  return Buffer.concat([header, dir, ...pngs.map((p) => p.png)]);
}

// ── the images ───────────────────────────────────────────────────────────────

// A square tab icon. The wordmark is dropped: a favicon is 16px on a side and
// eight letters at that size are a grey smear — the mascot with his door is the
// half of the logo that still reads, and it is the half that is distinctive.
function iconCanvas(size, bg) {
  const c = canvas(size, size, bg);
  const h = size * 0.9;
  drawMascot(c, h, (size - h * (MASCOT_W / 100)) / 2, (size - h) / 2);
  return c;
}

const icoSizes = [16, 32, 48];
writeFileSync("app/favicon.ico", toIco(icoSizes.map((size) => ({ size, png: toPng(iconCanvas(size, null)) }))));

// iOS composites the home-screen icon onto its own rounded square and does not
// honour transparency, so this one gets the app's page colour behind it.
writeFileSync("app/apple-icon.png", toPng(iconCanvas(180, BG)));

// The vector tab icon. Literal hex, not tokens: nothing that renders a favicon
// has ever seen globals.css.
const iconSvgScale = 90 / 100;
const iconSvgX = (100 - 90 * (MASCOT_W / 100)) / 2;
writeFileSync(
  "app/icon.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="SwapDoor">
  <g transform="translate(${iconSvgX.toFixed(2)} 5) scale(${iconSvgScale})">
    <path fill="#1870b0" fill-rule="evenodd" d="${MASCOT_BODY}"/>
    <path fill="#38a8e8" d="${MASCOT_DOOR}"/>
    <circle fill="#0d5492" cx="${KNOB.cx}" cy="${KNOB.cy}" r="${KNOB.r}"/>
  </g>
</svg>
`,
);

// The social card. The lockup on the page's own background with the brand glow
// the hero uses, so a shared link looks like the site it opens.
function socialCard() {
  const W = 1200, H = 630;
  const c = canvas(W, H, BG);

  // Brand glow, centred above the lockup — the same radial the hero paints.
  const gx = W * 0.5, gy = H * 0.12, gr = W * 0.62;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.hypot((x - gx) / gr, (y - gy) / (gr * 0.85));
      if (d >= 1) continue;
      const t = (1 - d) ** 2 * 0.3;
      const i = (y * W + x) * 4;
      for (let k = 0; k < 3; k++) c.data[i + k] = Math.round(c.data[i + k] * (1 - t) + BRAND[k] * t);
    }
  }

  // Hairline inset frame — it reads as a card rather than a screenshot.
  const m = 40;
  for (let y = m; y < H - m; y++) for (const x of [m, W - m - 1]) blend(c, x, y, BRAND, 0.22);
  for (let x = m; x < W - m; x++) for (const y of [m, H - m - 1]) blend(c, x, y, BRAND, 0.22);

  // The lockup: mascot beside the wordmark, the pair centred as one object.
  // No tagline — this script has no font, and the platforms that render this
  // card put og:title and og:description beside it as real text anyway, so a
  // sentence here would only be the same words twice.
  const mh = 310, wh = 100, gap = 58;
  const mw = mh * (MASCOT_W / 100), ww = wh * (WORD_W / 40);
  const left = (W - (mw + gap + ww)) / 2;
  const mascotY = (H - mh) / 2;
  drawMascot(c, mh, left, mascotY, [BRAND, [0x63, 0xb3, 0xed], BG]);
  // Optically centred against the mascot, not box-centred: the wordmark's box
  // includes the descender of the "p", which sits its letterforms high in it.
  drawWordmark(c, wh, left + mw + gap, mascotY + mh / 2 - wh * 0.56, FG);
  return c;
}

const card = toPng(socialCard());
writeFileSync("app/opengraph-image.png", card);
writeFileSync("app/twitter-image.png", card);
writeFileSync("app/opengraph-image.alt.txt", "The SwapDoor logo: a walking Sasquatch carrying an open door.\n");
writeFileSync("app/twitter-image.alt.txt", "The SwapDoor logo: a walking Sasquatch carrying an open door.\n");

console.log(
  `app/icon.svg, app/favicon.ico (${icoSizes.join("/")}), app/apple-icon.png (180), ` +
  `app/opengraph-image.png + twitter-image.png (1200×630, ${(card.length / 1024) | 0}KB)`,
);
