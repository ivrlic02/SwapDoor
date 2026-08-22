// Initials avatar — a self-contained circle with a host's initials, so we never
// depend on an external image (no 404s, no next/image remote-host config, works
// in light/dark). On-brand tint keeps it inside the blue palette (Lecture 6).
// Pure and hook-free, so it renders in both Server and Client Components.
//
// When a `src` is given (a profile picture uploaded to Supabase Storage) the
// photo is shown instead, with the initials still rendered *underneath* it as
// the fallback: if the file 404s or is slow, the circle is never empty.

import Image from "next/image";

export function initials(name: string): string {
  const words = name.replace(/&/g, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  src,
  size = 40,
  className = "",
}: {
  name: string;
  /** Profile picture URL. Falls back to the initials circle when absent. */
  src?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand/15 font-semibold text-accent select-none ${className}`}
    >
      {initials(name)}
      {src && (
        <Image
          src={src}
          alt=""
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      )}
    </span>
  );
}
