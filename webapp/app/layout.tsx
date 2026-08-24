import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { RouteProgress } from "@/components/route-progress";
import { WelcomeBanner } from "@/components/welcome-banner";
import { SavedProvider } from "@/components/saved-context";
import { ProfileProvider } from "@/components/profile-context";
import { SwapsProvider } from "@/components/swaps-context";
import { DEFAULT_THEME, THEME_BOOTSTRAP } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TITLE = "SwapDoor – Swap Homes. Travel Better.";
const DESCRIPTION =
  "SwapDoor is a community-driven home exchange platform. Trade homes with verified travelers worldwide and experience authentic living without accommodation costs.";

// Where the site lives, for turning app/opengraph-image.png into the absolute
// URL a social platform needs. Without it Next falls back to localhost:3000 and
// every shared link previews as a broken image. Vercel injects the production
// domain itself, so the only thing to set by hand is a custom domain, via
// NEXT_PUBLIC_SITE_URL.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: TITLE,
  description: DESCRIPTION,
  // Every other page states its own canonical through lib/seo.ts; the homepage
  // is the one route that has no generateMetadata of its own, so it says it
  // here. Without it `/` was the only page shipping no canonical at all.
  alternates: { canonical: "/" },
  // The image itself is app/opengraph-image.png (+ twitter-image.png); Next
  // finds those by filename and fills in the url/width/height/type tags.
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "SwapDoor",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `data-scroll-behavior="smooth"` is not decoration — it is the Next 16
    // opt-in that makes `scroll-behavior: smooth` safe. Next used to force the
    // value to `auto` around every SPA navigation and restore it afterwards, so
    // route changes stayed instant; as of 16 it only does that when this
    // attribute is present. Without it, the smooth scroll the footer's "Back to
    // top" link wants would also apply to every route change, animating the
    // jump to the top of each new page.
    // `data-theme` is the switch the whole palette hangs off (see the light
    // block in app/globals.css). It is rendered with the site's default, so the
    // prerendered HTML is complete and correct on its own — `/` stays static and
    // the page is right with JavaScript off. `suppressHydrationWarning` is here
    // because the script below may have changed it before React ever ran: React
    // then keeps the DOM instead of treating the difference as a hydration error
    // and re-rendering from the nearest boundary.
    <html
      lang="en"
      data-scroll-behavior="smooth"
      data-theme={DEFAULT_THEME}
      suppressHydrationWarning
    >
      <head>
        {/* Runs synchronously while the browser parses the head — before the
            first paint, and long before React exists. That ordering is the
            entire reason it is an inline script and not an effect: a
            useLayoutEffect runs after hydration, so on a slow connection the
            visitor would see a full dark page repaint to light. Source and
            reasoning live in lib/theme.ts. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      {/* `id="top"` is the target of that link. A plain fragment anchor means
          the control is real HTML: no client component, no JavaScript, and it
          still works if the bundle fails to load. */}
      <body
        id="top"
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <RouteProgress />
        {/* "Your account is ready" after signing up. It lives here, not on a
            page, because sign-up honours ?next= and so has no fixed
            destination — see components/welcome-banner.tsx. <Suspense> is not
            optional: the banner reads the query string, and without the
            boundary that would opt every statically prerendered route in the
            site out of prerendering to greet one new member. */}
        <Suspense fallback={null}>
          <WelcomeBanner />
        </Suspense>
        <ProfileProvider>
          <SavedProvider>
            <SwapsProvider>{children}</SwapsProvider>
          </SavedProvider>
        </ProfileProvider>
      </body>
    </html>
  );
}
