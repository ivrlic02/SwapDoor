"use client";

import { useEffect, useMemo, useRef } from "react";
import type { House } from "@/lib/house-types";
import { landCoverage } from "@/lib/land-mask";

/*
  The hero's right-hand decoration: a slowly turning globe whose continents are
  drawn as a field of small typographic marks. The ocean is left empty and the
  sphere's edge is a dashed limb ring, so the only thing carrying shape is the
  land itself. The SwapDoor homes sit on it as pins — the real listings, from
  the same `houses` rows the Leaflet maps below are drawn from, so a home
  published through /list-your-home appears here too — and every few seconds an
  arc travels between two of them, one swap. Decorative only: aria-hidden,
  pointer-events-none from the caller, and it never becomes a target (a
  clickable-looking globe that does nothing is a false affordance, Lecture 2).

  The first version marked the ocean too, only dimmer, and the continents were
  unreadable: a mark every ~9px could not resolve a coastline, and the two tones
  were too close to separate figure from ground (Lecture 5). Drawing land alone
  fixes both at once and costs *less*, because land is a third of the sphere —
  the point cloud is now spaced ~4-6px, three to four times denser than before,
  while fewer marks actually reach the screen.

  Why a <canvas> and not an <svg>: this is a few thousand marks, each of which
  moves every frame. As SVG that is a DOM write per mark per frame; on canvas it
  is one drawImage from a pre-rendered sprite, which is why the marks are built
  once into small offscreen canvases instead of being stroked (or set as text —
  a glyph set would also depend on whichever mono font the visitor happens to
  have).

  Costs are kept deliberately small: the point cloud and the sprites are built
  once per size, the back half of the sphere is skipped, the loop is capped at
  24fps and to 1.5× device pixels, and it stops entirely when scrolled out of
  view or the tab is hidden.
  `prefers-reduced-motion` gets a single static frame.
*/

// Decoration greys, the same pair the mascot artwork was recoloured to in
// hero-decor.tsx — the light tone for the continents, the dark line tone for
// the limb ring, so the land carries the contrast (Lecture 5) without adding a
// colour.
const LIMB = "#5e6b85";
const LAND = "#c6d0e0";
const ACCENT_FALLBACK = "#63b3ed";

const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const TILT = (20 * Math.PI) / 180; // axial tilt, so it reads as a globe not a disc
const SPIN_MS = 55_000; // one revolution — slow enough to never pull the eye
// 24fps: at one revolution a minute a mark travels well under a pixel per
// frame, so this is indistinguishable from 60 and costs a third as much.
const FRAME_MS = 1000 / 24;
const MARKS = 8;

// Where the spin starts: Europe/Africa facing the viewer, which is where most
// of the listings are. A point at longitude L faces front when spin = L − 90°.
const START_SPIN = ((10 - 90) * Math.PI) / 180;

// Two homes in the same town are one place on a globe: at this size a degree of
// arc is only two or three pixels, so drawing them separately produces a
// smeared dot rather than the information that there are two. They merge into
// one pin instead, and the pin grows a little — which is the fact worth
// carrying at this scale (WHERE SwapDoor has homes, and roughly how thickly),
// not a per-listing count nobody can read off a 2px mark.
//
// The threshold is a dot product between unit vectors, not a difference in
// degrees, so it means the same thing near the poles as it does at the equator.
const PIN_MERGE = Math.cos((1.2 * Math.PI) / 180);

type Pin = {
  v: [number, number, number];
  homes: number;
};

/** Groups listings into one pin per place. Homes without coordinates are skipped. */
function clusterHomes(houses: House[]): Pin[] {
  const pins: Pin[] = [];
  for (const house of houses) {
    if (typeof house.lat !== "number" || typeof house.lng !== "number") continue;
    const v = unitVec(house.lat, house.lng);
    // Greedy, and O(homes × places) — but "places" grows far more slowly than
    // listings do, and this runs once per data change, not per frame.
    const near = pins.find((p) => p.v[0] * v[0] + p.v[1] * v[1] + p.v[2] * v[2] >= PIN_MERGE);
    if (near) near.homes++;
    else pins.push({ v, homes: 1 });
  }
  return pins;
}

