import type { CSSProperties } from "react";
import {
  MASCOT_BODY,
  MASCOT_DOOR,
  MASCOT_KNOB,
  MASCOT_SILHOUETTE,
  MASCOT_VIEWBOX,
  WORDMARK_PATH,
  WORDMARK_VIEWBOX,
} from "@/lib/brand-art";

// The SwapDoor brand, in one place.
//
// Everything here draws the real logo artwork — traced to vector by
// scripts/trace-logo.mjs, so it recolours with the tokens in globals.css and
// stays crisp from a 16px favicon to a 630px social card. Nothing in the app
// should draw a door or a mascot of its own; import from here instead. That is
// the same discipline globals.css already applies to colour: one definition,
// every surface follows it (Nielsen #4 consistency; CRAP repetition).
//
//   <DoorMark>      the nav's home link — a closed door that the mascot opens
//   <MascotGlyph>   the logo's figure, static: body, carried door, knob
//   <Wordmark>      "SwapDoor" as the logo draws it, not as a font draws it
//   <Lockup>        the two together, for the footer, sign-in and social card

/**
 * The animated mark in the navbar.
 *
 * At rest it is a closed door. When the link around it is hovered or focused,
 * the door swings open on its hinge, warm light fills the opening and the
 * mascot walks out and stands beside the frame — the logo's own story, told in
 * the 380ms a pointer rests on a link.
 *
 * The motion is feedforward, not decoration (Lecture 2): the mark IS the home
 * link, and a logo that reacts to the pointer is a logo that admits it is
 * clickable. It is never the only signifier — the link carries a real label and
 * `aria-current` — because a state carried by motion alone is no state at all
 * for anyone who has asked their OS to stop moving things.
 *
 * The ancestor that should trigger it needs the class `doormark-trigger`; all
 * of the geometry and the motion live in the `.door-mark` block in globals.css,
 * driven by the single `--dm` (mark height) custom property set here.
 */
export function DoorMark({ size = 30 }: { size?: number }) {
  return (
    <span
      className="door-mark"
      style={{ "--dm": `${size}px` } as CSSProperties}
      aria-hidden
    >
      {/* The doorway: the light, and the mascot standing in it. */}
      <span className="door-mark__view">
        <span className="door-mark__glow" />
        <svg className="door-mark__sq" viewBox={MASCOT_VIEWBOX} focusable="false">
          <path d={MASCOT_SILHOUETTE} />
        </svg>
      </span>
      {/* The frame, then the door itself — drawn over the opening so that
          closing it hides everything behind it. */}
      <span className="door-mark__jamb" />
      <span className="door-mark__hinge">
        <span className="door-mark__panel">
          <span className="door-mark__knob" />
        </span>
      </span>
    </span>
  );
}

/**
 * The logo's figure, static: the mascot mid-stride with the door he carries.
 *
 * `MASCOT_BODY` is the silhouette with the door punched out of it, so the door
 * is a separate shape drawn over the hole in the accent tone — which is what
 * makes the door read as lighter than the body, the way the logo has it, rather
 * than as a darker patch on his chest.
 */
export function MascotGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox={MASCOT_VIEWBOX}
      className={className}
      aria-hidden
      focusable="false"
    >
      <path d={MASCOT_BODY} fillRule="evenodd" fill="var(--color-brand)" />
      <path d={MASCOT_DOOR} fill="var(--color-accent)" />
      <circle
        cx={MASCOT_KNOB.cx}
        cy={MASCOT_KNOB.cy}
        r={MASCOT_KNOB.r}
        fill="var(--color-bg)"
      />
    </svg>
  );
}

/**
 * "SwapDoor" as the logo draws it. Inherits `currentColor`.
 *
 * Deliberately NOT used in the navbar, where the wordmark stays live text: it
 * has to reflow, shrink and disappear at the phone breakpoint, and a screen
 * reader should meet the site's name as a word. Here it is for the places where
 * the wordmark is a picture of the brand rather than a piece of the interface.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox={WORDMARK_VIEWBOX}
      className={className}
      fill="currentColor"
      role="img"
      aria-label="SwapDoor"
      focusable="false"
    >
      <path d={WORDMARK_PATH} fillRule="evenodd" />
    </svg>
  );
}

/**
 * Mascot + wordmark. `vertical` stacks them the way the source artwork does
 * (for a page that leads with the brand — sign-in, the social card);
 * `horizontal` sets them side by side, for a footer column or a byline.
 */
export function Lockup({
  orientation = "horizontal",
  className = "",
}: {
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  const vertical = orientation === "vertical";
  return (
    <span
      className={`flex ${
        vertical ? "flex-col items-center gap-3" : "items-center gap-2.5"
      } ${className}`}
    >
      <MascotGlyph className={vertical ? "h-16 w-auto" : "h-8 w-auto"} />
      <Wordmark className={vertical ? "h-7 w-auto" : "h-4 w-auto"} />
    </span>
  );
}
