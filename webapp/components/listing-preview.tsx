import Image from "next/image";
import { Avatar } from "@/components/avatar";
import type { HomeType } from "@/lib/house-types";

// The card the host is actually building, rendered live while they type.
//
// Until now the listing form asked for eleven things and never showed what any
// of them produced: you found out what your home looked like *after* publishing,
// on a listing you can't edit. That's a textbook Gulf of Evaluation (Lecture 3),
// and the site already solved the same problem on /profile with its "How hosts
// see you" card — this is the same idea for the bigger commitment.
//
// It deliberately mirrors components/house-card.tsx (same radii, same badge
// positions, same "Est. $X /night" wording, same host row) so the preview is a
// promise the Explore grid keeps — CRAP repetition, Nielsen #2. What it drops is
// everything interactive: no wishlist heart, no gallery arrows, no link. A
// preview that could be clicked would be a false affordance (Lecture 2).
export function ListingPreview({
  name,
  location,
  country,
  type,
  maxGuests,
  value,
  photo,
  photoCount,
  hostName,
  hostAvatar,
}: {
  name: string;
  location: string;
  country: string;
  type: HomeType;
  maxGuests: number;
  value: string;
  photo: string | null;
  photoCount: number;
  hostName: string;
  hostAvatar: string | null;
}) {
  const place = [location.trim(), country.trim()].filter(Boolean).join(", ");
  const numericValue = Number(value);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      {/* No photo area at all until there is a photo. An empty 4:3 box labelled
          "your cover photo shows here" is a placeholder for a step the host
          hasn't reached yet — it fills the panel with something that isn't
          their listing (Nielsen #9). Once photos exist it appears, including
          when they come back to step 1 to change the name. */}
      {photo && (
        <div className="relative aspect-[4/3] w-full bg-surface-2">
          <Image
            src={photo}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 380px"
            className="object-cover"
          />
          {photoCount > 1 && (
            <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
              1 / {photoCount}
            </span>
          )}

          {/* A home nobody has stayed in has no rating — the real card says
              "New" rather than inventing a score, so the preview does too. */}
          <span className="absolute bottom-3 left-3 rounded-full bg-black/65 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            New
          </span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className={`truncate font-semibold leading-snug ${name.trim() ? "" : "text-muted"}`}>
            {name.trim() || "Your home's name"}
          </h3>
          <span className="shrink-0 text-sm font-semibold text-fg">
            {numericValue > 0 ? (
              <>
                <span className="font-normal text-muted">Est. </span>
                ${numericValue.toLocaleString()}
                <span className="font-normal text-muted"> /night</span>
              </>
            ) : (
              <span className="font-normal text-muted">Est. value</span>
            )}
          </span>
        </div>

        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
          <PinIcon />
          <span className="truncate">{place || "City, country"}</span>
        </p>

        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          <GuestIcon />
          {type} · up to {maxGuests} guest{maxGuests === 1 ? "" : "s"}
        </p>

        <p className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3 text-sm text-muted">
          <Avatar name={hostName} src={hostAvatar} size={26} />
          <span className="truncate">
            Hosted by <span className="font-medium text-fg">{hostName}</span>
          </span>
        </p>
      </div>
    </div>
  );
}

function PinIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0 text-muted"
    >
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
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0 text-muted"
    >
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