// Arc phases in ms — draw, hold, fade, then a pause before the next pair.
const ARC_GROW = 2200;
const ARC_HOLD = 1200;
const ARC_FADE = 900;
const ARC_GAP = 1600;
const ARC_CYCLE = ARC_GROW + ARC_HOLD + ARC_FADE + ARC_GAP;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Points = {
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  shape: Uint8Array;
  cover: Float32Array; // 0…1 land coverage; only points above 0 are kept
  count: number; // marks kept
  sampled: number; // points the sphere was sampled at, to detect a resize
};

/** Unit vector for a lat/lng, matching the inverse used to sample the mask. */
function unitVec(lat: number, lng: number): [number, number, number] {
  const a = (lat * Math.PI) / 180;
  const o = (lng * Math.PI) / 180;
  const c = Math.cos(a);
  return [c * Math.cos(o), Math.sin(a), c * Math.sin(o)];
}

/** Stable per-index pseudo-random in [0, 1) — same marks on every render. */
function rand(i: number): number {
  return (Math.imul(i ^ 0x9e3779b9, 2654435761) >>> 0) / 4294967296;
}

// The full vocabulary reads as typography only while a mark is a handful of
// pixels across; below that a `T` or a `⌙` is mush, so small globes get the
// three shapes that survive being tiny (dot, square, bar).
function pickShape(u: number, big: boolean): number {
  if (!big) return u < 0.5 ? 0 : u < 0.8 ? 3 : 1;
  if (u < 0.22) return 3;
  if (u < 0.42) return 1;
  if (u < 0.56) return 2;
  if (u < 0.7) return 5;
  if (u < 0.84) return 4;
  if (u < 0.94) return 6;
  return 0;
}

/** Draws one mark into a sprite of `s` device pixels. */
function drawMark(ctx: CanvasRenderingContext2D, shape: number, s: number, color: string) {
  const u = (v: number) => v * s;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, s * 0.12);
  ctx.beginPath();
  switch (shape) {
    case 0: // dot
      ctx.arc(u(0.5), u(0.5), u(0.15), 0, TAU);
      ctx.fill();
      return;
    case 1: // vertical bar
      ctx.fillRect(u(0.43), u(0.1), u(0.14), u(0.8));
      return;
    case 2: // horizontal bar
      ctx.fillRect(u(0.1), u(0.43), u(0.8), u(0.14));
      return;
    case 3: // filled square
      ctx.fillRect(u(0.27), u(0.27), u(0.46), u(0.46));
      return;
    case 4: // ⌐ corner
      ctx.moveTo(u(0.15), u(0.2));
      ctx.lineTo(u(0.85), u(0.2));
      ctx.lineTo(u(0.85), u(0.8));
      break;
    case 5: // T
      ctx.moveTo(u(0.12), u(0.22));
      ctx.lineTo(u(0.88), u(0.22));
      ctx.moveTo(u(0.5), u(0.22));
      ctx.lineTo(u(0.5), u(0.86));
      break;
    case 6: // ⌙
      ctx.moveTo(u(0.2), u(0.14));
      ctx.lineTo(u(0.2), u(0.8));
      ctx.lineTo(u(0.84), u(0.8));
      break;
    default: // )
      ctx.arc(u(0.28), u(0.5), u(0.4), -Math.PI / 2.4, Math.PI / 2.4);
      break;
  }
  ctx.stroke();
}

function buildSprites(size: number, color: string): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = [];
  for (let shape = 0; shape < MARKS; shape++) {
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const cx = c.getContext("2d");
    if (cx) drawMark(cx, shape, size, color);
    out.push(c);
  }
  return out;
}

