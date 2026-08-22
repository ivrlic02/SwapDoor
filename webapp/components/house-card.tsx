import Link from "next/link";
import type { House } from "@/lib/houses";
import { Avatar } from "@/components/avatar";
import { SaveButton } from "@/components/save-button";
import { CardGallery } from "@/components/card-gallery";

// Shared listing card used by both the Explore grid and the home "Trending"
// row, so every listing looks and behaves the same (CRAP: repetition +
// consistency).
//
// The card chrome (border/hover/focus) lives on the outer <div>, not the
// <Link>, so the wishlist heart and the gallery arrows can sit OUTSIDE the
// anchor — an interactive element must never nest inside another. The photo
// area is a client <CardGallery> (swipe + dots); the text below is a plain
// <Link> to the listing.
export function HouseCard({ house, priority = false }: { house: House; priority?: boolean }) {
  const images = house.images && house.images.length > 0 ? house.images : [house.image];
  const href = `/explore/${house.id}`;

  return (
    <div className="group relative bg-surface border border-border rounded-2xl overflow-hidden transition duration-200 hover:border-brand hover:shadow-lg hover:shadow-black/20 hover:-translate-y-1 focus-within:ring-2 focus-within:ring-brand">
      <CardGallery
        images={images}
        alt={`${house.name} in ${house.location}, ${house.country}`}
        href={href}
        priority={priority}
        overlay={
          // Badges are decorative overlays — pointer-events-none so a tap on the
          // photo still opens the listing.
          //
          // The `key` looks pointless on a lone element, but this element is
          // created in a Server Component and handed to a Client Component
          // (CardGallery) as a prop, where it lands in a children position that
          // React's dev-mode key check validates. Without it, rendering this
          // card from a server page logs a spurious "unique key prop" warning.
          <div key="badges" className="pointer-events-none absolute inset-0">
            {/* Rating + review count — bottom-left, text + icon (colour-blind safe).
                A home with no reviews yet says "New" instead of a star: a
                just-published listing has no rating, and printing "★ 0.0" (or a
                made-up score) is exactly the kind of hollow trust signal the
                blanket "verified" badge was removed for. */}
            <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-black/65 backdrop-blur px-2.5 py-1 text-xs font-semibold text-white">
              {house.reviewCount ? (
                <>
                  <span aria-hidden className="text-accent">★</span>
                  {house.rating.toFixed(1)}
                  <span className="font-normal text-white/70">· {house.reviewCount}</span>
                </>
              ) : (
                "New"
              )}
            </span>

            {/* Verified badge — only on genuinely verified homes (Lecture 6). */}
            {house.verified && (
              <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-black/65 backdrop-blur px-2.5 py-1 text-xs font-semibold text-white">
                <span aria-hidden className="text-success">✓</span>
                Verified
              </span>
            )}
          </div>
        }
      />

      {/* Wishlist heart — above the gallery arrows/dots (no nested interactive). */}
      <SaveButton houseId={house.id} className="absolute top-3 right-3 z-20" />

      <Link href={href} className="block focus:outline-none">
        <div className="p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-semibold leading-snug truncate">{house.name}</h3>
            <span
              className="shrink-0 text-sm font-semibold text-fg"
              title="Estimated nightly value — SwapDoor is a home swap, so no cash changes hands"
            >
              <span className="text-muted font-normal">Est. </span>
              ${house.pricePerNight.toLocaleString()}
              <span className="text-muted font-normal"> /night</span>
            </span>
          </div>

          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
            <PinIcon />
            <span className="truncate">
              {house.location}, {house.country}
            </span>
          </p>

          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <GuestIcon />
            Up to {house.maxGuests} guests
          </p>

          {/* Host — makes each listing feel owned by a real person */}
          {house.host && (
            <p className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3 text-sm text-muted">
              <Avatar name={house.host.name} src={house.host.avatarUrl} size={26} />
              <span className="truncate">
                Hosted by <span className="font-medium text-fg">{house.host.name}</span>
              </span>
            </p>
          )}
        </div>
      </Link>
    </div>
  );
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-muted">
      <path
        d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function GuestIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-muted">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
