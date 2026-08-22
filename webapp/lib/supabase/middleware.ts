import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./config";

// Routes that require a session. Everything reachable from the account menu
// that shows or writes personal data lives here.
const PRIVATE_PREFIXES = [
  "/dashboard", // saved homes
  "/profile", // profile + account settings
  "/my-listings", // homes this user hosts
  "/list-your-home", // the listing form writes as the signed-in host
  "/swaps", // swap requests + the conversation on each one
  // The CMS. This gate only checks that SOMEBODY is signed in — being an admin
  // is a separate question, answered in app/admin/layout.tsx (which 404s a
  // member) and enforced for real by the RLS policies in supabase/cms.sql.
  // Middleware deliberately does not query the database: it runs on every
  // request to the whole site, and a role lookup here would put a query in
  // front of every page load to save one on /admin.
  "/admin",
];

// Keeps the Supabase auth session fresh on every request and (optionally)
// guards protected routes. If Supabase isn't configured yet, it's a no-op.
export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: don't run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Gate private content. `next` carries the destination through sign-in, so
  // the user resumes where they were aiming instead of landing on the homepage
  // (Nielsen #3, user control and freedom).
  const isPrivate = PRIVATE_PREFIXES.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  );
  if (!user && isPrivate) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
