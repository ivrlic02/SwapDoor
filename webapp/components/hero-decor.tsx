// The mascot flourish beside the hero headline (aria-hidden, no semantics).
// It frames the headline without competing with it (60-30-10 / aesthetic-
// minimalist). The right-hand side of the headline is now the turning globe in
// components/globe.tsx, which carries its own greys.

import Image from "next/image";

// The brand mascot (public/mascot.png), derived from the artwork at the repo
// root by scripts/derive-mascot.mjs: cropped to its bounding box (2048² canvas
// → 917×1181 of actual art) so layout is controlled purely by the caller's
// width class, and re-toned onto the palette — body #3E4A66, door #7A88A6,
// knob #2A3245.
//
// The re-toning is the point: in the source the *door* is darker than the
// bigfoot carrying it, and both tones sit within a hair of the #1A2030
// background, so the brand's own mark disappeared. Now the door is the lighter
// element, as it is in the logo. It happens once, in the asset, because a CSS
// filter shifts both tones together and could never invert their order.
// Re-run the script if the artwork changes.
export function Mascot({ className }: { className?: string }) {
  return (
    <Image
      src="/mascot.png"
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
      className={`h-auto ${className ?? ""}`}
    />
  );
}