// Sample the sphere evenly (Fibonacci spiral — no clustering at the poles the
// way a lat/lng grid gives) and keep only the points that touch land. Roughly a
// third survive, which is why the spiral can be sampled several times finer
// than the old version at a lower drawing cost.
function buildPoints(sampled: number, big: boolean): Points {
  const x: number[] = [];
  const y: number[] = [];
  const z: number[] = [];
  const shape: number[] = [];
  const cover: number[] = [];
  for (let i = 0; i < sampled; i++) {
    const py = 1 - (i / (sampled - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - py * py));
    const t = i * GOLDEN_ANGLE;
    const px = Math.cos(t) * r;
    const pz = Math.sin(t) * r;
    const c = landCoverage(
      (Math.asin(py) * 180) / Math.PI,
      (Math.atan2(pz, px) * 180) / Math.PI
    );
    if (c <= 0) continue; // open water — nothing is drawn there at all
    x.push(px);
    y.push(py);
    z.push(pz);
    cover.push(c);
    shape.push(pickShape(rand(i), big));
  }
  return {
    x: Float32Array.from(x),
    y: Float32Array.from(y),
    z: Float32Array.from(z),
    shape: Uint8Array.from(shape),
    cover: Float32Array.from(cover),
    count: x.length,
    sampled,
  };
}

