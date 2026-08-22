import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { RouteProgress } from "@/components/route-progress";
import { SavedProvider } from "@/components/saved-context";
import { ProfileProvider } from "@/components/profile-context";
import { SwapsProvider } from "@/components/swaps-context";

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
    <html lang="en" data-scroll-behavior="smooth">
      {/* `id="top"` is the target of that link. A plain fragment anchor means
          the control is real HTML: no client component, no JavaScript, and it
          still works if the bundle fails to load. */}
      <body
        id="top"
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <RouteProgress />
        <ProfileProvider>
          <SavedProvider>
            <SwapsProvider>{children}</SwapsProvider>
          </SavedProvider>
        </ProfileProvider>
      </body>
    </html>
  );
}
