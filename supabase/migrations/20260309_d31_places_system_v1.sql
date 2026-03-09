-- D31 — Place system foundation v1 (Studio + minimal public read surface)
-- Destination-level birding sites in Hungary (not observation coordinates).

create extension if not exists postgis;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'place_status') then
    create type place_status as enum ('draft', 'reviewed', 'published');
  end if;

  if not exists (select 1 from pg_type where typname = 'place_type') then
    create type place_type as enum (
      'lake',
      'river',
      'fishpond',
      'reservoir',
      'marsh',
      'reedbed',
      'salt_lake',
      'forest_edge',
      'grassland',
      'farmland',
      'mountain_area',
      'urban_park',
      'urban_waterfront',
      'protected_area'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'place_location_precision') then
    create type place_location_precision as enum ('exact', 'approximate', 'hidden');
  end if;

  if not exists (select 1 from pg_type where typname = 'place_sensitivity_level') then
    create type place_sensitivity_level as enum ('normal', 'sensitive');
  end if;

  if not exists (select 1 from pg_type where typname = 'place_frequency_band') then
    create type place_frequency_band as enum ('very_common', 'common', 'regular', 'occasional', 'special');
  end if;
end $$;

create table if not exists places (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  place_type place_type not null,
  status place_status not null default 'draft',
  region_landscape text,
  county text,
  district text,
  nearest_city text,
  distance_from_nearest_city_km integer,
  settlement text,
  location geography(point, 4326),
  location_precision place_location_precision not null default 'approximate',
  sensitivity_level place_sensitivity_level not null default 'normal',
  is_beginner_friendly boolean not null default false,
  access_note text,
  parking_note text,
  best_visit_note text,
  notable_units_json jsonb,
  generation_input text,
  published_at timestamptz,
  published_revision integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint places_distance_positive check (distance_from_nearest_city_km is null or distance_from_nearest_city_km >= 0),
  constraint places_slug_nonempty check (length(trim(slug)) > 0),
  constraint places_name_nonempty check (length(trim(name)) > 0),
  constraint places_publish_requires_core_fields check (
    status <> 'published'
    or (
      region_landscape is not null
      and county is not null
      and nearest_city is not null
      and length(trim(region_landscape)) > 0
      and length(trim(county)) > 0
      and length(trim(nearest_city)) > 0
    )
  ),
  constraint places_hidden_location_not_mappable check (
    location_precision <> 'hidden' or location is null
  )
);

create index if not exists places_status_idx on places (status);
create index if not exists places_place_type_idx on places (place_type);
create index if not exists places_updated_at_idx on places (updated_at desc);

create table if not exists place_birds (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places (id) on delete cascade,
  bird_id uuid references birds (id) on delete set null,
  pending_bird_name_hu text,
  rank integer not null default 0,
  frequency_band place_frequency_band not null default 'regular',
  is_iconic boolean not null default false,
  visible_in_spring boolean not null default false,
  visible_in_summer boolean not null default false,
  visible_in_autumn boolean not null default false,
  visible_in_winter boolean not null default false,
  seasonality_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint place_birds_rank_nonnegative check (rank >= 0),
  constraint place_birds_pending_name_nonempty check (pending_bird_name_hu is null or length(trim(pending_bird_name_hu)) > 0),
  constraint place_birds_exactly_one_link check (
    (bird_id is not null) <> (pending_bird_name_hu is not null)
  )
);

create index if not exists place_birds_place_id_idx on place_birds (place_id);
create index if not exists place_birds_bird_id_idx on place_birds (bird_id);
create index if not exists place_birds_rank_idx on place_birds (place_id, rank asc, updated_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'place_birds_place_id_bird_id_key'
  ) then
    begin
      create unique index place_birds_place_id_bird_id_key
        on place_birds (place_id, bird_id)
        where bird_id is not null;
    exception
      when duplicate_object then null;
      when duplicate_table then null;
    end;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_class
    where relname = 'place_birds_place_id_pending_name_key'
  ) then
    begin
      create unique index place_birds_place_id_pending_name_key
        on place_birds (place_id, lower(pending_bird_name_hu))
        where pending_bird_name_hu is not null;
    exception
      when duplicate_object then null;
      when duplicate_table then null;
    end;
  end if;
end $$;

-- Phenomenon relations are prepared now, FK can be added when phenomena table lands.
create table if not exists phenomenon_places (
  phenomenon_id uuid not null,
  place_id uuid not null references places (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (phenomenon_id, place_id)
);

create index if not exists phenomenon_places_place_id_idx on phenomenon_places (place_id);

-- View for map consumption: lat/lng extracted for Leaflet.
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
  updated_at
from places;

alter table places enable row level security;
alter table place_birds enable row level security;
alter table phenomenon_places enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'places'
      and policyname = 'places_service_role_all'
  ) then
    create policy places_service_role_all
      on places
      for all
      to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'place_birds'
      and policyname = 'place_birds_service_role_all'
  ) then
    create policy place_birds_service_role_all
      on place_birds
      for all
      to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'phenomenon_places'
      and policyname = 'phenomenon_places_service_role_all'
  ) then
    create policy phenomenon_places_service_role_all
      on phenomenon_places
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

