// The footer's one link look, in one place — the same discipline `buttonClass`
// applies to buttons (Nielsen #4 consistency; CRAP repetition). It lives in its
// own module because both halves of the footer need it: <Footer> is a Server
// Component and <FooterAccount> is a Client one.
//
// Three things it fixes over the old `hover:text-fg transition`:
//
//  • **An underline on hover.** Colour alone was the only signal that these
//    were links, and it was a *muted → foreground* shift — a change in
//    lightness of the same hue, which is the one difference Lecture 6 warns is
//    hardest to see. The underline is a second, non-colour signifier.
//  • **A visible focus ring**, matching the one in button.tsx exactly, so a
//    keyboard user can see where they are. The footer had none at all.
//  • **`ring-offset-surface-2`**, because the footer now sits on `surface-2`.
//    An offset ring drawn in the wrong ground colour reads as a halo.
export const footerLinkClass =
  "rounded-sm underline-offset-4 transition hover:text-fg hover:underline " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-surface-2";
