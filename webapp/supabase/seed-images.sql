-- ============================================================================
-- SwapDoor — seed gallery photos (run once after schema.sql)
-- Each house gets 4 images: element 0 is the effective hero (the working URL,
-- with the dead-photo replacements already applied), then 3 verified interior
-- shots from a shared pool. Every URL was confirmed to return HTTP 200.
-- Re-runnable: it simply overwrites houses.images.
-- ============================================================================

with pool(id, ids) as (
  values
   (1,  array['photo-1602343168117-bb8ffe3e2e9f','photo-1505693416388-ac5ce068fe85','photo-1522708323590-d24dbb6b0267','photo-1560448204-e02f11c3d0e2']),
   (2,  array['photo-1518780664697-55e3ad937233','photo-1502672260266-1c1ef2d93688','photo-1554995207-c18c203602cb','photo-1484154218962-a197022b5858']),
   (3,  array['photo-1523217582562-09d0def993a6','photo-1556911220-bff31c812dba','photo-1600585154340-be6161a56a0c','photo-1600566753086-00f18fb6b3ea']),
   (4,  array['photo-1537726235470-8504e3beef77','photo-1600210492486-724fe5c67fb0','photo-1583847268964-b28dc8f51f92','photo-1618221195710-dd6b41faaea6']),
   (5,  array['photo-1499793983690-e29da59ef1c2','photo-1616486338812-3dadae4b4ace','photo-1616594039964-ae9021a400a0','photo-1502005229762-cf1b2da7c5d6']),
   (6,  array['photo-1490806843957-31f4c9a91c65','photo-1560184897-ae75f418493e','photo-1505693416388-ac5ce068fe85','photo-1522708323590-d24dbb6b0267']),
   (7,  array['photo-1483347756197-71ef80e95f73','photo-1560448204-e02f11c3d0e2','photo-1502672260266-1c1ef2d93688','photo-1554995207-c18c203602cb']),
   (8,  array['photo-1499002238440-d264edd596ec','photo-1484154218962-a197022b5858','photo-1556911220-bff31c812dba','photo-1600585154340-be6161a56a0c']),
   (9,  array['photo-1564013799919-ab600027ffc6','photo-1600566753086-00f18fb6b3ea','photo-1600210492486-724fe5c67fb0','photo-1583847268964-b28dc8f51f92']),
   (10, array['photo-1520250497591-112f2f40a3f4','photo-1618221195710-dd6b41faaea6','photo-1616486338812-3dadae4b4ace','photo-1616594039964-ae9021a400a0'])
)
update public.houses h
set images = (
  select array_agg('https://images.unsplash.com/' || x || '?auto=format&fit=crop&w=800&q=80' order by ord)
  from unnest(p.ids) with ordinality as t(x, ord)
)
from pool p
where p.id = h.id;