export function Globe({ houses = [], className }: { houses?: House[]; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  const pins = useMemo(() => clusterHomes(houses), [houses]);

  // The draw loop reads the pins through a ref rather than closing over them,
  // so new listings can appear without the setup effect tearing the canvas down
  // and restarting the spin from Greenwich mid-scroll.
  const pinsRef = useRef(pins);
  useEffect(() => {
    pinsRef.current = pins;
  }, [pins]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const accent =
      getComputedStyle(document.documentElement).getPropertyValue("--color-accent").trim() ||
      ACCENT_FALLBACK;

    let points: Points | null = null;
    let sprites: HTMLCanvasElement[] = [];
    let size = 0;
    let radius = 0;
    let glyph = 0;

    let spin = START_SPIN;
    let arcFrom = 0;
    let arcTo = 1;
    let arcStart = 0;

    // Rebuild everything that depends on the rendered size. Cheap enough to run
    // on resize (a few thousand mask lookups), and it only runs when the box
    // actually changed width.
    function layout(): boolean {
      const el = ref.current;
      if (!el || !ctx) return false;
      const css = Math.round(el.getBoundingClientRect().width);
      if (css < 8) return false;
      // Capped at 1.5 rather than 2: the marks are a few pixels across, so the
      // extra resolution is invisible while it doubles the pixels a retina
      // screen has to clear and composite every frame.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      el.width = Math.round(css * dpr);
      el.height = Math.round(css * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      size = css;
      radius = (css / 2) * 0.94; // margin for the pin halos
      // Marks sit 4–6px apart on screen, tighter than a coastline's own detail,
      // which is what makes a continent read as a shape instead of a dither.
      // 6px is what the reference density works out to on a 520px globe; the
      // 4px floor keeps a small globe from becoming four dots per continent.
      const spacing = clamp(css / 85, 4, 6);
      glyph = spacing * 0.9;
      // Points are sampled over the whole sphere and then filtered down to
      // land, so this is the sampling count, not the number that gets drawn —
      // about a third survives, and half of those face the viewer.
      const sampled = clamp(
        Math.round((Math.PI * css * css) / (2 * spacing * spacing)),
        600,
        16000
      );
      if (!points || points.sampled !== sampled) points = buildPoints(sampled, spacing >= 5);
      const sprite = Math.max(8, Math.ceil(glyph * dpr * 1.3));
      sprites = buildSprites(sprite, LAND);
      return true;
    }

    // Screen x, screen y, depth — written into a shared slot rather than
    // returned, since the hot loop calls this a couple of thousand times a
    // frame and a fresh array each time is pure garbage.
    const proj = new Float64Array(3);

    /** Spin about the polar axis, then the fixed tilt, then flat projection. */
    function project(
      x: number,
      y: number,
      z: number,
      cs: number,
      sn: number,
      ct: number,
      st: number
    ) {
      const xr = x * cs + z * sn;
      const zr = z * cs - x * sn;
      const yt = y * ct - zr * st;
      // Screen x is *negated*: with `+` the front meridian runs the other way
      // and the whole world comes out mirrored — Madagascar to the west of
      // Africa. Paired with a spin that counts down (see the loop), east is on
      // the right and the surface drifts right, the way Earth is seen from
      // space with north up.
      proj[0] = size / 2 - xr * radius;
      proj[1] = size / 2 - yt * radius;
      proj[2] = y * st + zr * ct;
    }

    function draw(now: number) {
      if (!ctx || !points) return;
      ctx.clearRect(0, 0, size, size);
      const cs = Math.cos(spin);
      const sn = Math.sin(spin);
      const ct = Math.cos(TILT);
      const st = Math.sin(TILT);

      // The limb: a dashed ring in the dark tone. With no marks on the water it
      // is the only thing that says "sphere" where the visible face is ocean,
      // and dashes keep it in the same dotted language as the continents rather
      // than ruling a hard circle around them.
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = LIMB;
      ctx.lineWidth = Math.max(1, glyph * 0.3);
      ctx.setLineDash([Math.max(1, glyph * 0.3), Math.max(3, glyph)]);
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, radius, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);

      const { x, y, z, shape, cover, count } = points;
      for (let i = 0; i < count; i++) {
        project(x[i], y[i], z[i], cs, sn, ct, st);
        const depth = proj[2];
        if (depth <= 0.02) continue; // far side — never drawn
        // Coverage carries the coastline: a mark straddling one is smaller and
        // dimmer than one well inland, so the edge softens instead of jagging.
        const c = cover[i];
        const s = glyph * (0.55 + 0.45 * c) * (0.7 + 0.3 * depth);
        ctx.globalAlpha = (0.35 + 0.65 * c) * (0.35 + 0.65 * depth);
        ctx.drawImage(sprites[shape[i]], proj[0] - s / 2, proj[1] - s / 2, s, s);
      }

      // The swap arc, drawn under the pins so the pins stay the brightest thing.
      // Read fresh every frame: the list can change under us when new listings
      // arrive, so the two endpoints are re-picked from whatever is there now.
      const pins = pinsRef.current;
      const elapsed = now - arcStart;
      if (elapsed > ARC_CYCLE) {
        arcStart = now;
        if (pins.length > 1) {
          arcFrom = Math.floor(Math.random() * pins.length);
          arcTo = (arcFrom + 1 + Math.floor(Math.random() * (pins.length - 1))) % pins.length;
        }
      }
      const grown = clamp(elapsed / ARC_GROW, 0, 1);
      const arcAlpha =
        elapsed <= ARC_GROW + ARC_HOLD
          ? 1
          : clamp(1 - (elapsed - ARC_GROW - ARC_HOLD) / ARC_FADE, 0, 1);
      if (arcAlpha > 0 && pins.length > 1) {
        // Clamped: the indices were chosen against an earlier, possibly longer
        // list, and an out-of-range read here would blank the arc.
        const a = pins[Math.min(arcFrom, pins.length - 1)].v;
        const b = pins[Math.min(arcTo, pins.length - 1)].v;
        const dot = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1);
        const omega = Math.acos(dot);
        const sinO = Math.sin(omega);
        if (sinO > 1e-3) {
          ctx.globalAlpha = arcAlpha * 0.8;
          ctx.strokeStyle = accent;
          ctx.lineWidth = Math.max(1, radius * 0.009);
          ctx.lineCap = "round";
          ctx.beginPath();
          let pen = false;
          let headX = 0;
          let headY = 0;
          let headVisible = false;
          const steps = 48;
          for (let k = 0; k <= steps; k++) {
            const t = (k / steps) * grown;
            // Great-circle interpolation, lifted off the surface in the middle
            // so the arc reads as a hop between two places, not a scribble.
            const w0 = Math.sin((1 - t) * omega) / sinO;
            const w1 = Math.sin(t * omega) / sinO;
            const lift = 1 + 0.22 * Math.sin(Math.PI * t);
            project(
              (a[0] * w0 + b[0] * w1) * lift,
              (a[1] * w0 + b[1] * w1) * lift,
              (a[2] * w0 + b[2] * w1) * lift,
              cs,
              sn,
              ct,
              st
            );
            if (proj[2] <= 0) {
              pen = false; // gone round the back — break the line, don't cut across
              continue;
            }
            if (pen) ctx.lineTo(proj[0], proj[1]);
            else ctx.moveTo(proj[0], proj[1]);
            pen = true;
            headX = proj[0];
            headY = proj[1];
            headVisible = true;
          }
          ctx.stroke();
          // A dot riding the leading end while the arc is still drawing.
          if (grown < 1 && headVisible) {
            ctx.globalAlpha = arcAlpha;
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.arc(headX, headY, Math.max(1.4, radius * 0.017), 0, TAU);
            ctx.fill();
          }
        }
      }

      // The homes themselves — one pin per place, not per listing.
      const pinBase = Math.max(1.5, radius * 0.014);
      for (const p of pins) {
        project(p.v[0], p.v[1], p.v[2], cs, sn, ct, st);
        const depth = proj[2];
        if (depth <= 0.03) continue;
        const fade = 0.25 + 0.75 * depth;
        // Log-scaled and capped at +55%: a city with twenty listings should
        // read as busier than one with two, without growing into a blob that
        // swallows its neighbours at the next zoom level down.
        const pin = pinBase * (1 + Math.min(0.55, Math.log2(p.homes) * 0.2));
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.18 * fade;
        ctx.beginPath();
        ctx.arc(proj[0], proj[1], pin * 2.4, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 0.9 * fade;
        ctx.beginPath();
        ctx.arc(proj[0], proj[1], pin, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    // One static frame: the globe and its homes, no spin and no arcs.
    function drawStill() {
      spin = START_SPIN;
      arcStart = -ARC_CYCLE * 2; // outside every phase, so no arc is drawn
      draw(0);
    }

    let frame = 0;
    let last = 0;
    let acc = 0;
    let visible = true;
    let onScreen = true;
    let ready = false;

    function loop(now: number) {
      frame = requestAnimationFrame(loop);
      if (!last) last = now;
      const dt = Math.min(now - last, 100); // a backgrounded tab must not lurch
      last = now;
      acc += dt;
      if (acc < FRAME_MS) return; // capped at 24fps — nothing here needs 60
      // Counts *down*: with the negated screen x above, that is what makes the
      // surface drift to the right rather than backwards.
      spin = (spin - (acc / SPIN_MS) * TAU) % TAU;
      acc = 0;
      draw(now);
    }

    function running() {
      return ready && visible && onScreen && !reduced.matches;
    }

    // Start or stop the loop to match the current conditions.
    function sync() {
      if (running()) {
        if (!frame) {
          last = 0;
          if (!arcStart) arcStart = performance.now();
          frame = requestAnimationFrame(loop);
        }
      } else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    }

    // (Re)measure and repaint. `layout()` fails while the canvas has no box —
    // it is display:none below lg — so this also covers the case of a window
    // being widened past that breakpoint after mount, which is why the
    // observers below are attached unconditionally.
    function refresh() {
      ready = layout();
      if (!ready) {
        sync();
        return;
      }
      if (reduced.matches) {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        drawStill();
        return;
      }
      sync();
      if (!frame) draw(performance.now()); // paused: still repaint at the new size
    }

    refresh();

    const onVisibility = () => {
      visible = !document.hidden;
      sync();
    };
    const onReduced = () => refresh();
    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { threshold: 0 }
    );
    const ro = new ResizeObserver(() => refresh());

    io.observe(canvas);
    ro.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);
    reduced.addEventListener("change", onReduced);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", onReduced);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={className} />;
}
