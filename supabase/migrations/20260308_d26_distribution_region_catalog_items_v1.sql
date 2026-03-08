-- D26 — Distribution region catalog items v1
-- Authoritative region geometries used for deterministic distribution map generation (AI selects region_ids only).

create table if not exists distribution_region_catalog_items (
  region_id text primary key,
  catalog text not null, -- globalRegions | hungaryRegions
  scope text not null, -- global | hungary
  type text not null, -- ecoregion | country | spa | ...
  source text not null,
  name text not null,
  -- Bounding box in EPSG:4326, used for fast candidate filtering. Shape: {south,west,north,east}
  bbox jsonb not null,
  -- GeoJSON Polygon/MultiPolygon (expected MultiPolygon). EPSG:4326 lon/lat.
  geometry jsonb not null,
  schema_version text not null default 'v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists distribution_region_catalog_items_catalog_idx
  on distribution_region_catalog_items (catalog);

create index if not exists distribution_region_catalog_items_scope_idx
  on distribution_region_catalog_items (scope);

alter table distribution_region_catalog_items enable row level security;

