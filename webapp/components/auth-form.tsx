"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Mode = "sign-in" | "sign-up";

// Where to land after a successful sign-in. Callers that gate an action behind
// login (the wishlist heart, the swap panel, "List Your Home") append
// `?next=/the/page`, so the user resumes what they were doing instead of being
// dropped on the homepage (Nielsen #3, user control and freedom).
//
// Only same-origin *paths* are honoured. A value like `//evil.com` is a
// protocol-relative URL that the browser would treat as another host, so
// anything that isn't a single leading slash is discarded.
function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  // "Get started free" in the CTA promises a new account, so it must not land
  // on the Sign In tab and make the reader find the other one (Nielsen #4: the
  // control does what its label says). Anything other than `sign-up` — a
  // mistyped value, or no parameter at all — keeps the sign-in default, which
  // is right for every link that gates an action behind login.
  const [mode, setMode] = useState<Mode>(
    params.get("mode") === "sign-up" ? "sign-up" : "sign-in"
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!isSupabaseConfigured) {
      setError(
        "Supabase is not configured yet. Add your keys to .env.local to enable sign in."
      );
      return;
    }

    setLoading(true);
    const supabase = createClient();

    if (mode === "sign-in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else {
        router.refresh();
        router.push(next);
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) setError(error.message);
      else setMessage("Check your email to confirm your account, then sign in.");
    }

    setLoading(false);
  }

  return (
    <div className="mt-10 text-left">
      {/* Mode switch */}
      <div className="flex rounded-lg border border-border overflow-hidden mb-8">
        <button
          type="button"
          onClick={() => setMode("sign-in")}
          className={`flex-1 py-3 font-medium transition ${
            mode === "sign-in" ? "bg-brand text-white" : "text-muted hover:text-fg"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setMode("sign-up")}
          className={`flex-1 py-3 font-medium transition ${
            mode === "sign-up" ? "bg-brand text-white" : "text-muted hover:text-fg"
          }`}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {mode === "sign-up" && (
          <div className="flex flex-col gap-2">
            <label htmlFor="fullName" className="text-sm text-muted">
              Full name
            </label>
            <input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-surface border border-border rounded-lg px-4 py-3 outline-none focus:border-brand"
              placeholder="Alex Chen"
              required
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm text-muted">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-surface border border-border rounded-lg px-4 py-3 outline-none focus:border-brand"
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm text-muted">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-surface border border-border rounded-lg px-4 py-3 outline-none focus:border-brand"
            placeholder="••••••••"
            minLength={6}
            required
          />
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}
        {message && <p className="text-success text-sm">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-brand hover:bg-brand-hover text-white rounded-lg px-6 py-3 font-semibold transition disabled:opacity-60"
        >
          {loading
            ? "Please wait…"
            : mode === "sign-in"
              ? "Sign In"
              : "Create Account"}
        </button>
      </form>
    </div>
  );
}
