-- D51 — Habitat stock assets v1 (Studio-only)
-- Defines grouped habitat categories derived from Place.place_type,
-- and enables generating iconic full-frame square habitat tiles.

-- 1) Add new image variant for habitat tiles (stored in canonical images table).
alter type image_variant add value if not exists 'habitat_square_v1';

-- 2) Catalog table.
create table if not exists habitat_stock_assets (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label_hu text not null,
  place_types place_type[] not null default '{}'::place_type[],
  sort integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint habitat_stock_assets_key_nonempty check (length(trim(key)) > 0),
  constraint habitat_stock_assets_label_nonempty check (length(trim(label_hu)) > 0)
);

create index if not exists habitat_stock_assets_sort_idx
  on habitat_stock_assets (sort asc, label_hu asc);

-- 3) Seed canonical groups (idempotent via ON CONFLICT).
insert into habitat_stock_assets (key, label_hu, place_types, sort)
values
  (
    'water_lakes_v1',
    'Tavak / tavak jellegű vizek',
    array['lake','fishpond','reservoir']::place_type[],
    10
  ),
  (
    'water_rivers_v1',
    'Folyók',
    array['river']::place_type[],
    20
  ),
  (
    'wetlands_v1',
    'Vizes élőhelyek (mocsár / nád / szikes)',
    array['marsh','reedbed','salt_lake']::place_type[],
    30
  ),
  (
    'forest_edge_v1',
    'Erdőszél',
    array['forest_edge']::place_type[],
    40
  ),
  (
    'grassland_v1',
    'Gyep / puszta',
    array['grassland']::place_type[],
    50
  ),
  (
    'farmland_v1',
    'Mezőgazdasági terület',
    array['farmland']::place_type[],
    60
  ),
  (
    'mountains_v1',
    'Hegység',
    array['mountain_area']::place_type[],
    70
  ),
  (
    'urban_park_v1',
    'Városi park',
    array['urban_park']::place_type[],
    80
  ),
  (
    'urban_waterfront_v1',
    'Városi vízpart',
    array['urban_waterfront']::place_type[],
    90
  )
on conflict (key) do update set
  label_hu = excluded.label_hu,
  place_types = excluded.place_types,
  sort = excluded.sort,
  updated_at = now();

