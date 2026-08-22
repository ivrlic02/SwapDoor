import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Handles the redirect from Supabase after email confirmation / OAuth / an
// email-address change. Exchanges the one-time credential for a session, then
// sends the user on.
//
// Two shapes arrive here, and which one depends on the template and flow rather
// than on anything this app chooses:
//   ?code=…                    — the PKCE exchange (sign-up, OAuth)
//   ?token_hash=…&type=…       — a verification link (email_change, recovery)
// Handling only the first was fine while sign-up was the sole path through
// here; "Change email" on /profile#account can produce the second, and an
// unhandled link would have bounced the member to /sign-in?error=auth with
// their address unchanged and no explanation.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Same-origin paths only — `next` arrives in a link the user may have been
  // handed, so it must never be able to name another host.
  const raw = searchParams.get("next");
  const next = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth`);
}
