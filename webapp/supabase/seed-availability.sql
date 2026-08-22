-- ============================================================================
-- SwapDoor — availability windows (run after schema.sql; re-runnable)
--
-- WHY THIS FILE EXISTS
-- The original seed gave every home a single 2025 date and no end date, so the
-- app derived a random 4-45 day window in code. Two problems: by 2026 every
-- window sat in the PAST (the detail page's date pickers opened on dead dates
-- and no future search could ever match), and a derived window can't be made to
-- fit the home it belongs to.
--
-- Each window below is therefore a real pair of dates, chosen so that:
--   • it is in the future,
--   • it lands in that home's actual season — a ski chalet in the ski season,
--     the glass igloo in the aurora months, lavender in the weeks it blooms,
--   • lengths VARY (9 to 71 days), so the "When" duration presets on /explore
--     genuinely filter instead of every home passing every preset,
--   • the near months are populated, so a user searching "soon" gets results
--     rather than an empty grid.
--
-- REFRESHING THEM
-- These are fixed dates, so they age. When the first windows fall into the past
-- (from late 2027), shift the whole set forward by whole years — that keeps
-- every home in its own season:
--
--   update public.houses
--   set date        = ((date::date        + interval '1 year')::date)::text,
--       available_to= ((available_to::date+ interval '1 year')::date)::text;
--
-- ============================================================================

alter table public.houses add column if not exists available_to text;

update public.houses as h
set date = v.starts, available_to = v.ends
from (values
  --  id   from          to            days  why this season
  (1,  '2026-09-05', '2026-09-27'),  --  22  Santorini, late-summer Aegean
  (2,  '2027-01-09', '2027-02-13'),  --  35  Zermatt, mid ski season
  (3,  '2026-09-12', '2026-10-04'),  --  22  Siena, grape harvest
  (4,  '2026-10-03', '2026-12-06'),  --  64  Ubud, long stay for a nomad (Alex)
  (5,  '2026-09-26', '2026-10-05'),  --   9  Malibu, a short family absence
  (6,  '2026-11-07', '2026-11-18'),  --  11  Kyoto, autumn foliage
  (7,  '2026-12-05', '2027-01-17'),  --  43  Rovaniemi, aurora + polar night
  (8,  '2027-06-12', '2027-07-11'),  --  29  Provence, lavender in bloom
  (9,  '2026-12-19', '2027-01-24'),  --  36  Cape Town, southern summer
  (10, '2027-01-16', '2027-03-28')   --  71  Costa Rica, dry season
) as v(id, starts, ends)
where h.id = v.id;

-- Check: every window should start in the future and end after it starts.
--   select id, name, date, available_to,
--          (available_to::date - date::date) as days,
--          (date::date > current_date) as starts_in_future
--   from public.houses order by date;
