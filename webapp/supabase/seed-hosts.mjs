// Seed demo host accounts for SwapDoor.
//
// Creates one auth user per host via the public sign-up endpoint (email
// auto-confirm must be ON — it is for this project). The DB trigger
// `handle_new_user` auto-creates each profile with the full_name passed here.
// After running this, apply supabase/seed-hosts.sql to fill in each profile's
// location/bio and assign houses to hosts.
//
// Safe to re-run: an already-registered email just reports "exists" and is skipped.
//
// Usage:  node supabase/seed-hosts.mjs
// Reads the public URL + publishable key from .env.local (no secrets needed).

import { readFileSync } from "node:fs";

function readEnv(file = ".env.local") {
  const out = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const env = readEnv();
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PASSWORD = "SwapDoorHost!2025"; // shared demo password for all host accounts

export const HOSTS = [
  { email: "alex.chen@swapdoor.dev", full_name: "Alex Chen" },
  { email: "sarah.miller@swapdoor.dev", full_name: "Sarah Miller" },
  { email: "mateo.elena@swapdoor.dev", full_name: "Mateo & Elena Ruiz" },
  { email: "sofia.rossi@swapdoor.dev", full_name: "Sofia Rossi" },
  { email: "lars.eriksson@swapdoor.dev", full_name: "Lars Eriksson" },
  { email: "kenji.tanaka@swapdoor.dev", full_name: "Kenji Tanaka" },
  { email: "amara.okafor@swapdoor.dev", full_name: "Amara Okafor" },
];

async function signUp({ email, full_name }) {
  const res = await fetch(`${BASE}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD, data: { full_name } }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.ok && body.user) return { email, status: "created", id: body.user.id };
  const msg = (body.msg || body.error_description || body.error || "").toLowerCase();
  if (msg.includes("already") || msg.includes("registered"))
    return { email, status: "exists" };
  return { email, status: `error ${res.status}`, detail: body };
}

for (const host of HOSTS) {
  const r = await signUp(host);
  console.log(`${r.status.padEnd(10)} ${r.email}${r.id ? "  " + r.id : ""}`);
  if (r.detail) console.log("   ", JSON.stringify(r.detail).slice(0, 300));
}
console.log(`\nDemo password for every host account: ${PASSWORD}`);
