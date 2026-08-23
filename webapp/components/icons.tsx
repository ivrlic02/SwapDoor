import type { SVGProps } from "react";

// One icon set, drawn as stroked vectors on a 24×24 grid.
//
// This replaces the emoji that /how-it-works and the shared How-it-Works
// section used for their step and trust icons (🔍 💬 🔑 🌏 🛡️ ⭐). Emoji are
// font glyphs: every OS draws them differently — Apple renders a colour
// cartoon, Windows a flat two-tone, Android something else again — so the one
// element the eye reads first was the one element that looked different on
// every machine. That breaks CRAP *Repetition* (Lecture 5) and Nielsen #2
// *Consistency and standards* (Lecture 4) on the page whose whole job is to
// look trustworthy, and it sat oddly beside a site that otherwise draws its
// brand from traced vectors (`lib/brand-art.ts`).
//
// These inherit `currentColor` and a 1.6 stroke, so they take the accent colour
// like everything else and stay legible at 20px.

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function Icon({ title, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

// ── Mobile chrome ───────────────────────────────────────────────────────────
// The drawer trigger, its close control and one mark per nav destination.
// Added when the mobile drawer was rebuilt: the trigger used to be a "☰" text
// character and the destinations had no marks at all, so the phone menu was
// the one surface on the site not drawn from this set (CRAP repetition).

export function MenuIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2} {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Icon>
  );
}

export function CompassIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15 9-2 4.2-4 1.8 2-4.2z" />
    </Icon>
  );
}

export function RouteIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
      <path d="M9 6.5h5a3.5 3.5 0 0 1 0 7h-4a3.5 3.5 0 0 0 0 7h5" />
    </Icon>
  );
}

export function ArticleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="4.5" width="16" height="15" rx="2.5" />
      <path d="M8 9h8M8 12.5h8M8 16h5" />
    </Icon>
  );
}

export function SlidersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 8h10M18 8h2M4 16h4M12 16h8" />
      <circle cx="16" cy="8" r="2" />
      <circle cx="10" cy="16" r="2" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </Icon>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z" />
    </Icon>
  );
}

export function MessageIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 14.5a2.5 2.5 0 0 1-2.5 2.5H9l-4 3v-3H6.5A2.5 2.5 0 0 1 4 14.5v-7A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5z" />
      <path d="M8.5 9.5h7M8.5 12.5h4" />
    </Icon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3.5v4M16 3.5v4" />
      <path d="m9.5 15 2 2 3.5-3.5" />
    </Icon>
  );
}

export function KeyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="16" r="3.5" />
      <path d="m10.5 13.5 8-8M16 8l2 2M13.5 10.5l2 2" />
    </Icon>
  );
}

export function ShieldCheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5 19 6v6c0 4-3 7.2-7 8.5-4-1.3-7-4.5-7-8.5V6z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m12 4 2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8z" />
    </Icon>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16M12 4c2.2 2.2 3.3 5 3.3 8s-1.1 5.8-3.3 8c-2.2-2.2-3.3-5-3.3-8s1.1-5.8 3.3-8" />
    </Icon>
  );
}

export function LightbulbIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 17h6M10 20h4" />
      <path d="M12 3.5a5.5 5.5 0 0 0-3.2 10 2.6 2.6 0 0 1 1 2h4.4a2.6 2.6 0 0 1 1-2A5.5 5.5 0 0 0 12 3.5" />
    </Icon>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.9" r=".9" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4.5 21 19.5H3z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="16.8" r=".9" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5 16 12l-6 3.5z" fill="currentColor" />
    </Icon>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 12h15M14 6.5 19.5 12 14 17.5" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 7h15M9.5 7V5.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7" />
      <path d="M6.5 7v11.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V7M10 11v5M14 11v5" />
    </Icon>
  );
}

export function ChevronUpIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 14.5 6-6 6 6" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 9.5 6 6 6-6" />
    </Icon>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 19.5h4L19 9a2.1 2.1 0 0 0-3-3L5.5 16.5z" />
      <path d="m14.5 7.5 2 2" />
    </Icon>
  );
}

export function CodeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m8.5 8.5-4 3.5 4 3.5M15.5 8.5l4 3.5-4 3.5M13.5 5.5l-3 13" />
    </Icon>
  );
}

/** How-it-Works trust cards name their icon as a string in the CMS, so an
 *  editor picks from a list instead of pasting an emoji. Unknown names fall
 *  back to the shield rather than rendering nothing. */
export const TRUST_ICONS = {
  verified: ShieldCheckIcon,
  message: MessageIcon,
  star: StarIcon,
  globe: GlobeIcon,
  home: HomeIcon,
  key: KeyIcon,
} as const;

export type TrustIconName = keyof typeof TRUST_ICONS;

export const TRUST_ICON_NAMES = Object.keys(TRUST_ICONS) as TrustIconName[];

export function TrustIcon({ name, ...props }: IconProps & { name: string }) {
  const Cmp = TRUST_ICONS[name as TrustIconName] ?? ShieldCheckIcon;
  return <Cmp {...props} />;
}
