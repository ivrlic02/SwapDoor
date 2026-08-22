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
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
