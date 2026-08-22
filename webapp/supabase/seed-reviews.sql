-- ============================================================================
-- SwapDoor — seed guest reviews (run once after schema.sql + seed-hosts.sql)
-- Each review's author is one of the 7 demo host profiles, never the house's
-- own host. Safe to re-run: the batch only inserts when reviews is empty.
-- Author UUIDs come from the demo host accounts (supabase/seed-hosts.mjs):
--   Sofia Rossi     03ef6d15-1c9c-427f-90aa-cc8d284e3b0a
--   Lars Eriksson   32d0abb7-7961-4dd7-b5a6-d0593c682297
--   Alex Chen       7650d811-15b8-4fba-8abe-e6eb86954b88
--   Kenji Tanaka    8cdee0d7-f1dd-46a2-9ad4-fa1d33d21b18
--   Mateo & Elena   b3da4e9b-3c5d-47e0-b25a-ea51a591fc08
--   Sarah Miller    db6c3d56-74c8-4a27-bb3a-31e18edd8611
--   Amara Okafor    4682b80e-5d2c-44b8-8d5e-8a37a52348a1
-- ============================================================================

insert into public.reviews (house_id, author_id, rating, body, created_at)
select v.house_id, v.author_id::uuid, v.rating, v.body, v.created_at::timestamptz
from (values
  (1, 'db6c3d56-74c8-4a27-bb3a-31e18edd8611', 5, 'The caldera view at sunset is unreal. Spotless, and the infinity pool was the highlight of our family trip.', '2025-07-02'),
  (1, '7650d811-15b8-4fba-8abe-e6eb86954b88', 5, 'Fast Wi-Fi and a quiet corner to work from, rare for such a scenic spot. Would swap again.', '2025-06-25'),
  (1, '4682b80e-5d2c-44b8-8d5e-8a37a52348a1', 4, 'Stunning home. Only note is the climb up the steps with luggage, but worth every step.', '2025-05-30'),
  (1, '8cdee0d7-f1dd-46a2-9ad4-fa1d33d21b18', 5, 'Immaculate and exactly like the photos. A thoughtful, responsive host.', '2025-04-18'),
  (2, '03ef6d15-1c9c-427f-90aa-cc8d284e3b0a', 5, 'Ski-in ski-out really means it. The fireplace after a day on the slopes was perfect.', '2025-02-10'),
  (2, 'b3da4e9b-3c5d-47e0-b25a-ea51a591fc08', 5, 'Warm, spacious and easy to settle into. The mountain views from the balcony are breathtaking.', '2025-01-28'),
  (2, 'db6c3d56-74c8-4a27-bb3a-31e18edd8611', 4, 'Great for the kids and very safe. Kitchen had everything we needed for a two-week stay.', '2025-01-20'),
  (2, '4682b80e-5d2c-44b8-8d5e-8a37a52348a1', 5, 'Cozy and immaculate, with clear notes on the village and the lifts.', '2024-12-30'),
  (3, '7650d811-15b8-4fba-8abe-e6eb86954b88', 5, 'Vineyard views and total quiet. Ideal for a longer working stay away from the city.', '2025-06-05'),
  (3, 'db6c3d56-74c8-4a27-bb3a-31e18edd8611', 5, 'The kids loved the olive groves. Felt like a genuine slice of Tuscan life.', '2025-05-22'),
  (3, '32d0abb7-7961-4dd7-b5a6-d0593c682297', 4, 'Beautiful stone house. A car is a must out here, but that is the charm.', '2025-05-12'),
  (4, '8cdee0d7-f1dd-46a2-9ad4-fa1d33d21b18', 5, 'Waking up to the jungle is something else. The bamboo architecture is stunning.', '2025-03-10'),
  (4, '4682b80e-5d2c-44b8-8d5e-8a37a52348a1', 5, 'Peaceful and eco-conscious without giving up comfort. Highly recommend.', '2025-03-02'),
  (4, 'db6c3d56-74c8-4a27-bb3a-31e18edd8611', 4, 'Magical setting. Bring bug spray, but the open design is worth it.', '2025-02-20'),
  (4, '03ef6d15-1c9c-427f-90aa-cc8d284e3b0a', 5, 'A hidden gem, immaculate and full of character.', '2025-01-15'),
  (5, 'b3da4e9b-3c5d-47e0-b25a-ea51a591fc08', 5, 'Fell asleep to the waves every night. The glass walls make the ocean part of the house.', '2025-07-10'),
  (5, '7650d811-15b8-4fba-8abe-e6eb86954b88', 5, 'Direct beach access and a workspace with a view, a dream setup for a month.', '2025-06-28'),
  (5, '32d0abb7-7961-4dd7-b5a6-d0593c682297', 5, 'Sleek, spotless and exactly as pictured. A five-star host.', '2025-05-16'),
  (6, '03ef6d15-1c9c-427f-90aa-cc8d284e3b0a', 5, 'The zen garden is a quiet miracle in the middle of the city. Beautifully restored.', '2025-04-20'),
  (6, '4682b80e-5d2c-44b8-8d5e-8a37a52348a1', 5, 'Authentic and calming, within walking distance to temples and wonderful food.', '2025-04-08'),
  (6, 'db6c3d56-74c8-4a27-bb3a-31e18edd8611', 4, 'Traditional and immaculate. Note the tatami rooms if you have small kids, but lovely.', '2025-03-25'),
  (7, '7650d811-15b8-4fba-8abe-e6eb86954b88', 5, 'Watched the Northern Lights from bed. Once in a lifetime, and toasty warm inside.', '2025-01-05'),
  (7, 'db6c3d56-74c8-4a27-bb3a-31e18edd8611', 4, 'A bucket-list stay. Small by design, but that is the point, cozy and unforgettable.', '2024-12-28'),
  (7, 'b3da4e9b-3c5d-47e0-b25a-ea51a591fc08', 5, 'Exactly the kind of authentic adventure we hoped for. Everything was thought of.', '2024-12-15'),
  (8, '03ef6d15-1c9c-427f-90aa-cc8d284e3b0a', 5, 'Endless lavender and a kitchen made for long dinners. A dream for a big group.', '2025-07-01'),
  (8, '4682b80e-5d2c-44b8-8d5e-8a37a52348a1', 4, 'Grand and full of history. Some rooms show their age gently, but the setting is unmatched.', '2025-06-18'),
  (8, '8cdee0d7-f1dd-46a2-9ad4-fa1d33d21b18', 5, 'Serene and elegant. The grounds alone are worth the trip.', '2025-05-27'),
  (9, '32d0abb7-7961-4dd7-b5a6-d0593c682297', 5, 'The Twelve Apostles view never got old. Modern, immaculate and superbly located.', '2025-02-22'),
  (9, 'db6c3d56-74c8-4a27-bb3a-31e18edd8611', 5, 'Safe, spacious and perfect for the family. The local tips made the trip.', '2025-02-12'),
  (9, '7650d811-15b8-4fba-8abe-e6eb86954b88', 4, 'Great light for working and a short drive to the beach. Would happily return.', '2025-01-30'),
  (10, '03ef6d15-1c9c-427f-90aa-cc8d284e3b0a', 5, 'Falling asleep in the canopy with the sounds of the forest, pure magic.', '2025-03-20'),
  (10, '8cdee0d7-f1dd-46a2-9ad4-fa1d33d21b18', 5, 'Simple, thoughtful and immersive. Saw toucans from the deck at breakfast.', '2025-03-08'),
  (10, 'db6c3d56-74c8-4a27-bb3a-31e18edd8611', 4, 'An adventure the kids still talk about. Rustic in the best way.', '2025-02-18')
) as v(house_id, author_id, rating, body, created_at)
where not exists (select 1 from public.reviews);

update public.houses h
set review_count = (select count(*) from public.reviews r where r.house_id = h.id);
