-- ============================================================================
-- SwapDoor — profile extras
-- Run after schema.sql. Adds the "Travel & swap" fields a member can edit on
-- /profile, and the RPC behind "Delete account".
-- Safe to re-run: uses IF NOT EXISTS / DROP ... IF EXISTS.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Travel & swap — the questions a host actually asks before handing over keys
-- ---------------------------------------------------------------------------
-- Every one of these is NULLABLE ON PURPOSE, and the two booleans are
-- three-state (null / true / false). "Hasn't answered" is not the same claim as
-- "no pets", and a profile that silently answers on the member's behalf is the
-- same hollow trust signal the blanket "✔ verified" badge was removed for
-- (Handoff, 2026-08-15). Unanswered simply doesn't render.
alter table public.profiles add column if not exists travel_with  text;
alter table public.profiles add column if not exists travel_style text[];
alter table public.profiles add column if not exists has_pets     boolean;
alter table public.profiles add column if not exists smoker       boolean;
alter table public.profiles add column if not exists typical_trip text;

-- Values are constrained in the database as well as in the form: the form is
-- the only writer today, but RLS lets any authenticated client PATCH its own
-- row directly, so the allowed set belongs here too (Nielsen #5, at the layer
-- that can actually enforce it).
alter table public.profiles drop constraint if exists profiles_travel_with_check;
alter table public.profiles add constraint profiles_travel_with_check
  check (travel_with is null or travel_with in ('solo', 'partner', 'family', 'friends'));

alter table public.profiles drop constraint if exists profiles_typical_trip_check;
alter table public.profiles add constraint profiles_typical_trip_check
  check (
    typical_trip is null
    or typical_trip in ('weekend', 'week', 'two_weeks', 'month_plus', 'flexible')
  );

-- `<@` is "contained by": every element must be one of the known styles, and
-- the list is capped so a scripted client can't stuff it.
alter table public.profiles drop constraint if exists profiles_travel_style_check;
alter table public.profiles add constraint profiles_travel_style_check
  check (
    travel_style is null
    or (
      travel_style <@ array[
        'city', 'beach', 'nature', 'culture', 'food',
        'remote_work', 'family_time', 'nightlife'
      ]::text[]
      and coalesce(array_length(travel_style, 1), 0) <= 8
    )
  );

-- ---------------------------------------------------------------------------
-- delete_own_account() — the "Danger zone" on /profile#account
-- ---------------------------------------------------------------------------
-- A browser client holding the publishable key cannot delete an auth user
-- (that is a service-role operation), so account deletion either needs an Edge
-- Function or a SECURITY DEFINER function. This is the smaller of the two: it
-- runs as the owner, but it derives the target from auth.uid() and never takes
-- an id argument, so it can only ever delete the caller's own account.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  -- houses.host_id is ON DELETE SET NULL, so the cascade from auth.users would
  -- leave this member's listings on /explore as ownerless rows. Delete them
  -- first; their photos, reviews and swap requests cascade from there.
  delete from public.houses where host_id = uid;

  -- profiles → saved_homes / swap_requests / swap_messages all cascade from
  -- auth.users, so this one statement clears the rest.
  delete from auth.users where id = uid;
end;
$$;

-- Callable only by a signed-in user. `anon` must never reach it: without a
-- session auth.uid() is null and it would raise, but closing the endpoint is
-- cheaper than relying on that (same reasoning as handle_new_user in
-- schema.sql).
revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
