-- ============================================================================
-- SwapDoor — what "Verified" actually means
-- Run after schema.sql. Safe to re-run.
-- ============================================================================
--
-- Before this, `verified` was a lie with a straight face. The app computed it as
-- `seeded(house.id, 7) > 0.3` — a hash of the listing's id — so roughly 70% of
-- homes wore a ✓ that touched no fact about anybody. A member's own listing was
-- hardcoded to `false` forever, with no route to changing that.
--
-- It now means: **this host has been here a while and people who stayed with
-- them said so.** Every input already existed in the database; nothing new is
-- collected from anyone, and nothing is taken on trust from the member.
--
-- The rule lives HERE and only here. It is exposed to PostgREST as a computed
-- column on `profiles`, so the app reads `is_verified_host` as if it were a
-- stored field and can never disagree with the database about who is verified.
--
-- Scale note: these run a subquery per row, which is free at this project's size
-- (14 homes, 8 members) and would not be at 100k. The upgrade path is
-- denormalised counters on `profiles` maintained by the trigger in reviews.sql;
-- the function's signature would not change, so nothing above it would move.

-- ---------------------------------------------------------------------------
-- The thresholds. KEEP IN SYNC with THRESHOLDS in lib/trust.ts, which renders
-- the member-facing "how far along am I" checklist. This function stays the
-- authority for the badge itself — the checklist only explains it.
-- ---------------------------------------------------------------------------
--   • member for at least 90 days
--   • bio and location filled in (a blank profile is not a known person)
--   • at least 3 reviews across every home they host
--   • average rating at least 4.5
--
-- Deliberately NOT required: a profile photo. It is the strongest trust signal
-- on the site and it belongs in this rule on the merits — but no seeded host has
-- one (`avatar_url` is null for all 7), so requiring it today would mean nobody
-- is verified and every badge on the site disappears. Recorded as a decision,
-- not an oversight: seed host avatars and this line goes back in.

create or replace function public.host_review_count(p public.profiles)
returns integer
language sql
stable
as $$
  select count(*)::integer
    from public.reviews r
    join public.houses h on h.id = r.house_id
   where h.host_id = p.id;
$$;

create or replace function public.host_rating(p public.profiles)
returns numeric
language sql
stable
as $$
  -- NULL, not 0, when there are no reviews: "no rating yet" and "rated zero"
  -- are different claims, and the UI shows them differently.
  select round(avg(r.rating), 2)
    from public.reviews r
    join public.houses h on h.id = r.house_id
   where h.host_id = p.id;
$$;

create or replace function public.is_verified_host(p public.profiles)
returns boolean
language sql
stable
as $$
  select p.created_at < now() - interval '90 days'
     and coalesce(btrim(p.bio), '') <> ''
     and coalesce(btrim(p.location), '') <> ''
     and public.host_review_count(p) >= 3
     and coalesce(public.host_rating(p), 0) >= 4.5;
$$;

-- Readable by anyone, like the profiles they describe: the badge is shown on
-- public listing pages, which are served with the anon key.
grant execute on function public.host_review_count(public.profiles) to anon, authenticated;
grant execute on function public.host_rating(public.profiles)       to anon, authenticated;
grant execute on function public.is_verified_host(public.profiles)  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- houses.verified becomes an override, not the source
-- ---------------------------------------------------------------------------
-- A home now inherits its badge from whoever hosts it (that was the ask: verify
-- the person, and every home they offer follows). `houses.verified` is kept as a
-- deliberate per-home override — NULL means "ask the host", true/false forces
-- the answer from the Table Editor.
--
-- The member-created rows were written with an explicit `false` by the listing
-- form, which under the new model would pin them to "not verified" forever no
-- matter how good their host became. They are reset to NULL so they inherit;
-- the listing form now writes NULL too.
update public.houses set verified = null where verified = false;

comment on column public.houses.verified is
  'Per-home override for the Verified badge. NULL (the normal case) means the '
  'home inherits profiles.is_verified_host from its host; true/false force it.';
