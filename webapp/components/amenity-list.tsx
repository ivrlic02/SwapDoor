import { AMENITIES, type Amenity } from "@/lib/house-types";

// "What this home offers".
//
// Explore lets you FILTER by amenity, but until now the listing page never
// showed them — so a search for "Workspace + Pool" landed on a page that
// couldn't confirm either. That's a Gulf of Evaluation (Lecture 3): the user
// can't check the result against the goal. This closes it.
//
// What's missing is listed too, struck through: an honest listing says what it
// doesn't have, and it saves the cautious personas a message to the host.
export function AmenityList({ amenities }: { amenities: Amenity[] }) {
  const has = new Set(amenities);
  const missing = AMENITIES.filter((a) => !has.has(a));

  return (
    <div>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {amenities.map((a) => (
          <li key={a} className="flex items-center gap-3 text-fg">
            <span className="text-muted">
              <AmenityIcon name={a} />
            </span>
            {a}
          </li>
        ))}
      </ul>

      {missing.length > 0 && (
        <p className="mt-5 border-t border-border/60 pt-4 text-sm text-muted">
          Not available:{" "}
          {missing.map((a, i) => (
            <span key={a}>
              <span className="line-through">{a}</span>
              {i < missing.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

// One line-art icon per amenity, drawn in the same 24px stroke style as the
// card icons (CRAP: repetition). Icon + label always travel together, so the
// meaning never rests on a glyph alone.
function AmenityIcon({ name }: { name: Amenity }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: "shrink-0",
  };

  switch (name) {
    case "Wi-Fi":
      return (
        <svg {...common}>
          <path d="M2 8.8a16 16 0 0 1 20 0M5 12.5a11 11 0 0 1 14 0M8.5 16a6 6 0 0 1 7 0" />
          <circle cx="12" cy="19.5" r="1" fill="currentColor" />
        </svg>
      );
    case "Workspace":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M2 20h20M9 16v4M15 16v4" />
        </svg>
      );
    case "Kitchen":
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M4 9h16M8 6h.01M11 6h.01" />
        </svg>
      );
    case "Washer":
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <circle cx="12" cy="14" r="4" />
          <path d="M8 6.5h.01M11 6.5h.01" />
        </svg>
      );
    case "Free parking":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M9.5 17V7.5h3a3 3 0 0 1 0 6h-3" />
        </svg>
      );
    case "Air conditioning":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="9" rx="2" />
          <path d="M7 9.5h10M7 17c1.5 0 1.5 2 3 2M14 17c1.5 0 1.5 2 3 2" />
        </svg>
      );
    case "Pool":
      return (
        <svg {...common}>
          <path d="M2 17c2 0 2 1.6 4 1.6S8 17 10 17s2 1.6 4 1.6S16 17 18 17s2 1.6 4 1.6" />
          <path d="M7 15V5.5A2.5 2.5 0 0 1 12 5M17 15V5.5A2.5 2.5 0 0 0 12 5M7 10h10" />
        </svg>
      );
    case "Pets allowed":
      return (
        <svg {...common}>
          <circle cx="7" cy="9" r="2" />
          <circle cx="12" cy="6.5" r="2" />
          <circle cx="17" cy="9" r="2" />
          <path d="M12 11c-2.5 0-4.5 2.2-4.5 4.4C7.5 17.4 9 18.5 12 18.5s4.5-1.1 4.5-3.1C16.5 13.2 14.5 11 12 11Z" />
        </svg>
      );
    case "Family friendly":
      return (
        <svg {...common}>
          <circle cx="8" cy="7" r="2.5" />
          <circle cx="16.5" cy="9" r="2" />
          <path d="M3.5 19c0-2.8 2-4.8 4.5-4.8s4.5 2 4.5 4.8M14 19c0-2.2 1.1-3.8 2.8-3.8S20 16.8 20 19" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 12.5l2.5 2.5 4.5-5" />
        </svg>
      );
  }
}
