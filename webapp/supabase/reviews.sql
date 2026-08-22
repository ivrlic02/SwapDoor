-- ============================================================================
-- SwapDoor — members can write reviews
-- Run after schema.sql and trust.sql. Safe to re-run.
-- ============================================================================
--
-- `reviews` has existed since day one with an INSERT policy, and nothing has
-- ever been able to use it: there was no UI, so every review on the site came
-- from seed-reviews.sql. This file is what has to be true *before* a Write a
-- review button can exist, because the policy as written was:
--
--     with check (auth.uid() = author_id)
--
-- which permits any signed-in member to review any home, **including their
-- own**, **any number of times**. Putting a form on top of that would have made
-- the Verified badge in trust.sql farmable by its own host, five stars at a
-- time — the exact hollow signal that badge is meant to stop being.

-- ---------------------------------------------------------------------------
-- One review per person per home
-- ---------------------------------------------------------------------------
-- Enforced as a constraint rather than by the form, so it holds for a client
-- talking to PostgREST directly. Partial on `author_id is not null` because a
-- deleted account sets its reviews' author to NULL (schema.sql), and several
-- authorless reviews of one home are fine.
create unique index if not exists reviews_author_house_uniq
  on public.reviews (author_id, house_id)
  where author_id is not null;

-- ---------------------------------------------------------------------------
-- Who may write, edit and remove a review
-- ---------------------------------------------------------------------------
drop policy if exists "Users can write their own reviews" on public.reviews;
drop policy if exists "Members can review a home they do not host" on public.reviews;
create policy "Members can review a home they do not host"
  on public.reviews for insert
  with check (
    auth.uid() = author_id
    and not exists (
      select 1 from public.houses h
       where h.id = reviews.house_id
         and h.host_id = auth.uid()
    )
  );

-- Editing was the gap that made a typo permanent and public (Nielsen #3). The
-- author stays fixed: `with check` re-tests ownership after the change, so a
-- review cannot be handed to somebody else.
drop policy if exists "Users can edit their own reviews" on public.reviews;
create policy "Users can edit their own reviews"
  on public.reviews for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

-- (The DELETE policy already exists in schema.sql.)

-- ---------------------------------------------------------------------------
-- Keep houses.rating and houses.review_count honest
-- ---------------------------------------------------------------------------
-- Both are denormalised onto `houses` for cheap card rendering, and schema.sql
-- refreshes them with a hand-run UPDATE — fine while the only writer was a seed
-- script, useless the moment members write reviews: every card would show the
-- rating it had on seeding day, forever. Worse, `rating` is one of the four
-- inputs to the Verified badge, so a stale value would decide who wears it.
--
-- SECURITY DEFINER is required, not decorative: the person writing the review
-- is by definition not the home's host, and the UPDATE policy on `houses` is
-- owner-only, so the trigger cannot run with the reviewer's own privileges.
create or replace function public.sync_house_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  touched bigint[];
  target  bigint;
begin
  -- An UPDATE that moved a review between homes has to fix both of them.
  touched := array_remove(array[old.house_id, new.house_id], null);

  foreach target in array touched loop
    update public.houses h
       set review_count = (
             select count(*) from public.reviews r where r.house_id = h.id
           ),
           rating = coalesce((
             select round(avg(r.rating), 2) from public.reviews r where r.house_id = h.id
           ), 0)
     where h.id = target;
  end loop;

  return null; -- AFTER trigger; the return value is not used
end;
$$;

-- Trigger-only, so it must not also be reachable as a PostgREST RPC (the same
-- hardening handle_new_user got in schema.sql).
revoke execute on function public.sync_house_rating() from public, anon, authenticated;

drop trigger if exists reviews_sync_house on public.reviews;
create trigger reviews_sync_house
  after insert or update or delete on public.reviews
  for each row execute function public.sync_house_rating();

-- Bring every existing row in line with what the trigger will maintain from
-- here on, so the switch-over doesn't leave old drift in place.
update public.houses h
   set review_count = (select count(*) from public.reviews r where r.house_id = h.id),
       rating = coalesce(
         (select round(avg(r.rating), 2) from public.reviews r where r.house_id = h.id), 0);
