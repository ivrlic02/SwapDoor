-- ============================================================================
-- SwapDoor — swap requests + messaging
-- ============================================================================
-- Until now the site's primary CTA ("Propose a swap") collected dates and
-- guests and then told the user, honestly, that nothing was built behind it.
-- This is that missing half: a real proposal a host receives, answers, and
-- talks about — the "secure messaging with every swap" every trust line on the
-- site already promises.
--
-- Two tables, because a swap conversation has no reason to exist before there
-- is a swap to discuss: the thread hangs off the request, and the request's two
-- participants ARE the thread's access list. Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- swap_requests
-- ---------------------------------------------------------------------------
create table if not exists public.swap_requests (
  id               bigint generated always as identity primary key,
  -- The home being asked for, and its owner. host_id is denormalised so every
  -- policy on this table (and on swap_messages) is a plain column comparison
  -- instead of a join into houses — it is filled by the trigger below, never
  -- by the client.
  house_id         bigint not null references public.houses(id) on delete cascade,
  host_id          uuid   not null references public.profiles(id) on delete cascade,
  guest_id         uuid   not null references public.profiles(id) on delete cascade,
  -- This is a SWAP, not a booking: the requester may offer one of their own
  -- listings back. Nullable on purpose — a member with no listing yet must
  -- still be able to ask, and saying "I don't have a home listed yet" out loud
  -- is better than a gate that silently blocks the primary CTA.
  offered_house_id bigint references public.houses(id) on delete set null,
  check_in         date not null,
  check_out        date not null,
  guests           integer not null check (guests >= 1),
  message          text check (message is null or char_length(message) <= 1000),
  status           text not null default 'pending'
                     check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  -- Per-participant read marks. One timestamp per side is enough to derive
  -- "unread" for the badge and the thread list, and costs one UPDATE per open
  -- instead of a row per message per reader.
  guest_read_at    timestamptz not null default now(),
  host_read_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint swap_requests_dates_ordered check (check_out > check_in),
  constraint swap_requests_not_self check (guest_id <> host_id)
);

create index if not exists swap_requests_host_idx  on public.swap_requests (host_id, status);
create index if not exists swap_requests_guest_idx on public.swap_requests (guest_id, status);
create index if not exists swap_requests_house_idx on public.swap_requests (house_id);

-- One open ask per home per person. Without this, a double-click on the CTA
-- (or an impatient re-send) puts two identical pending rows in the host's
-- inbox. Re-proposing after a decline is still allowed — only 'pending' is
-- constrained.
create unique index if not exists swap_requests_one_pending_idx
  on public.swap_requests (house_id, guest_id)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- Validation: fill host_id from the house, and enforce in the database what the
