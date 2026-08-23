import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { ProfileForm } from "@/components/profile-form";
import { TrustChecklist } from "@/components/trust-checklist";
import { MyReviews } from "@/components/my-reviews";
import { AccountSettings } from "@/components/account-settings";
import { getMyHostReviews, getMyWrittenReviews } from "@/lib/houses";

// Private page — the proxy (middleware) redirects signed-out users to /sign-in.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your profile · SwapDoor",
};

export default async function ProfilePage() {
  // Fetched on the server, and both at once: reviews are read-only here, and
  // the cookie-based client already knows who is asking, so there is no reason
  // to make the browser round-trip for them after paint.
  const [aboutMyHomes, writtenByMe] = await Promise.all([
    getMyHostReviews(),
    getMyWrittenReviews(),
  ]);

  return (
    <main className="bg-bg min-h-screen text-fg">
      <Navigation />

      <section className="max-w-7xl mx-auto px-4 pt-8 pb-14 sm:px-6 lg:pt-14 lg:pb-20">
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">Your profile</h1>
          <p className="text-muted mt-2 max-w-2xl">
            This is what a host reads before agreeing to swap homes with you. The
            cautious ones read all of it.
          </p>
        </header>

        <ProfileForm />
        <TrustChecklist />
        <MyReviews aboutMyHomes={aboutMyHomes} writtenByMe={writtenByMe} />
        <AccountSettings />
      </section>

      <Footer />
    </main>
  );
}
