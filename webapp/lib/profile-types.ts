// Pure, client-safe profile types and constants — no server imports, the same
// split as lib/house-types.ts and lib/swap-types.ts, so the profile form, the
// live preview and the strength meter can all share one definition of what a
// profile contains without pulling in the server-only Supabase client.

/** Who a member usually travels with. Stored as the `value`; shown as `label`. */
export const TRAVEL_WITH = [
  { value: "solo", label: "On my own" },
  { value: "partner", label: "With my partner" },
  { value: "family", label: "With my family" },
  { value: "friends", label: "With friends" },
] as const;

export type TravelWith = (typeof TRAVEL_WITH)[number]["value"];

/**
 * What a member travels *for*. Multi-select chips rather than one dropdown:
 * people rarely travel for exactly one reason, and forcing a single answer
 * would make every profile read the same.
 */
export const TRAVEL_STYLES = [
  { value: "city", label: "City breaks" },
  { value: "beach", label: "Beach & sun" },
  { value: "nature", label: "Nature & hiking" },
  { value: "culture", label: "Culture & museums" },
  { value: "food", label: "Food & markets" },
  { value: "remote_work", label: "Working remotely" },
  { value: "family_time", label: "Family time" },
  { value: "nightlife", label: "Nightlife" },
] as const;

export type TravelStyle = (typeof TRAVEL_STYLES)[number]["value"];

/** How long a member usually goes for — the single most useful planning fact. */
export const TRIP_LENGTHS = [
  { value: "weekend", label: "A weekend" },
  { value: "week", label: "About a week" },
  { value: "two_weeks", label: "Around two weeks" },
  { value: "month_plus", label: "A month or more" },
  { value: "flexible", label: "It varies" },
] as const;

export type TripLength = (typeof TRIP_LENGTHS)[number]["value"];

/** The travel half of a profile — everything added on top of name/photo/bio. */
export type TravelProfile = {
  travelWith: TravelWith | null;
  travelStyle: TravelStyle[];
  /** Three-state on purpose: null means "hasn't said", which is not "no". */
  hasPets: boolean | null;
  smoker: boolean | null;
  typicalTrip: TripLength | null;
};

/** Label lookup, so a stored value never leaks to the screen as a raw enum. */
export function labelFor(
  list: readonly { value: string; label: string }[],
  value: string | null | undefined
): string | null {
  if (!value) return null;
  return list.find((o) => o.value === value)?.label ?? null;
}

// ---------------------------------------------------------------------------
// Profile strength
// ---------------------------------------------------------------------------
// The reason this exists: the fields on this page are the *only* thing a
// cautious host (Persona 2 Sarah, Persona 3 Mateo & Elena) has to go on when
// deciding whether to hand over their keys — but nothing on the page told a
// member which of them were still empty or why any of it mattered. Filling in a
// form and learning nothing about the result is a Gulf of Evaluation
// (Lecture 3); a meter plus one named next step closes it.
//
// The weights are not equal, and that is the point: a photo and a bio move the
// bar far more than a checkbox, because they move a host's decision far more.

export type StrengthItem = {
  /** What's missing, phrased as the action that fixes it. */
  todo: string;
  /** Anchor id of the field/section that fixes it, for the "Add …" link. */
  target: string;
  weight: number;
  done: boolean;
};

export type ProfileStrengthInput = TravelProfile & {
  avatarUrl: string | null;
  location: string | null;
  bio: string | null;
};

/**
 * Which parts of a profile are filled in, how much each is worth, and what to
 * do next. Returns items in the order they should be suggested.
 */
export function profileStrength(p: ProfileStrengthInput): {
  percent: number;
  items: StrengthItem[];
  /** The highest-value thing still missing, or null when the profile is done. */
  next: StrengthItem | null;
} {
  const items: StrengthItem[] = [
    {
      todo: "Add a profile photo",
      target: "photo",
      weight: 30,
      done: Boolean(p.avatarUrl),
    },
    {
      todo: "Write a short bio",
      target: "bio",
      weight: 25,
      done: Boolean(p.bio?.trim()),
    },
    {
      todo: "Say where you live",
      target: "location",
      weight: 15,
      done: Boolean(p.location?.trim()),
    },
    {
      todo: "Say who you travel with",
      target: "travelWith",
      weight: 10,
      done: Boolean(p.travelWith),
    },
    {
      todo: "Pick how you like to travel",
      target: "travelStyle",
      weight: 10,
      done: p.travelStyle.length > 0,
    },
    {
      todo: "Add your usual trip length",
      target: "typicalTrip",
      weight: 5,
      done: Boolean(p.typicalTrip),
    },
    {
      todo: "Answer pets and smoking",
      target: "household",
      weight: 5,
      done: p.hasPets !== null && p.smoker !== null,
    },
  ];

  const earned = items.reduce((sum, i) => sum + (i.done ? i.weight : 0), 0);
  const total = items.reduce((sum, i) => sum + i.weight, 0);

  return {
    percent: Math.round((earned / total) * 100),
    items,
    next: items.find((i) => !i.done) ?? null,
  };
}
