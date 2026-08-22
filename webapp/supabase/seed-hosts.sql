-- ============================================================================
-- SwapDoor — host seed (run AFTER supabase/seed-hosts.mjs has created the
-- auth accounts, and after schema.sql added profiles.location/bio + houses.host_id).
-- Fills in each host profile and assigns every house to a host.
-- Matches accounts by email, so it needs no hard-coded user ids. Safe to re-run.
-- ============================================================================

-- 1) Enrich host profiles (location, bio, and a back-dated "member since").
update public.profiles p set
  location   = v.location,
  bio        = v.bio,
  created_at = v.created_at
from (values
  ('alex.chen@swapdoor.dev',     'Berlin, Germany',          'Freelance UX/UI designer living out of a carry-on. I trade my Berlin flat for fast Wi-Fi and a good desk anywhere in the world.', timestamptz '2019-06-12'),
  ('sarah.miller@swapdoor.dev',  'Minneapolis, USA',         'Graphic designer and mum of two. We love swapping our suburban home for family-friendly stays with a real kitchen and laundry.',   timestamptz '2021-04-03'),
  ('mateo.elena@swapdoor.dev',   'Buenos Aires, Argentina',  'Recently retired and ticking off the bucket list together. We treat every home we visit like our own.',                           timestamptz '2020-11-20'),
  ('sofia.rossi@swapdoor.dev',   'Florence, Italy',          'Architect with a soft spot for restored stone houses and long Mediterranean summers.',                                            timestamptz '2018-09-01'),
  ('lars.eriksson@swapdoor.dev', 'Stockholm, Sweden',        'Mountain lover and skier. Winter is the best season to swap into the Alps or the Arctic Circle.',                                 timestamptz '2019-01-15'),
  ('kenji.tanaka@swapdoor.dev',  'Kyoto, Japan',             'Third-generation caretaker of a traditional machiya. Happy to share the best tea houses and gardens.',                            timestamptz '2020-02-27'),
  ('amara.okafor@swapdoor.dev',  'Cape Town, South Africa',  'Travel writer and coastal-living enthusiast. My villa comes with the best sunset view in Camps Bay.',                             timestamptz '2021-07-08')
) as v(email, location, bio, created_at)
join auth.users u on u.email = v.email
where p.id = u.id;

-- 2) Assign each house to a host (thematic; some hosts own two).
update public.houses h set host_id = u.id
from (values
  (1,  'sofia.rossi@swapdoor.dev'),    -- Villa Serenity, Santorini
  (2,  'lars.eriksson@swapdoor.dev'),  -- Alpine Chalet, Zermatt
  (3,  'sofia.rossi@swapdoor.dev'),    -- Tuscan Sun Farmhouse, Siena
  (4,  'alex.chen@swapdoor.dev'),      -- Bali Bamboo Haven, Ubud
  (5,  'sarah.miller@swapdoor.dev'),   -- Malibu Oceanfront Modern
  (6,  'kenji.tanaka@swapdoor.dev'),   -- Kyoto Traditional Machiya
  (7,  'lars.eriksson@swapdoor.dev'),  -- Nordic Glass Igloo, Rovaniemi
  (8,  'mateo.elena@swapdoor.dev'),    -- Provencal Lavender Estate
  (9,  'amara.okafor@swapdoor.dev'),   -- Cape Town Coastal Villa
  (10, 'mateo.elena@swapdoor.dev')     -- Rainforest Treehouse, Costa Rica
) as m(house_id, email)
join auth.users u on u.email = m.email
where h.id = m.house_id;
