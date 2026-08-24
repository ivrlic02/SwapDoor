// The mascot flourish beside the hero headline (aria-hidden, no semantics).
// It frames the headline without competing with it (60-30-10 / aesthetic-
// minimalist). The right-hand side of the headline is now the turning globe in
// components/globe.tsx, which carries its own greys.

import Image from "next/image";

// The brand mascot, derived from the artwork by scripts/derive-mascot.mjs:
// cropped to its bounding box (2048² canvas → 917×1181 of actual art) so size
// is controlled purely by the caller's width class, and re-toned onto the
// palette. Two files, one per theme:
//
//   public/mascot.png        body #3E4A66 · door #7A88A6 · knob #2A3245
//   public/mascot-light.png  body #AFB8CC · door #8794B4 · knob #E3E8F2
//
// The re-toning is the point, and it is why there are two. In the source the
// *door* is darker than the bigfoot carrying it, and both tones sit within a
// hair of the #1A2030 background, so the brand's own mark disappeared. The dark
// ramp lifts the three tones above the page and makes the door the lighter
// element, as it is in the logo. The light ramp does the same job from the
// other end — the tones drop below #EAEFF7 and the door becomes the *darker*
// element, because on a pale ground it is darkness that reads as prominence.
// Both land, at opacity-35, a few values off their own background: a whisper,
// not a silhouette. That is what the user asked for in as many words, and it is
// also the 2026-08-21 landing-page finding (S2 — the mascot was the biggest,
// highest-contrast object on the first screen and carried no meaning).
//
// It happens once, in the assets, rather than with a CSS filter: a filter
// shifts both tones together and could never invert their order. Re-run the
// script if the artwork changes — it writes both files from one classification,
// so they cannot drift apart.
export function Mascot({ className }: { className?: string }) {
  return (
    <>
      <MascotImage className={`theme-dark-only ${className ?? ""}`} src="/mascot.png" />
      <MascotImage className={`theme-light-only ${className ?? ""}`} src="/mascot-light.png" />
    </>
  );
}

/** Both copies are in the DOM and CSS hides the wrong one (the two rules are at
 *  the top of app/globals.css). Deliberately not a JavaScript swap: this sits in
 *  the hero of a statically prerendered page, so choosing in React would mean
 *  either a client component in the middle of the fold or a visible change of
 *  artwork one frame after paint. Two PNGs of ~70KB, `lg`-only and decorative,
 *  is the cheaper of the two problems. */
function MascotImage({ className, src }: { className: string; src: string }) {
  return (
    <Image
      src={src}
      alt=""
      aria-hidden
      width={917}
      height={1181}
      // Mirrors the `.hero-mascot` clamp in globals.css, which is what actually
      // sets the width: it reaches its 400px cap at ~1704px of viewport, and is
      // ~316 / ~188 / ~60px at 1536 / 1280 / 1024. Stated as media queries
      // rather than the clamp() itself because `sizes` support for clamp() is
      // patchy; each band names the largest width it can reach. Without this the
      // browser would pull the full-size source for a decoration.
      sizes="(min-width: 1704px) 400px, (min-width: 1280px) 320px, (min-width: 1024px) 190px, 64px"
      className={`h-auto ${className}`}
    />
  );
}
