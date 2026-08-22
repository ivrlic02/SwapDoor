import type { Metadata } from "next";
import { LegalDoc, type LegalSection } from "@/components/legal-doc";
import { pageMetadata } from "@/lib/seo";

// The page the footer used to promise and not have ("Privacy (soon)").
//
// Everything below is true of this codebase rather than copied from a policy
// generator: the tables named are the tables in supabase/schema.sql, the third
// parties named are the four the app actually calls (Supabase, the CARTO tile
// CDN, Nominatim, Unsplash), and the deletion route named is the RPC that
// really exists — `delete_own_account()` in supabase/profile.sql. A privacy
// page that lists services the app does not use is worse than no page at all.
export const metadata: Metadata = pageMetadata({
  title: "Privacy – SwapDoor",
  shareTitle: "Privacy",
  description:
    "What SwapDoor stores, where it is stored, who else sees it, and how to delete all of it — written for a student project, in plain language.",
  path: "/privacy",
});

const SECTIONS: LegalSection[] = [
  {
    heading: "What we store",
    body: [
      "Only what the app needs to work. Everything here is something you typed, uploaded or chose:",
    ],
    bullets: [
      "Your account — email address and a password, handled by Supabase Auth. We never see or store the password itself, only a hash of it.",
      "Your profile — name, location, bio, profile photo, and the optional Travel & swap answers (who you travel with, trip length, pets, smoking).",
      "Your listings — title, description, city and country, map coordinates, photos, amenities and availability dates for any home you publish.",
      "Your activity — homes you save to your wishlist, reviews you write, swap requests you send or receive, and the messages in those threads.",
    ],
  },
  {
    heading: "What we do not do",
    bullets: [
      "No payments. SwapDoor never asks for card or bank details, because nothing on it costs anything.",
      "No advertising, and no selling or sharing of your data with anyone.",
      "No analytics or tracking cookies. The only cookie the site sets is the Supabase session cookie that keeps you signed in.",
      "No identity documents. The ✓ Verified badge is a record of time and reviews on SwapDoor, not a check of anyone's ID.",
    ],
  },
  {
    heading: "Where it is stored",
    body: [
      "In a Supabase project — a hosted Postgres database with file storage for photos. Every table has Row Level Security switched on, which means the database itself refuses to return a row to someone who is not allowed to read it, rather than relying on the app to remember to filter.",
      "Practically: your swap messages are readable by you and by the other person in that thread, and by nobody else. Your listings and reviews are public, because that is what they are for. Your email address is never shown to other members.",
    ],
  },
  {
    heading: "Other services the pages call",
    body: ["Four, and only for the job named:"],
    bullets: [
      "Supabase — the database, file storage and sign-in behind everything above.",
      "CARTO — the map tiles. Loading a map means your browser requests image tiles from their CDN, which sees your IP address the way any image request does.",
      "OpenStreetMap Nominatim — used once, to turn an address typed freehand into map coordinates while you are publishing a listing. Picking a city from the list does not call it.",
      "Unsplash — the source of the demo listing photos. Photos you upload go to Supabase Storage, not to Unsplash.",
    ],
  },
  {
    heading: "Your data is yours",
    body: [
      "You can change anything you have entered from your profile page at any time, and unlist any home you have published.",
      "You can also delete the whole account: Profile → Account settings → Danger zone. That removes your account, your profile and the homes you host. It is immediate and it cannot be undone.",
      "Reviews you have written about other people's homes stay, because deleting them would rewrite someone else's rating after the fact — but they are no longer attached to a profile anyone can open.",
    ],
  },
  {
    heading: "Questions",
    body: [
      "This project is coursework, so there is no support desk. Questions about the data, or a request to have something removed, are best raised as an issue on the project repository — the link is in the footer.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalDoc
      eyebrow="Legal"
      title="Privacy"
      intro="What SwapDoor stores about you, where it lives, who else can see it, and how to delete all of it."
      updated="22 August 2026"
      sections={SECTIONS}
    />
  );
}
