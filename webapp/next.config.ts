import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the Next.js dev badge (the little "N" in the corner during `next dev`).
  // It never shows in production anyway; this removes it locally too.
  devIndicators: false,
  images: {
    // Listing photos are served from Unsplash. Allowing the host lets us use
    // <Image> (automatic resizing, lazy-loading, AVIF/WebP) for a better
    // PageSpeed score than a raw <img>.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      // Profile pictures and user-uploaded listing photos live in Supabase
      // Storage (public buckets `avatars` / `house-photos`). The hostname is
      // wildcarded on the project ref so this keeps working if the project is
      // ever recreated; the path is pinned to the public object route so no
      // other Supabase endpoint can be proxied through the image optimizer.
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // YouTube poster frames for the blog's `video` blocks. The player itself
      // is only loaded on click (components/video-embed.tsx), so this hostname
      // serves the still image that stands in for it — pinned to the thumbnail
      // path so nothing else on the host can be routed through the optimizer.
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/vi/**",
      },
    ],
    // The optimizer re-encodes every photo, so a listing JPEG is compressed
    // twice (Unsplash's own q=80, then ours). At the default 75 that showed as
    // grain in smooth gradients — sky, water, painted walls. 90 for the big
    // hero/lightbox shots; 75 stays the default for thumbnails and cards.
    // Next 16 only serves qualities listed here (the default allows [75] alone).
    qualities: [75, 90],
    // AVIF first (~20-30% smaller than WebP at equal quality), WebP fallback.
    //
    // Measured against production on 2026-08-24: at 1080px a cold AVIF encode
    // is ~1.4s against ~0.9s for WebP, but the AVIF is 79 KB against 134 KB and
    // a WARM hit answers in 0.17s either way. So AVIF only loses on the FIRST
    // request for a given (photo, width, quality) — which is a caching problem,
    // fixed by `minimumCacheTTL` below and by scripts/warm-images.mjs, and not a
    // reason to serve everyone 70% more bytes for the rest of the deployment.
    formats: ["image/avif", "image/webp"],
    // ── The three settings below are what actually made the photos fast ──
    //
    // Every optimized image is cached per (url, width, quality, format). The
    // default TTL is 4 hours, so a demo that is opened twice in a day paid the
    // full cold encode twice — and a graded run, or a PageSpeed audit, almost
    // always landed on an expired cache. 31 days means the first visitor after
    // a deploy warms an entry and everyone after them is served from the edge.
    // Safe here because a photo's URL is content-addressed: uploads get random
    // names (lib/storage.ts) and re-seeds overwrite a fixed path, so a changed
    // image is a changed URL, which is a different cache key.
    minimumCacheTTL: 2678400, // 31 days
    // How many widths a `sizes` image offers. Defaults are
    // [640,750,828,1080,1200,1920,2048,3840] + [32,48,64,96,128,256,384] = 15
    // candidates per <img>, and every candidate is ~200 characters of srcset in
    // the HTML *and* a separate cache entry that has to be encoded once. On
    // /explore that was 323 KB of HTML, most of it URLs nobody would request.
    //
    // Ten candidates cover the same devices (the neighbours are within ~15% of
    // each other, which is under a JPEG's worth of detail) while cutting the
    // markup and roughly halving the number of cold encodes — each remaining
    // width is now warmed by more visitors, so more of them hit.
    //
    // 3840 is gone for a second reason: the source masters are 2400px wide and
    // next/image never upscales, so a `w=3840` request spent 2.3s to hand back
    // the same pixels as `w=2048` — the slowest request on the site, serving no
    // one.
    deviceSizes: [640, 828, 1080, 1440, 1920, 2048],
    imageSizes: [64, 128, 256, 384],
  },
};

export default nextConfig;
