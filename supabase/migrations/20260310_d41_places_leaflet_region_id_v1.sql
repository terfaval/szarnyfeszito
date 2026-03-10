-- D41 — Places: link to HU leaflet region id v1
-- Allows pinning a Place by a Natura 2000 SPA (preferred) or HU microregion (fallback) region center.

alter table places
  add column if not exists leaflet_region_id text;

create index if not exists places_leaflet_region_id_idx
  on places (leaflet_region_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'places_leaflet_region_id_fkey'
  ) then
    begin
      alter table places
        add constraint places_leaflet_region_id_fkey
        foreign key (leaflet_region_id)
        references distribution_region_catalog_items (region_id)
        on delete set null;
    exception
      when duplicate_object then null;
      when duplicate_table then null;
    end;
  end if;
end $$;

-- Extend marker view so server code can read leaflet_region_id alongside lat/lng.
-- Note: CREATE OR REPLACE VIEW cannot reorder existing columns; keep the original column order
-- and append leaflet_region_id at the end to avoid column rename errors.
create or replace view place_markers_v1 as
select
  id,
  slug,
  name,
  place_type,
  status,
  location_precision,
  sensitivity_level,
  is_beginner_friendly,
  case when location is null then null else st_y(location::geometry) end as lat,
  case when location is null then null else st_x(location::geometry) end as lng,
  updated_at,
  leaflet_region_id
from places;
