// Shared blur placeholder for remote (Unsplash) images. next/image can't
// auto-generate a blur for remote sources, so we hand it a tiny inlined SVG in
// the surface colour — the photo fades in from a soft slate block instead of a
// blank rectangle (less layout jank, better perceived speed + LCP/CLS).
// The SVG: an 8×6 rect filled with --color-surface (#232b3e).
export const BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4JyBoZWlnaHQ9JzYnPjxyZWN0IHdpZHRoPScxMDAlJyBoZWlnaHQ9JzEwMCUnIGZpbGw9JyMyMzJiM2UnLz48L3N2Zz4=";