-- calendar already enforces in the UI.
-- ---------------------------------------------------------------------------
-- The picker strikes out days outside the host's window and disables presets
-- that would not fit (Nielsen #5, error prevention). That is the UI's job, and
-- it stops honest mistakes — but it is client-side, so it stops nothing else.
-- The same rules live here, where they are actually a guarantee.
--
-- Dates are compared as ISO text against houses.date / houses.available_to,
-- which are text columns: 'YYYY-MM-DD' sorts identically as text and as date,
-- and this way a malformed row can never raise a cast error inside a trigger.
create or replace function public.validate_swap_request()
returns trigger
language plpgsql
security definer set search_path = public
as $fn$
declare
  h_host      uuid;
  h_guests    integer;
  h_from      text;
  h_to        text;
  h_found     boolean;
begin
  select host_id, max_guests, date, available_to, true
    into h_host, h_guests, h_from, h_to, h_found
    from public.houses
   where id = new.house_id;

  if not coalesce(h_found, false) then
    raise exception 'That home no longer exists.';
  end if;
  if h_host is null then
    raise exception 'That home has no host to receive a swap request.';
  end if;
  if h_host = new.guest_id then
    raise exception 'You cannot propose a swap on your own home.';
  end if;

  -- Never trust the client for the recipient.
  new.host_id := h_host;

  if h_guests is not null and new.guests > h_guests then
    raise exception 'This home sleeps %, so % guests will not fit.', h_guests, new.guests;
  end if;
  if h_from is not null and new.check_in::text < h_from then
    raise exception 'The host is not open to swaps before %.', h_from;
  end if;
  if h_to is not null and new.check_out::text > h_to then
    raise exception 'The host is not open to swaps after %.', h_to;
  end if;

  -- You may only offer a home you actually host.
  if new.offered_house_id is not null
     and not exists (select 1 from public.houses o
                      where o.id = new.offered_house_id and o.host_id = new.guest_id) then
    raise exception 'You can only offer a home you host.';
  end if;

  return new;
end;
$fn$;

revoke execute on function public.validate_swap_request() from public, anon, authenticated;

drop trigger if exists swap_requests_validate on public.swap_requests;
create trigger swap_requests_validate
  before insert on public.swap_requests
  for each row execute procedure public.validate_swap_request();

-- ---------------------------------------------------------------------------
-- Update guard: what each side is allowed to change, and where a status can go.
-- ---------------------------------------------------------------------------
-- RLS decides *whether* you may touch a row; it cannot express "the host may
-- answer, but may not quietly move the dates". So the terms of the swap are
-- frozen here, and the status machine is closed: pending is the only state you
-- can leave, the guest can only withdraw, the host can only answer.
create or replace function public.guard_swap_request_update()
returns trigger
language plpgsql
security definer set search_path = public
as $fn$
begin
  -- The terms are what the host is answering. They are immutable afterwards.
  new.house_id         := old.house_id;
  new.host_id          := old.host_id;
  new.guest_id         := old.guest_id;
  new.offered_house_id := old.offered_house_id;
  new.check_in         := old.check_in;
  new.check_out        := old.check_out;
  new.guests           := old.guests;
  new.message          := old.message;
  new.created_at       := old.created_at;

  if new.status is distinct from old.status then
    if old.status <> 'pending' then
      raise exception 'This request has already been answered.';
    end if;
    if auth.uid() = old.guest_id and new.status <> 'cancelled' then
      raise exception 'You can withdraw this request, but only the host can answer it.';
    end if;
    if auth.uid() = old.host_id and new.status not in ('accepted', 'declined') then
      raise exception 'A host can accept or decline a request.';
    end if;
    new.updated_at := now();
  else
    -- Opening a thread writes a read mark, and a read mark is not activity.
    -- Bumping updated_at for it would re-sort the request to the top of both
    -- inboxes just because someone looked at it.
    new.updated_at := old.updated_at;
  end if;

  -- Each side owns only its own read mark.
  if auth.uid() = old.guest_id then
    new.host_read_at := old.host_read_at;
  elsif auth.uid() = old.host_id then
    new.guest_read_at := old.guest_read_at;
  end if;

  return new;
end;
$fn$;

revoke execute on function public.guard_swap_request_update() from public, anon, authenticated;

drop trigger if exists swap_requests_guard_update on public.swap_requests;
create trigger swap_requests_guard_update
  before update on public.swap_requests
  for each row execute procedure public.guard_swap_request_update();

-- ---------------------------------------------------------------------------
-- RLS: a swap request is private to its two participants. Nobody else — not
-- another member, not an anonymous visitor — can read that these two people are
-- talking, which is the whole point of "secure messaging".
-- ---------------------------------------------------------------------------
alter table public.swap_requests enable row level security;

drop policy if exists "Participants can read their swap requests" on public.swap_requests;
create policy "Participants can read their swap requests"
  on public.swap_requests for select
  to authenticated
  using (auth.uid() = guest_id or auth.uid() = host_id);

drop policy if exists "Members can propose a swap" on public.swap_requests;
create policy "Members can propose a swap"
  on public.swap_requests for insert
  to authenticated
  with check (auth.uid() = guest_id);

drop policy if exists "Participants can answer a swap request" on public.swap_requests;
create policy "Participants can answer a swap request"
  on public.swap_requests for update
  to authenticated
  using (auth.uid() = guest_id or auth.uid() = host_id)
  with check (auth.uid() = guest_id or auth.uid() = host_id);

-- No delete policy on purpose: a request is withdrawn ('cancelled'), never
-- erased, so the other side's inbox does not silently lose a conversation.

-- ---------------------------------------------------------------------------
-- swap_messages — the thread on one request
-- ---------------------------------------------------------------------------
create table if not exists public.swap_messages (
  id         bigint generated always as identity primary key,
  request_id bigint not null references public.swap_requests(id) on delete cascade,
  sender_id  uuid   not null references public.profiles(id) on delete cascade,
  body       text   not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists swap_messages_request_idx on public.swap_messages (request_id, created_at);

alter table public.swap_messages enable row level security;

-- Membership is not stored twice: it is read from the parent request, so the
-- two tables can never disagree about who is in a conversation.
drop policy if exists "Participants can read the thread" on public.swap_messages;
create policy "Participants can read the thread"
  on public.swap_messages for select
  to authenticated
  using (exists (
    select 1 from public.swap_requests r
     where r.id = request_id and (r.guest_id = auth.uid() or r.host_id = auth.uid())
  ));

drop policy if exists "Participants can write to the thread" on public.swap_messages;
create policy "Participants can write to the thread"
  on public.swap_messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.swap_requests r
       where r.id = request_id and (r.guest_id = auth.uid() or r.host_id = auth.uid())
    )
  );

-- Messages are neither editable nor deletable: a record both sides can rely on
-- is worth more here than the ability to take a sentence back.

-- ---------------------------------------------------------------------------
-- The account badge: one number, computed where the data is.
-- ---------------------------------------------------------------------------
-- Requests waiting on you, plus messages that arrived since you last opened
-- their thread. security invoker, so RLS still applies and the function can
-- only ever count rows the caller is allowed to see.
create or replace function public.my_swap_badge()
returns integer
language sql
stable
security invoker
set search_path = public
as $fn$
  select (
    (select count(*)
       from public.swap_requests r
      where r.host_id = auth.uid() and r.status = 'pending')
  + (select count(*)
       from public.swap_messages m
       join public.swap_requests r on r.id = m.request_id
      where m.sender_id <> auth.uid()
        and m.created_at > coalesce(
              case when r.guest_id = auth.uid() then r.guest_read_at else r.host_read_at end,
              '-infinity'::timestamptz))
  )::integer;
$fn$;

grant execute on function public.my_swap_badge() to authenticated;
