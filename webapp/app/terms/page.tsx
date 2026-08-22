import type { Metadata } from "next";
import { LegalDoc, type LegalSection } from "@/components/legal-doc";
import { pageMetadata } from "@/lib/seo";

// The other page the footer used to promise and not have ("Terms (soon)").
//
// Written to match what the app actually enforces rather than to sound legal:
// the no-self-review and no-duplicate-review rules below are RLS policies and a
// unique index in supabase/reviews.sql, and the "a swap is between the two of
// you" clause is literally true of the data model — swap_requests has two
// participants and SwapDoor is neither of them.
export const metadata: Metadata = pageMetadata({
  title: "Terms – SwapDoor",
  shareTitle: "Terms of use",
  description:
    "The rules for using SwapDoor: what you may list, what a swap is and is not, and what a student project can and cannot promise you.",
  path: "/terms",
});

const SECTIONS: LegalSection[] = [
  {
    heading: "What SwapDoor is",
    body: [
      "A place for members to offer their homes and arrange to exchange them with each other. SwapDoor introduces the two of you and carries the conversation. It is not a travel agency, a booking platform or an escrow service.",
      "It is also coursework. Treat it as a demonstration, not as a way to plan a real trip: data may be reset, features may change without notice, and the site may go offline when the course ends.",
    ],
  },
  {
    heading: "Your account",
    bullets: [
      "One account per person, with an email address you can actually receive mail at.",
      "Keep your password to yourself. Anything done from your account is treated as done by you.",
      "You must be old enough to enter into an agreement about a home where you live — 18 in most places.",
      "You can close your account whenever you like, from Profile → Account settings.",
    ],
  },
  {
    heading: "What you may list",
    bullets: [
      "Only a home you actually have the right to offer — one you own, or one you may lawfully let someone else stay in.",
      "Photos of that home, taken by you or used with permission. Not stock photos of a nicer place.",
      "A description and amenities that are true. Availability dates you intend to honour.",
      "You may unlist or edit a home at any time from My listings.",
    ],
  },
  {
    heading: "Reviews",
    body: [
      "Reviews exist so members can judge each other honestly, which only works if they are honest.",
    ],
    bullets: [
      "Write about a stay or an exchange you actually had.",
      "You cannot review a home you host, and you cannot review the same home twice. The database refuses both, so this is a rule rather than a request.",
      "You can edit or delete a review you wrote. You cannot edit anybody else's.",
      "Reviews that are abusive, or that are aimed at a person rather than at a stay, can be removed.",
    ],
  },
  {
    heading: "A swap is between the two of you",
    body: [
      "When a swap request is accepted, the agreement is between the two members. SwapDoor is not a party to it.",
      "That means SwapDoor does not hold money, does not guarantee that a home is as described, does not insure anyone's property, and cannot compensate you if a swap falls through. Read the listing, read the reviews, and talk to the other person before you commit — the message thread is there for exactly that.",
      "Anything either of you agrees outside the app — keys, cleaning, pets, deposits — is between the two of you.",
    ],
  },
  {
    heading: "Content you upload",
    body: [
      "Your photos and your words stay yours. By publishing them here you allow SwapDoor to display them on the site so other members can see your listing and your profile. That permission ends when you remove the content or delete your account.",
    ],
  },
  {
    heading: "No warranty",
    body: [
      "The site is provided as it is, with no promise that it will be available, correct or free of faults. To the extent the law allows, the project and its authors are not liable for any loss arising from using it — which is the honest position for a piece of university coursework rather than a disclaimer borrowed from a company.",
    ],
  },
  {
    heading: "Changes",
    body: [
      "These terms can change as the project does. The date at the top of this page is when they last did.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalDoc
      eyebrow="Legal"
      title="Terms of use"
      intro="The rules for using SwapDoor — what you may list, what a swap is and is not, and what a student project can honestly promise you."
      updated="22 August 2026"
      sections={SECTIONS}
    />
  );
}
